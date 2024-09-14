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

    // Check for duplicate receipt using a unique constraint
    try {
      // Attempt to create the receipt
      const receipt = await prisma.receipt.create({
        data: {
          storeName,
          totalAmount,
          date: new Date(), // Use the current date for the receipt
          userId: session.user?.id,
        },
      });

      if (items && Array.isArray(items)) {
        // Prepare data structures
        const itemNames = items.map((item: any) => item.name.trim());
        const inventoryIds = [...new Set(items.map((item: any) => item.inventoryId))];

        // Fetch existing items
        const existingItems = await prisma.item.findMany({
          where: {
            name: { in: itemNames },
            inventoryId: { in: inventoryIds },
          },
        });

        const existingItemsMap = new Map(
          existingItems.map((item) => [`${item.name}_${item.inventoryId}`, item])
        );

        // Prepare items to create and receipt items data
        const itemsToCreate = [];
        const receiptItemsData = [];

        for (const item of items) {
          const trimmedName = item.name.trim();
          const itemKey = `${trimmedName}_${item.inventoryId}`;

          let connectedItem = existingItemsMap.get(itemKey);

          if (!connectedItem) {
            // Add to items to create
            itemsToCreate.push({
              name: trimmedName,
              inventoryId: item.inventoryId,
              price: item.totalPrice,
              quantity: item.quantity,
            });
          }

          // Prepare receipt item data
          receiptItemsData.push({
            quantity: item.quantity,
            totalPrice: item.totalPrice,
            categoryId: item.categoryId,
            itemKey,
            date: new Date(item.date), // Include the date from the item
          });
        }

        // Create new items
        let newItems = [];
        if (itemsToCreate.length > 0) {
          newItems = await prisma.$transaction(
            itemsToCreate.map((itemData) =>
              prisma.item.create({
                data: itemData,
              })
            )
          );

          // Update the existing items map
          newItems.forEach((item) => {
            const itemKey = `${item.name}_${item.inventoryId}`;
            existingItemsMap.set(itemKey, item);
          });
        }

        // Check for existing receipt items to prevent duplicates
        for (const receiptItem of receiptItemsData) {
          const itemId = existingItemsMap.get(receiptItem.itemKey)?.id;

          // Check if a receipt item with the same details exists
          const existingReceiptItem = await prisma.receiptItem.findFirst({
            where: {
              receiptId: receipt.id,
              itemId: itemId,
              categoryId: receiptItem.categoryId,
              date: receiptItem.date,
            },
          });

          if (!existingReceiptItem) {
            // Create the receipt item
            await prisma.receiptItem.create({
              data: {
                quantity: receiptItem.quantity,
                totalPrice: receiptItem.totalPrice,
                categoryId: receiptItem.categoryId,
                itemId: itemId,
                receiptId: receipt.id,
                date: receiptItem.date,
              },
            });
          }
        }
      }

      return NextResponse.json({ message: "Receipt created successfully." }, { status: 201 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle unique constraint violation
        if (error.code === 'P2002') {
          return NextResponse.json(
            { message: "Duplicate receipt detected, no new entry created." },
            { status: 409 }
          );
        }
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Failed to create receipt item:', error);
    return NextResponse.json(
      { error: 'Failed to create receipt item', details: error.message },
      { status: 500 }
    );
  }
}
