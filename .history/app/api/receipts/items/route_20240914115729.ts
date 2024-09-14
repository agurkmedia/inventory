// app/api/receipts/items/route.ts
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
    const items = await prisma.receiptItem.findMany({
      where: { receipt: { userId: session.user?.id } },
      include: { item: true },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Failed to fetch receipt items:', error);
    return NextResponse.json({ error: 'Failed to fetch receipt items' }, { status: 500 });
  }
}
