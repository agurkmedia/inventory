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
    const body = await req.json();
    
    // Log the incoming request body
    console.log('Request body:', body);

    const { storeName, totalAmount, date, items } = body;

    // Ensure items is an array before proceeding
    if (!items || !Array.isArray(items)) {
      throw new Error("Items must be provided as an array");
    }

    const newReceipt = await prisma.receipt.create({
      data: {
        storeName,
        totalAmount,
        date: new Date(date),
        userId: session.user.id,
        receiptItems: {
          create: items.map((item: any) => ({
            quantity: item.quantity,
            totalPrice: item.totalPrice,
            categoryId: item.categoryId,
            item: {
              connect: { id: item.itemId }
            }
          })),
        },
      },
      include: {
        receiptItems: {
          include: {
            item: true,
            category: true,
          }
        },
      },
    });

    return NextResponse.json(newReceipt);
  } catch (error) {
    console.error('Failed to create receipt:', error);
    return NextResponse.json({ error: 'Failed to create receipt', details: error.message }, { status: 500 });
  }
}
