import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const month = url.searchParams.get('month');
  const year = url.searchParams.get('year');

  try {
    const expenses = await prisma.expense.findMany({
      where: {
        userId: session.user.id,
        ...(month && year ? {
          date: {
            gte: new Date(`${year}-${month.padStart(2, '0')}-01`),
            lt: new Date(`${year}-${month.padStart(2, '0')}-01`).setMonth(parseInt(month)),
          }
        } : {})
      },
      include: { category: true },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Failed to fetch expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const { amount, categoryId, description, notes, date, isRecurring, recurrenceInterval, recurrenceEnd, status } = await req.json();
    const expense = await prisma.expense.create({
      data: {
        amount,
        categoryId,
        description,
        notes,
        date: new Date(date),
        isRecurring,
        recurrenceInterval,
        recurrenceEnd: recurrenceEnd ? new Date(recurrenceEnd) : null,
        status,
        userId: session.user.id,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Failed to create expense:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}