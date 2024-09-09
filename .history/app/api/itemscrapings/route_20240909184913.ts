import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const itemScrapings = await prisma.itemScraping.findMany({
      include: {
        inventory: true,
      },
    });

    const formattedItemScrapings = itemScrapings.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price || 0,
      inventoryName: item.inventory.name,
      inventoryId: item.inventoryId,
      image: item.image ? Buffer.from(item.image).toString('base64') : null,
      productCode: item.productCode,
      weight: item.weight,
      availability: item.availability,
      manufacturer: item.manufacturer,
      sourceUrl: item.sourceUrl,
    }));

    return NextResponse.json(formattedItemScrapings);
  } catch (error) {
    console.error('Failed to fetch item scrapings:', error);
    return NextResponse.json({ error: 'Failed to fetch item scrapings' }, { status: 500 });
  }
}