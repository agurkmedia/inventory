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

    // Ensure items are provided
    if (items && Array.isArray(items)) {
      // Loop through each item to ensure data integrity
      const receiptItems = await Promise.all(
        items.map(async (item: any) => {
          // Log individual item data
          console.log("Processing item:", item);

          // Validate required fields for new item creation
          if (!item.itemId && (!item.name || !item.inventoryId)) {
            console.error("Missing required fields: itemId, name, or inventoryId for item:", item);
            throw new Error("Missing required fields: itemId, name, or inventoryId.");
          }

          let connectedItem;

          // If itemId is not provided, create a new item
          if (!item.itemId) {
            console.log("Creating new item with name:", item.name, "and inventoryId:", item.inventoryId);
            connectedItem = await prisma.item.create({
              data: {
                name: item.name, // Ensure name is provided when creating a new item
                inventoryId: item.inventoryId, // Ensure inventoryId is provided when creating a new item
                price: item.totalPrice, // Set initial price (optional, can be updated later)
                quantity: item.quantity,
              },
            });
          } else {
            // If itemId exists, connect to the existing item
            connectedItem = await prisma.item.findUnique({
              where: { id: item.itemId },
            });
            if (!connectedItem) {
              console.error("Item with id:", item.itemId, "not found");
              throw new Error(`Item with id ${item.itemId} not found`);
            }
          }

          return {
            quantity: item.quantity,
            totalPrice: item.totalPrice,
            categoryId: item.categoryId,
            item: {
              connect: { id: connectedItem.id }, // Either use the newly created or existing item
            },
            receiptId: receipt.id, // Associate with the newly created receipt
          };
        })
      );

      // Create all receipt items in the database
      await prisma.receiptItem.createMany({
        data: receiptItems,
      });
    }

    return NextResponse.json(receipt, { status: 201 });
  } catch (error) {
    console.error('Failed to create receipt item:', error);
    return NextResponse.json({ error: 'Failed to create receipt item', details: error.message }, { status: 500 });
  }
}
