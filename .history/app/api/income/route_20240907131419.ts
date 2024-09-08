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
    const income = await prisma.income.findFirst({
      where: { userId: session.user.id },
    });

    return NextResponse.json(income || { amount: 0 });
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
    const { amount } = await req.json();
    const income = await prisma.income.upsert({
      where: { userId: session.user.id },
      update: { amount },
      create: { amount, userId: session.user.id },
    });

    return NextResponse.json(income, { status: 201 });
  } catch (error) {
    console.error('Failed to update income:', error);
    return NextResponse.json({ error: 'Failed to update income' }, { status: 500 });
  }
}