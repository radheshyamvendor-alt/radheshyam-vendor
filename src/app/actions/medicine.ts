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

export async function getMedicines(search?: string, category?: string, page?: number, pageSize?: number) {
  try {
    const whereClause: {
      name?: { contains: string; mode: "insensitive" };
      category?: string;
    } = {};
    
    if (search) {
      whereClause.name = {
        contains: search,
        mode: "insensitive",
      };
    }
    
    if (category && category !== "All") {
      whereClause.category = category;
    }

    const skip = page && pageSize ? (page - 1) * pageSize : undefined;
    const take = pageSize ? pageSize : undefined;

    const [medicines, totalCount] = await Promise.all([
      prisma.medicine.findMany({
        where: whereClause,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take,
      }),
      prisma.medicine.count({
        where: whereClause,
      }),
    ]);
    
    return { 
      success: true, 
      data: medicines,
      pagination: page && pageSize ? {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      } : undefined
    };
  } catch (error) {
    console.error("Failed to fetch medicines:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch medicines";
    return { success: false, error: message };
  }
}

export async function getInventoryStats() {
  try {
    const totalMedicines = await prisma.medicine.count();
    
    const stockSum = await prisma.medicine.aggregate({
      _sum: { stock: true },
    });
    const totalStock = stockSum._sum.stock ?? 0;

    const lowStockCount = await prisma.medicine.count({
      where: { stock: { lt: 10 } },
    });

    const expiringSoonCount = await prisma.medicine.count({
      where: { stock: { gt: 0, lt: 15 } },
    });

    const categories = await prisma.medicine.groupBy({
      by: ['category'],
      _sum: { stock: true },
    });
    const activeCategoriesCount = categories.length;

    // Category health details
    let tabletsStock = 0;
    let capsulesStock = 0;
    let syrupsStock = 0;
    let otherStock = 0;

    for (const cat of categories) {
      const sum = cat._sum.stock ?? 0;
      if (cat.category === "Tablets") tabletsStock = sum;
      else if (cat.category === "Capsules") capsulesStock = sum;
      else if (cat.category === "Syrups") syrupsStock = sum;
      else otherStock += sum;
    }

    // Recent updates for logs
    const recentUpdates = await prisma.medicine.findMany({
      orderBy: { updatedAt: "desc" },
      take: 3,
    });

    return {
      success: true,
      data: {
        totalMedicines,
        totalStock,
        lowStockCount,
        expiringSoonCount,
        activeCategoriesCount,
        tabletsStock,
        capsulesStock,
        syrupsStock,
        otherStock,
        recentUpdates,
      }
    };
  } catch (error) {
    console.error("Failed to get inventory stats:", error);
    return { success: false, error: "Failed to get inventory stats" };
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
  } catch (error) {
    console.error("Failed to add medicine:", error);
    const message = error instanceof Error ? error.message : "Failed to add medicine";
    return { success: false, error: message };
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
  } catch (error) {
    console.error("Failed to update medicine:", error);
    const message = error instanceof Error ? error.message : "Failed to update medicine";
    return { success: false, error: message };
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
  } catch (error) {
    console.error("Failed to delete medicine:", error);
    const message = error instanceof Error ? error.message : "Failed to delete medicine";
    return { success: false, error: message };
  }
}
