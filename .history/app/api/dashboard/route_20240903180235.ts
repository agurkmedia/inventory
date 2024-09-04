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
    const [inventoriesCount, itemsCount, lowStockItems, recentActivity] = await Promise.all([
      prisma.inventory.count({ where: { userId: session.user.id } }),
      prisma.item.count({ where: { inventory: { userId: session.user.id } } }),
      prisma.item.count({ where: { inventory: { userId: session.user.id }, quantity: { lte: 5 } } }),
      prisma.item.findMany({
        where: { inventory: { userId: session.user.id } },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: { inventory: true }
      })
    ]);

    const formattedActivity = recentActivity.map(item => ({
      text: `Updated ${item.name} in ${item.inventory.name}`,
      time: item.updatedAt.toLocaleString()
    }));

    return NextResponse.json({
      totalInventories: inventoriesCount,
      totalItems: itemsCount,
      lowStockItems,
      recentActivity: formattedActivity
    });
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}