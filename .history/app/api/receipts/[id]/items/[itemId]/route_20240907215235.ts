import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; itemId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    // Verify that the receipt belongs to the user
    const receipt = await prisma.receipt.findFirst({
      where: { 
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found or not authorized' }, { status: 404 });
    }

    // Remove the item from the receipt
    await prisma.receiptItem.delete({
      where: {
        id: params.itemId,
        receiptId: params.id,
      },
    });

    return NextResponse.json({ message: 'Item removed from receipt successfully' });
  } catch (error) {
    console.error('Failed to remove item from receipt:', error);
    return NextResponse.json({ error: 'Failed to remove item from receipt' }, { status: 500 });
  }
}