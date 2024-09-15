import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const categoryId = params.id;

  try {
    const category = await prisma.expenseCategory.findUnique({
      where: { id: categoryId },
      include: {
        receiptItems: {
          include: {
            item: true
          }
        }
      }
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Format the data to match the expected structure
    const formattedCategory = {
      ...category,
      itemCount: category.receiptItems.length,
      totalCost: category.receiptItems.reduce((sum, item) => sum + item.totalPrice, 0),
      items: category.receiptItems.map(receiptItem => ({
        id: receiptItem.id,
        name: receiptItem.item.name,
        quantity: receiptItem.quantity,
        price: receiptItem.totalPrice,
        date: receiptItem.date.toISOString() // Add this line
      }))
    };

    return NextResponse.json(formattedCategory);
  } catch (error) {
    console.error('Error fetching category details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}