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

        // Trim item name and convert to lowercase to avoid duplication issues due to case sensitivity
        const sanitizedItemName = item.name.trim().toLowerCase();

        // Check if an item with the same sanitized name and inventoryId already exists
        let connectedItem = await prisma.item.findFirst({
          where: {
            name: sanitizedItemName,
            inventoryId: item.inventoryId,
          },
        });

        if (connectedItem) {
          console.log(`Item "${sanitizedItemName}" already exists in inventory ${item.inventoryId}, reusing item ID: ${connectedItem.id}`);
        } else {
          // If the item doesn't exist, try to create a new one
          try {
            // Log to indicate new item creation
            console.log("Creating new item with name:", sanitizedItemName, "and inventoryId:", item.inventoryId);

            connectedItem = await prisma.item.create({
              data: {
                name: sanitizedItemName, // Use sanitized name
                inventoryId: item.inventoryId,
                price: item.totalPrice,
                quantity: item.quantity,
              },
            });

          } catch (error: any) {
            // Catch Prisma unique constraint error (P2002)
            if (error.code === 'P2002') {
              console.error(`Item "${sanitizedItemName}" already exists due to unique constraint. Fetching the existing item.`);

              // If unique constraint error occurs, fetch the existing item
              connectedItem = await prisma.item.findFirst({
                where: {
                  name: sanitizedItemName,
                  inventoryId: item.inventoryId,
                },
              });

              if (!connectedItem) {
                throw new Error(`Failed to fetch existing item with name "${sanitizedItemName}" and inventoryId "${item.inventoryId}".`);
              }
            } else {
              // Other errors
              console.error('Failed to create item:', error);
              throw new Error('Failed to create item');
            }
          }
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
  } catch (error: any) {
    console.error('Failed to create receipt item:', error);
    return NextResponse.json({ error: 'Failed to create receipt item', details: error.message }, { status: 500 });
  }
}
