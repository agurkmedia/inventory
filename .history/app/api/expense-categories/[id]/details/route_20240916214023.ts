import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  try {
    const categoryId = params.id;

    const category = await prisma.expenseCategory.findUnique({
      where: { id: categoryId },
      include: {
        receiptItems: {
          select: {
            id: true,
            name: true,
            quantity: true,
            totalPrice: true,
            date: true,
            categoryId: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const categoryDetails = {
      id: category.id,
      name: category.name,
      itemCount: category.receiptItems.length,
      totalCost: category.receiptItems.reduce((sum, item) => sum + item.totalPrice, 0),
      items: category.receiptItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.totalPrice,
        date: item.date.toISOString(),
        categoryId: item.categoryId,
      })),
    };

    return NextResponse.json(categoryDetails);
  } catch (error) {
    console.error('Failed to fetch category details:', error);
    return NextResponse.json({ error: 'Failed to fetch category details' }, { status: 500 });
  }
}