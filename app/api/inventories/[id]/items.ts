import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request, { params }) {
  const { id } = params;

  try {
    const items = await prisma.item.findMany({
      where: { inventoryId: id },
    });

    const itemScrapings = await prisma.itemScraping.findMany({
      where: { inventoryId: id },
    });

    return NextResponse.json({ items, itemScrapings });
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}