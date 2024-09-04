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

    if (!item || item.inventory.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const formattedItem = {
      id: item.id,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      inventoryName: item.inventory.name,
      inventoryId: item.inventoryId,
      hasImage: !!item.image
    };

    return NextResponse.json(formattedItem);
  } catch (error) {
    console.error('Failed to fetch item details:', error);
    return NextResponse.json({ error: 'Failed to fetch item details' }, { status: 500 });
  }
}