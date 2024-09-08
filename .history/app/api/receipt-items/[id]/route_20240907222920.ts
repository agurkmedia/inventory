import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const { quantity, totalPrice } = await req.json();

    // Fetch the receipt item
    const receiptItem = await prisma.receiptItem.findUnique({
      where: { id: params.id },
      include: { receipt: true },
    });

    if (!receiptItem) {
      return NextResponse.json({ error: 'Receipt item not found' }, { status: 404 });
    }

    // Verify that the receipt belongs to the user
    if (receiptItem.receipt.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to edit this receipt item' }, { status: 403 });
    }

    // Update the receipt item
    const updatedReceiptItem = await prisma.receiptItem.update({
      where: { id: params.id },
      data: { quantity, totalPrice },
    });

    // Recalculate the total amount for the receipt
    const updatedReceipt = await prisma.receipt.findUnique({
      where: { id: receiptItem.receiptId },
      include: { receiptItems: true },
    });

    if (updatedReceipt) {
      const newTotalAmount = updatedReceipt.receiptItems.reduce((total, item) => total + item.totalPrice, 0);

      // Update the receipt with the new total amount
      await prisma.receipt.update({
        where: { id: receiptItem.receiptId },
        data: { totalAmount: newTotalAmount },
      });
    }

    return NextResponse.json(updatedReceiptItem);
  } catch (error) {
    console.error('Failed to update receipt item:', error);
    return NextResponse.json({ error: 'Failed to update receipt item' }, { status: 500 });
  }
}