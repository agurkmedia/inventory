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
    const categories = await prisma.expenseCategory.findMany({
      where: { userId: session.user.id },
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
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name } = await req.json();
    const category = await prisma.expenseCategory.create({
      data: { 
        name,
        userId: session.user.id  // Add the user ID when creating a new category
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Failed to create expense category:', error);
    return NextResponse.json({ error: 'Failed to create expense category' }, { status: 500 });
  }
}