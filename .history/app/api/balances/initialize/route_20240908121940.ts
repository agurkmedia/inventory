import { NextResponse } from 'next/server';
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
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1); // Start from current month
    await updateBalances(session.user.id, startDate);

    return NextResponse.json({ message: 'Balances initialized successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to initialize balances:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize balances', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}