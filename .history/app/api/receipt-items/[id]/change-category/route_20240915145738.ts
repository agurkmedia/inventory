import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const itemId = params.id;

  try {
    const { newCategoryId } = await request.json();

    const updatedItem = await prisma.receiptItem.update({
      where: { id: itemId },
      data: { categoryId: newCategoryId },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error updating receipt item category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}