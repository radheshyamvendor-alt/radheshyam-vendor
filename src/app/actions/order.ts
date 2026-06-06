"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import axios from "axios";

export interface OrderItemInput {
  medicineId: string;
  quantity: number;
}

export interface PatientInput {
  prescriptionNumber: string;
  name: string;
  mobile: string;
  address: string;
  gender: string;
  age: number;
}

export interface CreateOrderInput {
  prescriptionNumber: string;
  patient: PatientInput;
  items: OrderItemInput[];
  chemistEmail?: string;
}

export async function createOrder(input: CreateOrderInput) {
  try {
    // Block duplicate orders for the same prescription number
    const existingOrder = await prisma.order.findFirst({
      where: { prescriptionNumber: input.prescriptionNumber },
    });
    if (existingOrder) {
      return {
        success: false,
        error: `An order for prescription number "${input.prescriptionNumber}" already exists (Status: ${existingOrder.status}). Duplicate orders are not allowed.`,
      };
    }

    const result = await prisma.$transaction(async (tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => {
      // 1. Create or update patient
      const patient = await tx.patient.upsert({
        where: { prescriptionNumber: input.prescriptionNumber },
        update: {
          name: input.patient.name,
          mobile: input.patient.mobile,
          address: input.patient.address,
          gender: input.patient.gender,
          age: input.patient.age,
        },
        create: {
          prescriptionNumber: input.prescriptionNumber,
          name: input.patient.name,
          mobile: input.patient.mobile,
          address: input.patient.address,
          gender: input.patient.gender,
          age: input.patient.age,
        },
      });

      // 2. Create the order
      const order = await tx.order.create({
        data: {
          prescriptionNumber: input.prescriptionNumber,
          patientId: patient.id,
          status: "PENDING",
          chemistEmail: input.chemistEmail || null,
        },
      });

      // 3. Insert medicines & deduct stocks
      for (const item of input.items) {
        // Create link
        await tx.orderMedicine.create({
          data: {
            orderId: order.id,
            medicineId: item.medicineId,
            quantity: item.quantity,
          },
        });

        // Deduct inventory stock
        const medicine = await tx.medicine.findUnique({
          where: { id: item.medicineId },
        });

        if (medicine) {
          const newStock = Math.max(0, medicine.stock - item.quantity);
          await tx.medicine.update({
            where: { id: item.medicineId },
            data: { stock: newStock },
          });
        }
      }

      return order;
    });

    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to create order:", error);
    const message = error instanceof Error ? error.message : "Failed to create order";
    return { success: false, error: message };
  }
}

export async function getOrders(page?: number, pageSize?: number, chemistEmail?: string) {
  try {
    const skip = page && pageSize ? (page - 1) * pageSize : undefined;
    const take = pageSize ? pageSize : undefined;

    const where: any = {};
    if (chemistEmail) {
      where.chemistEmail = chemistEmail;
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          patient: true,
          orderMedicines: {
            include: {
              medicine: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take,
      }),
      prisma.order.count({ where }),
    ]);

    return { 
      success: true, 
      data: orders,
      pagination: page && pageSize ? {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      } : undefined
    };
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch orders";
    return { success: false, error: message };
  }
}

export async function getDashboardStats(chemistEmail?: string) {
  try {
    const totalMedicines = await prisma.medicine.count();
    
    // Count orders created today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const whereToday: any = {
      createdAt: {
        gte: startOfToday,
      },
    };
    const wherePending: any = {
      status: {
        in: ["PENDING", "SHIPPED"],
      },
    };
    const whereCompleted: any = {
      status: "COMPLETED",
    };
    const whereRecent: any = {};

    if (chemistEmail) {
      whereToday.chemistEmail = chemistEmail;
      wherePending.chemistEmail = chemistEmail;
      whereCompleted.chemistEmail = chemistEmail;
      whereRecent.chemistEmail = chemistEmail;
    }

    const ordersToday = await prisma.order.count({
      where: whereToday,
    });

    const pendingDeliveries = await prisma.order.count({
      where: wherePending,
    });

    const completedDeliveries = await prisma.order.count({
      where: whereCompleted,
    });

    // Fetch recent orders
    const recentOrders = await prisma.order.findMany({
      where: whereRecent,
      include: {
        patient: true,
        orderMedicines: {
          include: {
            medicine: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    return {
      success: true,
      stats: {
        totalMedicines,
        ordersToday,
        pendingDeliveries,
        completedDeliveries,
      },
      recentOrders,
    };
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch dashboard stats";
    return { success: false, error: message };
  }
}

export async function startDelivery(orderId: string) {
  try {
    // Generate a mock OTP and transition state to SHIPPED
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "SHIPPED",
        otp: mockOtp,
      },
    });
    
    revalidatePath("/dashboard");
    return { success: true, data: order, mockOtp }; // Returning mockOtp so developer/vendor can see/test it easily
  } catch (error) {
    console.error("Failed to start delivery:", error);
    const message = error instanceof Error ? error.message : "Failed to start delivery";
    return { success: false, error: message };
  }
}

// Proxy OTP Verification to the HIS Chemist API
// HIS API is the single source of truth — no local fallback if API is reachable
export async function verifyOtpApi(prescriptionNo: string, otp: string, accessToken: string) {
  try {
    let apiReachable = false;
    let apiSuccess = false;
    let apiMessage = "";

    try {
      const response = await axios.post(
        "https://hischemistapi.ongc.co.in/api/Otp/verify",
        { PrescriptionNo: prescriptionNo, otp },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );
      apiReachable = true;
      apiSuccess = response.data?.success === true;
      apiMessage = response.data?.message || "";
    } catch (apiError) {
      console.warn("HIS OTP Verify API unreachable:", apiError);
    }

    // If HIS API responded — use its result as the ONLY authority
    if (apiReachable) {
      if (!apiSuccess) {
        // Return the exact failure message from the HIS API
        return { success: false, error: apiMessage || "OTP verification failed" };
      }

      // HIS API confirmed success — update local order status to COMPLETED
      const localOrder = await prisma.order.findFirst({
        where: { prescriptionNumber: prescriptionNo },
      });
      if (localOrder) {
        await prisma.order.update({
          where: { id: localOrder.id },
          data: { status: "COMPLETED" },
        });
      }
      revalidatePath("/dashboard");
      return { success: true, message: apiMessage || "OTP verified successfully" };
    }

    // HIS API was unreachable — return a clear network error, do not fall back
    return { success: false, error: "Unable to reach ONGC HIS API. Please check your network and try again." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OTP Verification failed";
    return { success: false, error: message };
  }
}

// Proxy Resend OTP to the HIS Chemist API
// HIS API is the single source of truth — no local OTP generation if API is reachable
export async function resendOtpApi(prescriptionNo: string, accessToken: string) {
  try {
    let apiReachable = false;
    let apiSuccess = false;
    let apiMessage = "";

    try {
      const response = await axios.post(
        "https://hischemistapi.ongc.co.in/api/Otp/resend",
        { PrescriptionNo: Number(prescriptionNo) },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );
      apiReachable = true;
      apiSuccess = response.data?.success === true;
      apiMessage = response.data?.message || "";
    } catch (apiError) {
      console.warn("HIS OTP Resend API unreachable:", apiError);
    }

    // If HIS API responded — use its result directly
    if (apiReachable) {
      if (!apiSuccess) {
        return { success: false, error: apiMessage || "Failed to resend OTP" };
      }
      return { success: true, message: apiMessage || "OTP resent successfully" };
    }

    // HIS API was unreachable
    return { success: false, error: "Unable to reach ONGC HIS API. Please check your network and try again." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OTP resend failed";
    return { success: false, error: message };
  }
}

// Mark order as COMPLETED locally after successful external OTP verification
export async function completeOrderLocal(prescriptionNo: string) {
  try {
    const localOrder = await prisma.order.findFirst({
      where: { prescriptionNumber: prescriptionNo },
    });
    if (localOrder) {
      await prisma.order.update({
        where: { id: localOrder.id },
        data: { status: "COMPLETED" },
      });
    }
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to update local order status:", error);
    return { success: false, error: "Failed to update local order status" };
  }
}

export async function deleteOrder(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderMedicines: true,
      },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.status === "COMPLETED") {
      return { success: false, error: "Completed orders cannot be deleted" };
    }

    await prisma.$transaction(async (tx) => {
      // Restore stock for all medicines in the order
      for (const item of order.orderMedicines) {
        const medicine = await tx.medicine.findUnique({
          where: { id: item.medicineId },
        });
        if (medicine) {
          await tx.medicine.update({
            where: { id: item.medicineId },
            data: { stock: medicine.stock + item.quantity },
          });
        }
      }

      // Delete order medicines relations
      await tx.orderMedicine.deleteMany({
        where: { orderId },
      });

      // Delete the order
      await tx.order.delete({
        where: { id: orderId },
      });
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/otp");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete order:", error);
    const message = error instanceof Error ? error.message : "Failed to delete order";
    return { success: false, error: message };
  }
}

export interface UpdateOrderPatientInput {
  name: string;
  mobile: string;
  address: string;
}

export interface UpdateOrderItemInput {
  medicineId: string;
  quantity: number;
}

export interface UpdateOrderInput {
  prescriptionNumber: string;
  patient: UpdateOrderPatientInput;
  items: UpdateOrderItemInput[];
}

export async function updateOrder(orderId: string, input: UpdateOrderInput) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderMedicines: true,
      },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.status === "COMPLETED") {
      return { success: false, error: "Completed orders cannot be modified" };
    }

    const result = await prisma.$transaction(async (tx) => {
      let patientId = order.patientId;

      if (patientId) {
        if (input.prescriptionNumber !== order.prescriptionNumber) {
          const conflictingPatient = await tx.patient.findUnique({
            where: { prescriptionNumber: input.prescriptionNumber },
          });
          if (conflictingPatient && conflictingPatient.id !== patientId) {
            throw new Error(`A patient with prescription number "${input.prescriptionNumber}" already exists.`);
          }
        }

        await tx.patient.update({
          where: { id: patientId },
          data: {
            prescriptionNumber: input.prescriptionNumber,
            name: input.patient.name,
            mobile: input.patient.mobile,
            address: input.patient.address,
          },
        });
      }

      // Restore stock for old medicines
      for (const item of order.orderMedicines) {
        const medicine = await tx.medicine.findUnique({
          where: { id: item.medicineId },
        });
        if (medicine) {
          await tx.medicine.update({
            where: { id: item.medicineId },
            data: { stock: medicine.stock + item.quantity },
          });
        }
      }

      // Clear old OrderMedicine records
      await tx.orderMedicine.deleteMany({
        where: { orderId },
      });

      // Insert new OrderMedicine records and deduct stock
      for (const item of input.items) {
        await tx.orderMedicine.create({
          data: {
            orderId,
            medicineId: item.medicineId,
            quantity: item.quantity,
          },
        });

        const medicine = await tx.medicine.findUnique({
          where: { id: item.medicineId },
        });

        if (medicine) {
          const newStock = Math.max(0, medicine.stock - item.quantity);
          await tx.medicine.update({
            where: { id: item.medicineId },
            data: { stock: newStock },
          });
        }
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          prescriptionNumber: input.prescriptionNumber,
        },
      });

      return updatedOrder;
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/otp");
    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to update order:", error);
    const message = error instanceof Error ? error.message : "Failed to update order";
    return { success: false, error: message };
  }
}


