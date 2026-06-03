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
export async function verifyOtpApi(prescriptionNo: string, otp: string, accessToken: string) {
  try {
    let apiSuccess = false;
    let apiErrorMessage: string | null = null;

    try {
      const response = await axios.post(
        "https://hischemistapi.ongc.co.in/api/Otp/verify",
        // Use PrescriptionNo (capital P) as required by the HIS Chemist API spec
        { PrescriptionNo: prescriptionNo, otp },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data?.success) {
        apiSuccess = true;
      } else {
        // Capture the failure message from the HIS API (e.g. "Invalid OTP", "OTP already used", "Prescription number is incorrect")
        apiErrorMessage = response.data?.message || null;
      }
    } catch (apiError) {
      console.warn("HIS OTP Verify API connection failed, falling back to local DB validation:", apiError);
    }

    // If HIS API explicitly returned a failure message, honour it without local fallback
    if (apiErrorMessage) {
      return { success: false, error: apiErrorMessage };
    }

    // Check locally if database has the matching OTP (to support seamless sandboxed flow)
    const localOrder = await prisma.order.findFirst({
      where: {
        prescriptionNumber: prescriptionNo,
      },
    });

    if (!localOrder) {
      return { success: false, error: "Prescription number is incorrect" };
    }

    if (localOrder.status === "COMPLETED") {
      return { success: false, error: "OTP already used" };
    }

    if (apiSuccess || localOrder.otp === otp) {
      await prisma.order.update({
        where: { id: localOrder.id },
        data: { status: "COMPLETED" },
      });
      revalidatePath("/dashboard");
      return { success: true, message: "OTP verified successfully" };
    }

    return { success: false, error: "Invalid OTP" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OTP Verification failed";
    return { success: false, error: message };
  }
}

// Proxy Resend OTP to the HIS Chemist API
export async function resendOtpApi(prescriptionNo: string, accessToken: string) {
  try {
    let apiSuccess = false;
    try {
      const response = await axios.post(
        "https://hischemistapi.ongc.co.in/api/Otp/resend",
        // Use PrescriptionNo (capital P) as a number as required by the HIS Chemist API spec
        { PrescriptionNo: Number(prescriptionNo) },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data?.success) {
        apiSuccess = true;
      }
    } catch (apiError) {
      console.warn("HIS OTP Resend API connection failed, falling back to local DB generation:", apiError);
    }

    // If HIS API confirmed resend, skip local DB regeneration
    if (apiSuccess) {
      return { success: true, message: "OTP resent successfully" };
    }

    // Generate new OTP locally
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const order = await prisma.order.findFirst({
      where: { prescriptionNumber: prescriptionNo },
    });

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          otp: newOtp,
        },
      });
    }

    return { success: true, message: "OTP resent successfully!", newOtp };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OTP resend failed";
    return { success: false, error: message };
  }
}
