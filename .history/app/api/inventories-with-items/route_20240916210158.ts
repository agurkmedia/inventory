import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  try {
    const inventories = await prisma.inventory.findMany({
      where: { userId: session.user?.id },
      include: {
        items: {
          include: {
            receiptItems: {
              select: {
                id: true,
                receiptId: true
                storeName: true
              }
            }
          }
        },
        itemScrapings: true // ItemScraping doesn't have a direct relation to ReceiptItem
      }
    });

    return NextResponse.json(inventories);
  } catch (error) {
    console.error('Failed to fetch inventories with items:', error);
    return NextResponse.json({ error: 'Failed to fetch inventories with items' }, { status: 500 });
  }
}