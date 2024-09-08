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
    const { receiptId, itemId, quantity, totalPrice, categoryId } = await req.json();

    // Verify that the receipt belongs to the user
    const receipt = await prisma.receipt.findFirst({
      where: { id: receiptId, userId: session.user.id },
      include: { receiptItems: true },
    });

    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found or not authorized' }, { status: 404 });
    }

    const receiptItem = await prisma.receiptItem.create({
      data: {
        receiptId,
        itemId,
        quantity,
        totalPrice,
        categoryId,
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