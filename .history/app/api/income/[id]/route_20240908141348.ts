import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from authOptions;

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const { source, amount, date, recurrenceInterval, recurrenceEnd } = await req.json();
    const updatedIncome = await prisma.income.update({
      where: { id: params.id },
      data: {
        source,
        amount,
        date: new Date(date),
        recurrenceInterval,
        recurrenceEnd: recurrenceEnd ? new Date(recurrenceEnd) : null,
      },
    });

    return NextResponse.json(updatedIncome);
  } catch (error) {
    console.error('Failed to update income:', error);
    return NextResponse.json({ error: 'Failed to update income' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    await prisma.income.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Income deleted successfully' });
  } catch (error) {
    console.error('Failed to delete income:', error);
    return NextResponse.json({ error: 'Failed to delete income' }, { status: 500 });
  }
}
