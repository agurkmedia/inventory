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
    let item = await prisma.item.findUnique({
      where: { id: params.id },
      include: { inventory: true }
    });

    if (!item) {
      item = await prisma.itemScraping.findUnique({
        where: { id: params.id },
        include: { inventory: true }
      });
    }

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: item.id,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      inventoryName: item.inventory.name,
      inventoryId: item.inventoryId,
      image: item.image ? item.image.toString('base64') : null,
      productCode: 'productCode' in item ? item.productCode : null,
      price: 'price' in item ? item.price : null,
      sourceUrl: 'sourceUrl' in item ? item.sourceUrl : null,
    });
  } catch (error) {
    console.error('Failed to fetch item details:', error);
    return NextResponse.json({ error: 'Failed to fetch item details' }, { status: 500 });
  }
}