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

    // Create a receipt first
    const receipt = await prisma.receipt.create({
      data: {
        storeName,
        totalAmount,
        date: new Date(date),
        userId: session.user?.id,
      },
    });

    // If items are provided, associate them with the receipt
    if (items && Array.isArray(items)) {
      const receiptItems = items.map((item: any) => ({
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        categoryId: item.categoryId,
        item: {
          connect: { id: item.itemId },
        },
        receiptId: receipt.id, // Associate with the newly created receipt
      }));

      // Create the receipt items in the database
      await prisma.receiptItem.createMany({
        data: receiptItems,
      });
    }

    return NextResponse.json(receipt, { status: 201 });
  } catch (error) {
    console.error('Failed to create receipt:', error);
    return NextResponse.json({ error: 'Failed to create receipt', details: error.message }, { status: 500 });
  }
}
