import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';

// Add this interface to define the structure of an Item to create
interface ItemToCreate {
  name: string;
  inventoryId: string;
  price: number;
  quantity: number;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
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
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  try {
    const { storeName, totalAmount, date, items } = await req.json();

    // Validate input
    if (!storeName || !totalAmount || !date || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Create the receipt
    const receipt = await prisma.receipt.create({
      data: {
        storeName,
        totalAmount,
        date: new Date(date),
        userId: session.user?.id,
      },
    });

    // Process items
    const itemsToCreate: ItemToCreate[] = [];
    const receiptItemsToCreate = [];

    for (const item of items) {
      const trimmedName = item.name.trim();

      // Check if the item already exists
      const existingItem = await prisma.item.findFirst({
        where: {
          name: trimmedName,
          inventoryId: item.inventoryId,
        },
      });

      let itemId;

      if (existingItem) {
        itemId = existingItem.id;
      } else {
        // Check if we've already added this item to the creation list
        const itemToCreate = itemsToCreate.find(i => i.name === trimmedName && i.inventoryId === item.inventoryId);
        
        if (itemToCreate) {
          // If it's in the creation list, we'll use its future ID
          itemId = `future_${itemToCreate.name}_${itemToCreate.inventoryId}`;
        } else {
          // If it's not in the creation list, add it
          itemsToCreate.push({
            name: trimmedName,
            inventoryId: item.inventoryId,
            price: item.totalPrice,
            quantity: item.quantity,
          });
          itemId = `future_${trimmedName}_${item.inventoryId}`;
        }
      }

      // Add to receiptItems
      receiptItemsToCreate.push({
        receiptId: receipt.id,
        itemId,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        categoryId: item.categoryId,
        date: new Date(item.date),
      });
    }

    // Create new items
    const createdItems = await prisma.item.createMany({
      data: itemsToCreate,
      skipDuplicates: true,
    });

    // Fetch all items (existing and newly created)
    const allItems = await prisma.item.findMany({
      where: {
        OR: [
          { id: { in: receiptItemsToCreate.map(ri => ri.itemId).filter(id => !id.startsWith('future_')) } },
          { name: { in: itemsToCreate.map(i => i.name) } },
        ],
      },
    });

    // Create receiptItems
    const createdReceiptItems = await prisma.receiptItem.createMany({
      data: receiptItemsToCreate.map(ri => ({
        ...ri,
        itemId: ri.itemId.startsWith('future_')
          ? allItems.find(i => i.name === ri.itemId.split('_')[1] && i.inventoryId === ri.itemId.split('_')[2])!.id
          : ri.itemId,
      })),
    });

    return NextResponse.json({
      message: 'Receipt and items created successfully',
      receipt,
      itemsCreated: createdItems.count,
      receiptItemsCreated: createdReceiptItems.count,
    });

  } catch (error) {
    console.error('Failed to create receipt:', error);
    return NextResponse.json({ error: 'Failed to create receipt' }, { status: 500 });
  }
}
