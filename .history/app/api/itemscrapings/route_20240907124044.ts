import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const userId = session.user?.id;
    const itemScrapings = await prisma.itemScraping.findMany({
      where: { inventory: { userId } },
      include: { inventory: true }
    });

    const formattedItemScrapings = itemScrapings.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      price: item.price,
      inventoryName: item.inventory.name,
      inventoryId: item.inventoryId,
      image: item.image ? item.image.toString('base64') : null
    }));

    return NextResponse.json({ itemScrapings: formattedItemScrapings });
  } catch (error) {
    console.error('Failed to fetch item scrapings:', error);
    return NextResponse.json({ error: 'Failed to fetch item scrapings' }, { status: 500 });
  }
}