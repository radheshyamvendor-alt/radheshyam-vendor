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
    const result = await prisma.$transaction(async (tx) => {
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
  } catch (error: any) {
    console.error("Failed to create order:", error);
    return { success: false, error: error.message || "Failed to create order" };
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
  } catch (error: any) {
    console.error("Failed to fetch orders:", error);
    return { success: false, error: error.message || "Failed to fetch orders" };
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
  } catch (error: any) {
    console.error("Failed to fetch dashboard stats:", error);
    return { success: false, error: error.message || "Failed to fetch dashboard stats" };
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
  } catch (error: any) {
    console.error("Failed to start delivery:", error);
    return { success: false, error: error.message || "Failed to start delivery" };
  }
}

// Proxy OTP Verification to the HIS Chemist API
export async function verifyOtpApi(prescriptionNo: string, otp: string, accessToken: string) {
  try {
    // For local demonstration and sandbox, let's call the actual API if configured, otherwise fall back to database validation
    let apiSuccess = false;
    try {
      const response = await axios.post(
        "https://hischemistapi.ongc.co.in/api/Otp/verify",
        { prescriptionNo, otp },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (response.data?.success) {
        apiSuccess = true;
      }
    } catch (apiError) {
      console.warn("HIS OTP Verify API connection failed, falling back to local DB validation:", apiError);
    }

    // Check locally if database has the matching OTP (to support seamless sandboxed flow)
    const localOrder = await prisma.order.findFirst({
      where: {
        prescriptionNumber: prescriptionNo,
      },
    });

    if (apiSuccess || (localOrder && localOrder.otp === otp)) {
      // Transition the local order state to COMPLETED
      if (localOrder) {
        await prisma.order.update({
          where: { id: localOrder.id },
          data: {
            status: "COMPLETED",
          },
        });
      }
      revalidatePath("/dashboard");
      return { success: true, message: "OTP Verified. Delivery completed!" };
    }
    
    return { success: false, error: "Invalid OTP code entered." };
  } catch (error: any) {
    return { success: false, error: error.message || "OTP Verification failed" };
  }
}

// Proxy Resend OTP to the HIS Chemist API
export async function resendOtpApi(prescriptionNo: string, accessToken: string) {
  try {
    let apiSuccess = false;
    try {
      const response = await axios.post(
        "https://hischemistapi.ongc.co.in/api/Otp/resend",
        { prescriptionNo },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (response.data?.success) {
        apiSuccess = true;
      }
    } catch (apiError) {
      console.warn("HIS OTP Resend API connection failed, falling back to local DB generation:", apiError);
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
  } catch (error: any) {
    return { success: false, error: error.message || "OTP resend failed" };
  }
}
