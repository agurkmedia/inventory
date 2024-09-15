import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const categoryId = params.id;

  try {
    const category = await prisma.expenseCategory.findUnique({
      where: { id: categoryId },
      include: {
        items: {
          select: {
            id: true,
            name: true,
            quantity: true,
            price: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching category details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}