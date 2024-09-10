import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = parseInt(searchParams.get('month') || '');
  const year = parseInt(searchParams.get('year') || '');

  if (isNaN(month) || isNaN(year)) {
    return NextResponse.json({ error: 'Invalid month or year' }, { status: 400 });
  }

  try {
    // Fetch and aggregate data from your database
    // This is a placeholder - you'll need to implement the actual data fetching logic
    const categorySummary = {
      expenses: { /* Fetch from database */ },
      incomes: { /* Fetch from database */ },
      receipts: { /* Fetch from database */ }
    };

    return NextResponse.json(categorySummary);
  } catch (error) {
    console.error('Error fetching category summary:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}