import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const inventories = await prisma.inventory.findMany({
      include: {
        _count: {
          select: { items: true, itemScrapings: true },
        },
      },
    });

    const inventoriesWithItemCount = inventories.map((inventory) => ({
      id: inventory.id,
      name: inventory.name,
      itemCount: inventory._count.items + inventory._count.itemScrapings,
    }));

    return NextResponse.json(inventoriesWithItemCount);
  } catch (error) {
    console.error('Error fetching inventories:', error);
    return NextResponse.json({ error: 'Failed to fetch inventories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const newInventory = await prisma.inventory.create({
      data: {
        name,
        userId: session.user.id,
      },
    });

    return NextResponse.json(newInventory);
  } catch (error) {
    console.error('Error creating inventory:', error);
    return NextResponse.json({ error: 'Failed to create inventory' }, { status: 500 });
  }
}