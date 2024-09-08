import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { updateBalances } from '@/utils/balanceUpdater';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const currentDate = new Date();
    await updateBalances(session.user.id, currentDate);

    return NextResponse.json({ message: 'Balances initialized successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to initialize balances:', error);
    return NextResponse.json({ error: 'Failed to initialize balances' }, { status: 500 });
  }
}