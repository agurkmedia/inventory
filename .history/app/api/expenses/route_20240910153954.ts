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
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const search = url.searchParams.get('search') || '';

  const skip = (page - 1) * limit;

  try {
    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where: {
          userId: session.user?.id,
          OR: [
            { description: { contains: search, mode: 'insensitive' } },
            { category: { name: { contains: search, mode: 'insensitive' } } },
          ],
        },
        include: { category: true },
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      prisma.expense.count({
        where: {
          userId: session.user?.id,
          OR: [
            { description: { contains: search, mode: 'insensitive' } },
            { category: { name: { contains: search, mode: 'insensitive' } } },
          ],
        },
      }),
    ]);

    return NextResponse.json({ expenses, total });
  } catch (error) {
    console.error('Failed to fetch expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
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
        recurrenceInterval, // No need to change this line, it will handle "QUARTERLY"
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