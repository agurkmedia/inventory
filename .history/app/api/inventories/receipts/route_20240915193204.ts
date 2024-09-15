import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const receiptsInventory = await prisma.inventory.findFirst({
      where: {
        userId: session.user.id,
        name: 'Receipts'
      },
      select: { id: true }
    });

    if (!receiptsInventory) {
      return NextResponse.json({ error: 'Receipts inventory not found' }, { status: 404 });
    }

    return NextResponse.json(receiptsInventory);
  } catch (error) {
    console.error('Error fetching Receipts inventory:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let receiptsInventory = await prisma.inventory.findFirst({
      where: {
        userId: session.user.id,
        name: 'Receipts'
      }
    });

    if (!receiptsInventory) {
      receiptsInventory = await prisma.inventory.create({
        data: {
          name: 'Receipts',
          userId: session.user.id
        }
      });
    }

    return NextResponse.json(receiptsInventory);
  } catch (error) {
    console.error('Error ensuring Receipts inventory:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}