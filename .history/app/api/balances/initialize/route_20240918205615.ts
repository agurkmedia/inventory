import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { updateBalances } from '@/app/utils/balanceUpdater';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear() - 10, 0, 1); // 10 years ago, January 1st
    const endDate = new Date(currentDate.getFullYear() + 2, 11, 31); // 2 years in the future, December 31st

    await updateBalances(session.user.id, currentDate, startDate, endDate);

    return NextResponse.json({ message: 'Balances initialized successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to initialize balances:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize balances', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}