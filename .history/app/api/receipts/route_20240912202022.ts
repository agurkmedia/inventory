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
      // Loop through each item to ensure data integrity
      for (const item of items) {
        // Log the individual item data
        console.log("Processing item:", item);

        // Validate required fields for new item creation
        if (!item.itemId && (!item.name || !item.inventoryId)) {
          console.error("Missing required fields: itemId, name, or inventoryId for item:", item);
          throw new Error("Missing required fields: itemId, name, or inventoryId.");
        }

        let connectedItem;

        // Check if an item with the same name already exists in the inventory
        connectedItem = await prisma.item.findFirst({
          where: {
            name: item.name.trim(), // Check by name
            inventoryId: item.inventoryId, // Check by inventoryId
          },
        });

        // If the item exists, reuse it; otherwise, create a new item
        if (connectedItem) {
          console.log(`Item "${item.name}" already exists in inventory ${item.inventoryId}, reusing item ID: ${connectedItem.id}`);
        } else {
          // If item does not exist, create a new item
          console.log("Creating new item with name:", item.name, "and inventoryId:", item.inventoryId);
          connectedItem = await prisma.item.create({
            data: {
              name: item.name.trim(), // Ensure name is provided when creating a new item
              inventoryId: item.inventoryId, // Ensure inventoryId is provided when creating a new item
              price: item.totalPrice, // Set initial price (optional, can be updated later)
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
              connect: { id: connectedItem.id }, // Either use the newly created or existing item
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

