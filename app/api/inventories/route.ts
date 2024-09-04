import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const inventories = await prisma.inventory.findMany({
      where: { userId: session.user.id },
      include: { _count: { select: { items: true } } }
    });

    const formattedInventories = inventories.map(inv => ({
      id: inv.id,
      name: inv.name,
      itemCount: inv._count.items
    }));

    return NextResponse.json(formattedInventories);
  } catch (error) {
    console.error('Failed to fetch inventories:', error);
    return NextResponse.json({ error: 'Failed to fetch inventories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name } = await req.json();
    const newInventory = await prisma.inventory.create({
      data: {
        name,
        userId: session.user.id
      },
    });

    return NextResponse.json(newInventory, { status: 201 });
  } catch (error) {
    console.error('Failed to create inventory:', error);
    return NextResponse.json({ error: 'Failed to create inventory' }, { status: 500 });
  }
}