import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const inventory = await prisma.inventory.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        itemScrapings: true,
      },
    });

    if (!inventory) {
      return NextResponse.json({ error: 'Inventory not found' }, { status: 404 });
    }

    const formattedInventory = {
      id: inventory.id,
      name: inventory.name,
      items: [
        ...inventory.items.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          image: item.image ? item.image.toString('base64') : null,
        })),
        ...inventory.itemScrapings.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          image: item.image ? item.image.toString('base64') : null,
          productCode: item.productCode,
          price: item.price,
          sourceUrl: item.sourceUrl,
        })),
      ],
    };

    return NextResponse.json(formattedInventory);
  } catch (error) {
    console.error('Failed to fetch inventory details:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory details' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const inventory = await prisma.inventory.findUnique({
      where: { id: params.id },
    });

    if (!inventory) {
      return NextResponse.json({ error: 'Inventory not found' }, { status: 404 });
    }

    // Delete related items and itemScrapings
    await prisma.item.deleteMany({
      where: { inventoryId: params.id },
    });
    await prisma.itemScraping.deleteMany({
      where: { inventoryId: params.id },
    });

    // Delete the inventory
    await prisma.inventory.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Inventory deleted successfully' });
  } catch (error) {
    console.error('Failed to delete inventory:', error);
    return NextResponse.json({ error: 'Failed to delete inventory' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  console.log("PUT request received");
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    console.log("Not authorized");
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const { name, isItemScraping } = await req.json();
    // ... (validation)

    const updatedInventory = await prisma.inventory.update({
      where: { id: params.id },
      data: { 
        name,
        isItemScraping: isItemScraping || false,
      },
    });

    return NextResponse.json(updatedInventory);
  } catch (error) {
    console.error('Error updating inventory:', error);
    return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 });
  }
}