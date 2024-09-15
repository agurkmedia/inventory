import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const categories = await prisma.expenseCategory.findMany({
      include: {
        _count: {
          select: { receiptItems: true }
        },
        receiptItems: {
          select: { totalPrice: true }
        }
      }
    });

    const formattedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      itemCount: category._count.receiptItems,
      totalCost: category.receiptItems.reduce((sum, item) => sum + item.totalPrice, 0)
    }));

    return NextResponse.json(formattedCategories);
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const { name } = await req.json();
    const category = await prisma.expenseCategory.create({
      data: { name },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Failed to create expense category:', error);
    return NextResponse.json({ error: 'Failed to create expense category' }, { status: 500 });
  }
}