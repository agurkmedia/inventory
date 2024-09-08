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
    const { name } = await req.json();
    const updatedCategory = await prisma.expenseCategory.update({
      where: { id: params.id },
      data: { name },
    });

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Failed to update expense category:', error);
    return NextResponse.json({ error: 'Failed to update expense category' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    await prisma.expenseCategory.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Expense category deleted successfully' });
  } catch (error) {
    console.error('Failed to delete expense category:', error);
    return NextResponse.json({ error: 'Failed to delete expense category' }, { status: 500 });
  }
}