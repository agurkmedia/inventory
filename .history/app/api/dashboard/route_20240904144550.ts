import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const totalInventories = await prisma.inventory.count();
    const totalItems = await prisma.itemScraping.count();
    const lowStockItems = await prisma.itemScraping.count({
      where: {
        quantity: {
          lt: 5, // Example threshold for low stock
        },
      },
    });

    const recentActivity = await prisma.activity.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 10, // Example limit for recent activity
    });

    const dashboardData = {
      totalInventories,
      totalItems,
      lowStockItems,
      recentActivity: recentActivity.map((activity) => ({
        text: activity.description,
        time: activity.createdAt.toISOString(),
      })),
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}