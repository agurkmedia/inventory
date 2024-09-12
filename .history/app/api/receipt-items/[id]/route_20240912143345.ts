import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

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
        receipt: true,
      },
    });

    // Then, update the associated Item
    const updatedItem = await prisma.item.update({
      where: { id: updatedReceiptItem.item.id },
      data: {
        name: itemName,
        inventoryId: inventoryId || null,
      },
    });

    // Update the receipt's total amount
    const receipt = updatedReceiptItem.receipt;
    const receiptItems = await prisma.receiptItem.findMany({
      where: { receiptId: receipt.id },
    });
    const newTotalAmount = receiptItems.reduce((total, item) => total + item.totalPrice, 0);
    await prisma.receipt.update({
      where: { id: receipt.id },
      data: { totalAmount: newTotalAmount },
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

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    // First, get the receipt item to be deleted
    const receiptItem = await prisma.receiptItem.findUnique({
      where: { id },
      include: { receipt: true },
    });

    if (!receiptItem) {
      return NextResponse.json({ error: 'Receipt item not found' }, { status: 404 });
    }

    // Delete the receipt item
    await prisma.receiptItem.delete({
      where: { id },
    });

    // Update the receipt's total amount
    const updatedReceiptItems = await prisma.receiptItem.findMany({
      where: { receiptId: receiptItem.receipt.id },
    });
    const newTotalAmount = updatedReceiptItems.reduce((total, item) => total + item.totalPrice, 0);
    await prisma.receipt.update({
      where: { id: receiptItem.receipt.id },
      data: { totalAmount: newTotalAmount },
    });

    return NextResponse.json({ message: 'Receipt item deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete receipt item:', error);
    return NextResponse.json({ error: 'Failed to delete receipt item' }, { status: 500 });
  }
}