import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const items = await prisma.item.findMany({
      where: { inventory: { userId: session.user.id } },
      include: { inventory: true }
    });

    const formattedItems = items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      inventoryName: item.inventory.name
    }));

    return NextResponse.json(formattedItems);
  } catch (error) {
    console.error('Failed to fetch items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}