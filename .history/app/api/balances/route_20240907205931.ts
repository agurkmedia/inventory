import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const balances = await prisma.balance.findMany({
      where: { userId: session.user.id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return NextResponse.json(balances);
  } catch (error) {
    console.error('Failed to fetch balances:', error);
    return NextResponse.json({ error: 'Failed to fetch balances' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const { month, year, startingBalance } = await req.json();
    const balance = await prisma.balance.create({
      data: {
        month,
        year,
        startingBalance,
        userId: session.user.id,
      },
    });

    return NextResponse.json(balance, { status: 201 });
  } catch (error) {
    console.error('Failed to create balance:', error);
    return NextResponse.json({ error: 'Failed to create balance' }, { status: 500 });
  }
}