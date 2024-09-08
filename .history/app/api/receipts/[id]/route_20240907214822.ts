import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const receipt = await prisma.receipt.findUnique({
      where: { 
        id: params.id,
        userId: session.user.id,
      },
      include: {
        receiptItems: {
          include: {
            item: true,
            category: true,
          },
        },
      },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    const formattedReceipt = {
      ...receipt,
      items: receipt.receiptItems.map(item => ({
        id: item.id,
        itemName: item.item.name,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        categoryName: item.category.name,
      })),
    };

    return NextResponse.json(formattedReceipt);
  } catch (error) {
    console.error('Failed to fetch receipt:', error);
    return NextResponse.json({ error: 'Failed to fetch receipt' }, { status: 500 });
  }
}