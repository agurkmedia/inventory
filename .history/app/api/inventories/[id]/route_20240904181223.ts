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
    const inventory = await prisma.inventory.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        itemScrapings: true,
      },
    });

    if (!inventory || inventory.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const formattedInventory = {
      id: inventory.id,
      name: inventory.name,
      items: [
        ...inventory.items.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          image: item.image ? item.image.toString('base64') : null,
        })),
        ...inventory.itemScrapings.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          image: item.image ? item.image.toString('base64') : null,
        })),
      ],
    };

    return NextResponse.json(formattedInventory);
  } catch (error) {
    console.error('Failed to fetch inventory details:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory details' }, { status: 500 });
  }
}