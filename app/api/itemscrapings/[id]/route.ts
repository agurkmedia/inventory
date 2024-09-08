import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const itemScraping = await prisma.itemScraping.findUnique({
      where: { id: params.id },
      include: { inventory: true }
    });

    if (!itemScraping) {
      return NextResponse.json({ error: 'ItemScraping not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...itemScraping,
      image: itemScraping.image ? itemScraping.image.toString('base64') : null
    });
  } catch (error) {
    console.error('Failed to fetch itemScraping:', error);
    return NextResponse.json({ error: 'Failed to fetch itemScraping' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const itemScrapingId = params.id;
    
    // Verify that the itemScraping belongs to one of the user's inventories
    const itemScraping = await prisma.itemScraping.findFirst({
      where: {
        id: itemScrapingId,
        inventory: { userId: session.user?.id }
      }
    });

    if (!itemScraping) {
      return NextResponse.json({ error: 'ItemScraping not found or not authorized' }, { status: 404 });
    }

    await prisma.itemScraping.delete({
      where: { id: itemScrapingId }
    });

    return NextResponse.json({ message: 'ItemScraping deleted successfully' });
  } catch (error) {
    console.error('Failed to delete itemScraping:', error);
    return NextResponse.json({ error: 'Failed to delete itemScraping' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const { name, description, quantity, price, inventoryId } = await req.json();

    // Verify that the itemScraping and inventory belong to the user
    const itemScraping = await prisma.itemScraping.findFirst({
      where: {
        id: params.id,
        inventory: { userId: session.user?.id }
      }
    });

    if (!itemScraping) {
      return NextResponse.json({ error: 'ItemScraping not found or not authorized' }, { status: 404 });
    }

    const updatedItemScraping = await prisma.itemScraping.update({
      where: { id: params.id },
      data: {
        name,
        description,
        quantity,
        price,
        inventoryId,
      },
    });

    return NextResponse.json(updatedItemScraping);
  } catch (error) {
    console.error('Failed to update itemScraping:', error);
    return NextResponse.json({ error: 'Failed to update itemScraping' }, { status: 500 });
  }
}