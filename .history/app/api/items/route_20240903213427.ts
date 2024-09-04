import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const items = await prisma.item.findMany({
      where: { inventory: { userId: session.user.id } },
      include: { inventory: true }
    });

    const formattedItems = items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      inventoryName: item.inventory.name,
      inventoryId: item.inventoryId,
      image: item.image ? item.image.toString('base64') : null, // Convert image to base64 string
      hasImage: !!item.image
    }));

    return NextResponse.json(formattedItems);
  } catch (error) {
    console.error('Failed to fetch items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const quantity = parseInt(formData.get('quantity') as string);
    const inventoryId = formData.get('inventoryId') as string;
    const image = formData.get('image') as File | null;

    // Verify that the inventory belongs to the user
    const inventory = await prisma.inventory.findFirst({
      where: { id: inventoryId, userId: session.user.id }
    });

    if (!inventory) {
      return NextResponse.json({ error: 'Invalid inventory' }, { status: 400 });
    }

    let imageBuffer = null;
    if (image) {
      const arrayBuffer = await image.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    }

    const newItem = await prisma.item.create({
      data: {
        name,
        description,
        quantity,
        image: imageBuffer,
        inventoryId
      },
    });

    console.log('New item created:', newItem);

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Failed to create item:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}