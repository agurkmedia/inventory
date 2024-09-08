import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const { transactions } = await req.json();

    for (const transaction of transactions) {
      if (transaction.amount < 0) {
        // It's an expense
        await prisma.expense.create({
          data: {
            amount: Math.abs(transaction.amount),
            description: transaction.description,
            date: new Date(transaction.date),
            userId: session.user.id,
            categoryId: 'default-category-id', // You might want to set a default category or let the user choose later
          },
        });
      } else {
        // It's an income
        await prisma.income.create({
          data: {
            amount: transaction.amount,
            source: transaction.description,
            date: new Date(transaction.date),
            userId: session.user.id,
          },
        });
      }
    }

    return NextResponse.json({ message: 'Transactions saved successfully' });
  } catch (error) {
    console.error('Failed to save transactions:', error);
    return NextResponse.json({ error: 'Failed to save transactions' }, { status: 500 });
  }
}