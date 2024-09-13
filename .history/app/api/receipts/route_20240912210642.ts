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

        // Trim the item name to avoid issues with extra spaces but store it as raw (no lowercase conversion)
        const trimmedItemName = item.name.trim();

        // Check if an item with the same name and inventoryId already exists
        let connectedItem = await prisma.item.findFirst({
          where: {
            name: trimmedItemName, // Using trimmed (raw) name
            inventoryId: item.inventoryId,
          },
        });

        if (connectedItem) {
          // If item exists, reuse the existing one
          console.log(`Item "${trimmedItemName}" already exists in inventory ${item.inventoryId}, reusing item ID: ${connectedItem.id}`);
        } else {
          // Create a new item since no existing item was found
          console.log("Creating new item with name:", trimmedItemName, "and inventoryId:", item.inventoryId);

          connectedItem = await prisma.item.create({
            data: {
              name: trimmedItemName,  // Use the trimmed name (as-is)
              inventoryId: item.inventoryId,
              price: item.totalPrice,
              quantity: item.quantity,
            },
          });
        }

        // Create the receipt item, associating with the correct item (either new or existing)
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

