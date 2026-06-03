"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface MedicineInput {
  name: string;
  category: string;
  description?: string;
  price: number;
  stock: number;
  image?: string;
}

export async function getMedicines(search?: string, category?: string) {
  try {
    const whereClause: any = {};
    
    if (search) {
      whereClause.name = {
        contains: search,
        mode: "insensitive",
      };
    }
    
    if (category && category !== "All") {
      whereClause.category = category;
    }

    const medicines = await prisma.medicine.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
    });
    
    return { success: true, data: medicines };
  } catch (error: any) {
    console.error("Failed to fetch medicines:", error);
    return { success: false, error: error.message || "Failed to fetch medicines" };
  }
}

export async function addMedicine(input: MedicineInput) {
  try {
    const medicine = await prisma.medicine.create({
      data: {
        name: input.name,
        category: input.category,
        description: input.description,
        price: input.price,
        stock: input.stock,
        image: input.image || null,
      },
    });
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/catalog");
    return { success: true, data: medicine };
  } catch (error: any) {
    console.error("Failed to add medicine:", error);
    return { success: false, error: error.message || "Failed to add medicine" };
  }
}

export async function updateMedicine(id: string, input: MedicineInput) {
  try {
    const medicine = await prisma.medicine.update({
      where: { id },
      data: {
        name: input.name,
        category: input.category,
        description: input.description,
        price: input.price,
        stock: input.stock,
        image: input.image || null,
      },
    });
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/catalog");
    return { success: true, data: medicine };
  } catch (error: any) {
    console.error("Failed to update medicine:", error);
    return { success: false, error: error.message || "Failed to update medicine" };
  }
}

export async function deleteMedicine(id: string) {
  try {
    await prisma.medicine.delete({
      where: { id },
    });
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/catalog");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete medicine:", error);
    return { success: false, error: error.message || "Failed to delete medicine" };
  }
}
