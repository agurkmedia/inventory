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

    // Create a receipt first
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
        // Log the individual item data
        console.log("Processing item:", item);

        // Validate required fields for new item creation
        if (!item.name || !item.inventoryId) {
          console.error("Missing required fields: name or inventoryId for item:", item);
          throw new Error("Missing required fields: name or inventoryId.");
        }

        // Trim item name to avoid issues with extra spaces
        const trimmedName = item.name.trim();

        // Check if an item with the same name and inventoryId already exists
        let connectedItem = await prisma.item.findFirst({
          where: {
            name: trimmedName, // Check by trimmed name
            inventoryId: item.inventoryId, // Check by inventoryId
          },
        });

        if (connectedItem) {
          console.log(`Item "${trimmedName}" already exists in inventory ${item.inventoryId}, reusing item ID: ${connectedItem.id}`);
        } else {
          // Log to indicate new item creation
          console.log("Creating new item with name:", trimmedName, "and inventoryId:", item.inventoryId);

          // Create a new item
          connectedItem = await prisma.item.create({
            data: {
              name: trimmedName, // Ensure name is trimmed
              inventoryId: item.inventoryId, // Ensure inventoryId is provided when creating a new item
              price: item.totalPrice, // Set initial price
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



