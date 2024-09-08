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
    const { month, year, startingBalance, remainingBalance } = await req.json();
    const updatedBalance = await prisma.balance.update({
      where: { id: params.id },
      data: {
        month,
        year,
        startingBalance,
        remainingBalance,
      },
    });

    return NextResponse.json(updatedBalance);
  } catch (error) {
    console.error('Failed to update balance:', error);
    return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    await prisma.balance.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Balance deleted successfully' });
  } catch (error) {
    console.error('Failed to delete balance:', error);
    return NextResponse.json({ error: 'Failed to delete balance' }, { status: 500 });
  }
}