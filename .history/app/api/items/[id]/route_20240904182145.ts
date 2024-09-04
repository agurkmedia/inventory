import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const item = await prisma.item.findUnique({
      where: { id: params.id },
      include: { inventory: true }
    });

    if (!item) {
      const scrapedItem = await prisma.itemScraping.findUnique({
        where: { id: params.id },
        include: { inventory: true }
      });

      if (!scrapedItem) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      return NextResponse.json({
        id: scrapedItem.id,
        name: scrapedItem.name,
        description: scrapedItem.description,
        quantity: scrapedItem.quantity,
        inventoryName: scrapedItem.inventory.name,
        inventoryId: scrapedItem.inventoryId,
        image: scrapedItem.image ? scrapedItem.image.toString('base64') : null,
        productCode: scrapedItem.productCode,
        price: scrapedItem.price,
        sourceUrl: scrapedItem.sourceUrl,
      });
    }

    return NextResponse.json({
      id: item.id,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      inventoryName: item.inventory.name,
      inventoryId: item.inventoryId,
      image: item.image ? item.image.toString('base64') : null,
    });
  } catch (error) {
    console.error('Failed to fetch item details:', error);
    return NextResponse.json({ error: 'Failed to fetch item details' }, { status: 500 });
  }
}