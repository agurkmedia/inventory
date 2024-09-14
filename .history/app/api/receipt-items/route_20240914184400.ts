import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { Prisma } from '@prisma/client'; 
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const {
      receiptId,
      id,
      name,
      inventoryId,
      quantity,
      totalPrice,
      categoryId,
      date, // Make sure to handle the date as well
    } = await req.json();

    // Validate input types
    const validatedReceiptId: string = receiptId as string;
    const validatedCategoryId: string = categoryId as string;
    const validatedQuantity: number = parseInt(quantity, 10);
    const validatedTotalPrice: number = parseFloat(totalPrice);
    const validatedDate: Date = new Date(date);

    // Verify that the receipt belongs to the user
    const receipt = await prisma.receipt.findFirst({
      where: { id: validatedReceiptId, userId: session.user.id },
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
          price: validatedTotalPrice / validatedQuantity, // Calculate unit price
        },
      });
      itemId = newItem.id;
    }

    // Create the receipt item using validated data
    const receiptItemData: Prisma.ReceiptItemCreateInput = {
      receipt: { connect: { id: validatedReceiptId } },
      item: { connect: { id: itemId as string } },
      quantity: validatedQuantity,
      totalPrice: validatedTotalPrice,
      category: { connect: { id: validatedCategoryId } },
    };

    const receiptItem = await prisma.receiptItem.create({
      data: receiptItemData,
    });

    // Recalculate total amount
    const newTotalAmount =
      receipt.receiptItems.reduce((total, item) => total + item.totalPrice, 0) + validatedTotalPrice;

    // Update the receipt with the new total amount
    await prisma.receipt.update({
      where: { id: validatedReceiptId },
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