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
    let dateFilter = {};
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999); // Last day of the month
      dateFilter = {
        date: {
          gte: startDate,
          lte: endDate,
        }
      };
    }

    const income = await prisma.income.findMany({
      where: {
        userId: session.user?.id,
        ...dateFilter
      },
    });

    return NextResponse.json(income);
  } catch (error) {
    console.error('Failed to fetch income:', error);
    return NextResponse.json({ error: 'Failed to fetch income' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const { source, amount, date, recurrenceInterval, recurrenceEnd } = await req.json();
    const income = await prisma.income.create({
      data: {
        source,
        amount,
        date: new Date(date),
        recurrenceInterval: recurrenceInterval || null,
        recurrenceEnd: recurrenceEnd ? new Date(recurrenceEnd) : null,
        userId: session.user?.id,
      },
    });

    return NextResponse.json(income, { status: 201 });
  } catch (error) {
    console.error('Failed to create income:', error);
    return NextResponse.json({ error: 'Failed to create income' }, { status: 500 });
  }
}