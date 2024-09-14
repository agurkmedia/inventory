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
      include: {
        receiptItems: {
          include: {
            item: true,
            category: true,
          },
        },
      },
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

    // Check if a receipt with the same storeName and userId exists
    let receipt = await prisma.receipt.findFirst({
      where: {
        userId: session.user?.id,
        storeName,
      },
    });

    let receiptCreated = false;

    if (!receipt) {
      // Create a new receipt
      receipt = await prisma.receipt.create({
        data: {
          storeName,
          totalAmount: 0, // We will calculate totalAmount from receiptItems
          date: new Date(), // Use current date for the receipt
          userId: session.user?.id,
        },
      });
      receiptCreated = true;
    }

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

      // Now process receipt items
      let totalAmountToAdd = 0;
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

          // Sum up the totalAmount to add
          totalAmountToAdd += receiptItem.totalPrice;
        }
      }

      // Update the receipt's totalAmount
      if (totalAmountToAdd > 0) {
        receipt = await prisma.receipt.update({
          where: { id: receipt.id },
          data: {
            totalAmount: {
              increment: totalAmountToAdd,
            },
          },
        });
      }
    }

    let message = '';
    if (receiptCreated) {
      message = 'New receipt created and items added.';
    } else if (totalAmountToAdd > 0) {
      message = 'Items added to existing receipt.';
    } else {
      message = 'No new items added; all items already exist in the receipt.';
    }

    return NextResponse.json({ message }, { status: 200 });
  } catch (error: any) {
    console.error('Failed to process receipt:', error);
    return NextResponse.json(
      { error: 'Failed to process receipt', details: error.message },
      { status: 500 }
    );
  }
}
