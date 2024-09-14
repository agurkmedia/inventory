import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const { receiptId, id, name, inventoryId, quantity, totalPrice, categoryId } = await req.json();

    // Verify that the receipt belongs to the user
    const receipt = await prisma.receipt.findFirst({
      where: { id: receiptId, userId: session.user.id },
      include: { receiptItems: true },
    });

    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found or not authorized' }, { status: 404 });
    }

    let itemId = id;

    // If no id is provided, create a new item
    if (!itemId) {
      const newItem = await prisma.item.create({
        data: {
          name,
          inventoryId,
          quantity: 1, // Default quantity
          price: totalPrice / quantity, // Calculate unit price
          // Remove the userId field from here
        },
      });
      itemId = newItem.id;
    }
        const receiptId: string = /* your receiptId */;
    const itemId: string = /* your itemId */;
    const quantity: number = /* your quantity */;
    const totalPrice: number = /* your totalPrice */;
    const categoryId: string | undefined = /* your categoryId */;

    const receiptItem = await prisma.receiptItem.create({
      data: {
        receiptId,
        itemId,
        quantity,
        totalPrice,
        categoryId: categoryId as string, // Assuming categoryId should be a string
      },
    });
    
    

    // Recalculate total amount
    const newTotalAmount = receipt.receiptItems.reduce((total, item) => total + item.totalPrice, 0) + totalPrice;

    // Update the receipt with the new total amount
    await prisma.receipt.update({
      where: { id: receiptId },
      data: { totalAmount: newTotalAmount },
    });

    return NextResponse.json({ receiptItem, newTotalAmount }, { status: 201 });
  } catch (error) {
    console.error('Failed to create receipt item:', error);
    return NextResponse.json({ error: 'Failed to create receipt item' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
  }

  try {
    const { quantity, totalPrice, categoryId, itemName, inventoryId } = await request.json();

    // First, update the ReceiptItem
    const updatedReceiptItem = await prisma.receiptItem.update({
      where: { id },
      data: {
        quantity,
        totalPrice,
        categoryId,
      },
      include: {
        item: true,
      },
    });

    // Then, update the associated Item
    const updatedItem = await prisma.item.update({
      where: { id: updatedReceiptItem.itemId },
      data: {
        name: itemName,
        inventoryId: inventoryId || null,
      },
    });

    // Combine the updated ReceiptItem and Item data
    const result = {
      ...updatedReceiptItem,
      item: updatedItem,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to update receipt item:', error);
    return NextResponse.json({ error: 'Failed to update receipt item' }, { status: 500 });
  }
}