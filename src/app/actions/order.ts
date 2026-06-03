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

export async function getOrders() {
  try {
    const orders = await prisma.order.findMany({
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
    });
    return { success: true, data: orders };
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch orders";
    return { success: false, error: message };
  }
}

export async function getDashboardStats() {
  try {
    const totalMedicines = await prisma.medicine.count();
    
    // Count orders created today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const ordersToday = await prisma.order.count({
      where: {
        createdAt: {
          gte: startOfToday,
        },
      },
    });

    const pendingDeliveries = await prisma.order.count({
      where: {
        status: {
          in: ["PENDING", "SHIPPED"],
        },
      },
    });

    const completedDeliveries = await prisma.order.count({
      where: {
        status: "COMPLETED",
      },
    });

    // Fetch recent orders
    const recentOrders = await prisma.order.findMany({
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
