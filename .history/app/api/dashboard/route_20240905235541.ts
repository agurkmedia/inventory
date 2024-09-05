import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

const prisma = new PrismaClient();

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    try {
        const userId = session.user.id;
        const totalInventories = await prisma.inventory.count({
            where: { userId }
        });
        const totalItems = await prisma.item.count({
            where: { inventory: { userId } }
        });
        const totalItemScrapings = await prisma.itemScraping.count({
            where: { inventory: { userId } }
        });
        const lowStockItems = await prisma.item.count({
            where: {
                inventory: { userId },
                quantity: { lt: 5 }
            }
        });

        const recentItems = await prisma.item.findMany({
            where: { inventory: { userId } },
            orderBy: { updatedAt: 'desc' },
            take: 5
        });

        const recentItemScrapings = await prisma.itemScraping.findMany({
            where: { inventory: { userId } },
            orderBy: { updatedAt: 'desc' },
            take: 5
        });

        const recentActivity = [...recentItems, ...recentItemScrapings]
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
            .slice(0, 10)
            .map(item => ({
                text: `Updated item: ${item.name}`,
                time: item.updatedAt.toISOString()
            }));

        const dashboardData = {
            totalInventories,
            totalItems: totalItems + totalItemScrapings,
            lowStockItems,
            recentActivity
        };

        return NextResponse.json(dashboardData);
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
    }
}