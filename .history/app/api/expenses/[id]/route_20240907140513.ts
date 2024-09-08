import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const { amount, categoryId, description, notes, date, isRecurring, recurrenceInterval, recurrenceEnd, status } = await req.json();
    const updatedExpense = await prisma.expense.update({
      where: { id: params.id },
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
      },
    });

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error('Failed to update expense:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    await prisma.expense.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Failed to delete expense:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}