import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const receipts = await prisma.receipt.findMany({
      where: { userId: session.user?.id },
      orderBy: { date: 'desc' },
      include: { receiptItems: { include: { item: true } } }, // Include receipt items and related items
    });

    return NextResponse.json(receipts);
  } catch (error) {
    console.error('Failed to fetch receipts:', error);
    return NextResponse.json({ error: 'Failed to fetch receipts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const { storeName, totalAmount, date, items } = await req.json();

    // Log the received items for debugging purposes
    console.log("Received Items:", items);

    // Check if a receipt with the same storeName, totalAmount, and date already exists
    const existingReceipt = await prisma.receipt.findFirst({
      where: {
        storeName,
        totalAmount,
        date: new Date(date),
        userId: session.user?.id,
      },
      include: {
        receiptItems: {
          include: {
            item: true, // Include item details for duplication check
          },
        },
      },
    });

    // If a receipt with the same details exists, check if the items match exactly
    if (existingReceipt) {
      const existingItems = existingReceipt.receiptItems;

      const allItemsMatch = items.every((newItem: any) => {
        return existingItems.some((existingItem) => {
          return (
            existingItem.item.name === newItem.name &&
            existingItem.quantity === newItem.quantity &&
            existingItem.totalPrice === newItem.totalPrice &&
            existingItem.item.inventoryId === newItem.inventoryId
          );
        });
      });

      // If all items match, we consider it a duplicate receipt
      if (allItemsMatch && items.length === existingItems.length) {
        return NextResponse.json(
          { message: "Duplicate receipt detected, no new entry created." },
          { status: 409 }
        );
      }
    }

    // No duplicates found, create a new receipt
    const receipt = await prisma.receipt.create({
      data: {
        storeName,
        totalAmount,
        date: new Date(date),
        userId: session.user?.id,
      },
    });

    // Ensure items are provided and are an array
    if (items && Array.isArray(items)) {
      for (const item of items) {
        // Validate required fields for new item creation
        if (!item.name || !item.inventoryId) {
          throw new Error("Missing required fields: name or inventoryId.");
        }

        const trimmedName = item.name.trim();

        // Check if an item with the same name and inventoryId already exists
        let connectedItem = await prisma.item.findFirst({
          where: {
            name: trimmedName,
            inventoryId: item.inventoryId,
          },
        });

        if (!connectedItem) {
          // Create a new item if it doesn't exist
          connectedItem = await prisma.item.create({
            data: {
              name: trimmedName,
              inventoryId: item.inventoryId,
              price: item.totalPrice,
              quantity: item.quantity,
            },
          });
        }

        // Create each receipt item
        await prisma.receiptItem.create({
          data: {
            quantity: item.quantity,
            totalPrice: item.totalPrice,
            category: {
              connect: { id: item.categoryId }, // Connect the category by its ID
            },
            item: {
              connect: { id: connectedItem.id }, // Connect to the existing or newly created item
            },
            receipt: {
              connect: { id: receipt.id }, // Associate with the newly created receipt
            },
          },
        });
      }
    }

    return NextResponse.json(receipt, { status: 201 });
  } catch (error) {
    console.error('Failed to create receipt item:', error);
    return NextResponse.json({ error: 'Failed to create receipt item', details: error.message }, { status: 500 });
  }
}
