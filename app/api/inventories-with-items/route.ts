import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const inventories = await prisma.inventory.findMany({
      where: { userId: session.user?.id },
      include: {
        items: {
          select: {
            id: true,
            name: true,
            quantity: true,
            price: true,
            image: true,
          }
        },
        itemScrapings: {
          select: {
            id: true,
            name: true,
            quantity: true,
            price: true,
            image: true,
          }
        },
      },
    });

    // Convert image Buffers to base64 strings
    const processedInventories = inventories.map(inventory => ({
      ...inventory,
      items: inventory.items.map(item => ({
        ...item,
        image: item.image ? item.image.toString('base64') : null
      })),
      itemScrapings: inventory.itemScrapings.map(item => ({
        ...item,
        image: item.image ? item.image.toString('base64') : null
      }))
    }));

    return NextResponse.json(processedInventories);
  } catch (error) {
    console.error('Failed to fetch inventories with items:', error);
    return NextResponse.json({ error: 'Failed to fetch inventories with items' }, { status: 500 });
  }
}