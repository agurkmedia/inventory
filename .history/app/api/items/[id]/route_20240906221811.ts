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
    const item = await prisma.item.findUnique({
      where: { id: params.id },
      include: { inventory: true }
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...item,
      image: item.image ? item.image.toString('base64') : null
    });
  } catch (error) {
    console.error('Failed to fetch item:', error);
    return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const quantity = parseInt(formData.get('quantity') as string);
    const price = parseFloat(formData.get('price') as string);
    const inventoryId = formData.get('inventoryId') as string;
    const image = formData.get('image') as File | null;

    let imageBuffer = null;
    if (image) {
      const arrayBuffer = await image.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    }

    const updatedItem = await prisma.item.update({
      where: { id: params.id },
      data: {
        name,
        description,
        quantity,
        price,
        inventoryId,
        ...(imageBuffer && { image: imageBuffer }),
        updatedAt: new Date(), // Explicitly set the updatedAt field
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Failed to update item:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}