import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';

const prisma = new PrismaClient();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    const totalInventories = await prisma.inventory.count({
      where: { userId }
    });
    const totalItems = await prisma.item.count({
      where: { inventory: { userId } }
    });
    const lowStockItems = await prisma.item.count({
      where: {
        inventory: { userId },
        quantity: { lt: 5 }
      }
    });

    const recentActivity = await prisma.item.findMany({
      where: { inventory: { userId } },
      orderBy: { updatedAt: 'desc' },
      take: 10
    });

    const dashboardData = {
      totalInventories,
      totalItems,
      lowStockItems,
      recentActivity: recentActivity.map(activity => ({
        text: `Updated item: ${activity.name}`,
        time: activity.updatedAt.toISOString()
      }))
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}