import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { addDays, addWeeks, addMonths, addYears, endOfMonth, startOfMonth, isBefore, isEqual } from 'date-fns';

function getNextRecurrenceDate(date: Date, interval: string | null): Date {
  switch (interval) {
    case 'DAILY':
      return addDays(date, 1);
    case 'WEEKLY':
      return addWeeks(date, 1);
    case 'MONTHLY':
      return addMonths(date, 1);
    case 'QUARTERLY':
      return addMonths(date, 3);
    case 'YEARLY':
      return addYears(date, 1);
    default:
      return date;
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const month = url.searchParams.get('month');
  const year = url.searchParams.get('year');

  if (!month || !year) {
    return NextResponse.json({ error: "Month and year are required" }, { status: 400 });
  }

  try {
    const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));  // January 1st
    const endDate = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));  // January 31st

    const monthBalance = await prisma.balance.findFirst({
      where: {
        userId: session.user?.id,
        month: parseInt(month),
        year: parseInt(year),
      },
    });

    if (!monthBalance) {
      return NextResponse.json({ error: "Balance not found for the specified month" }, { status: 404 });
    }

    // Fetch incomes, expenses, and receipts with explicit date filters
    const incomes = await prisma.income.findMany({
      where: {
        userId: session.user?.id,
        AND: [
          { date: { gte: startDate } },  // Greater than or equal to startDate (January 1st)
          { date: { lte: endDate } },    // Less than or equal to endDate (January 31st)
        ],
      },
    });

    const expenses = await prisma.expense.findMany({
      where: {
        userId: session.user?.id,
        AND: [
          { date: { gte: startDate } },  // Same for expenses
          { date: { lte: endDate } }, 
        ],
      },
    });

    const receiptItems = await prisma.receiptItem.findMany({
      where: {
        receipt: {
          userId: session.user?.id,
          date: { gte: startDate, lte: endDate },  // Filter to current month
        },
      },
      include: { receipt: true },
    });

    const dailyBalances = [];
    let runningBalance = monthBalance.startingBalance;

    // Ensure loop strictly starts from January 1st and excludes any December data
    for (let d = new Date(startDate); isBefore(d, addDays(endDate, 1)); d = addDays(d, 1)) {
      const dateString = d.toISOString().split('T')[0];

      // Explicitly skip any day before startDate (e.g., December 31)
      if (isBefore(d, startDate)) {
        continue;
      }

      let dayIncome = 0;
      let dayExpense = 0;

      // Calculate daily income
      incomes.forEach((income) => {
        if (income.date.toISOString().split('T')[0] === dateString) {
          dayIncome += income.amount;
        }
      });

      // Calculate daily expenses
      expenses.forEach((expense) => {
        if (expense.date.toISOString().split('T')[0] === dateString) {
          dayExpense += expense.amount;
        }
      });

      // Calculate receipt expenses
      const dayReceiptItems = receiptItems.filter((item) =>
        item.receipt.date.toISOString().split('T')[0] === dateString
      );
      const receiptExpense = dayReceiptItems.reduce((sum, item) => sum + item.totalPrice, 0);
      dayExpense += receiptExpense;

      // Update the running balance
      runningBalance += dayIncome - dayExpense;

      // Push daily balance
      dailyBalances.push({
        date: dateString,
        startingBalance: runningBalance - dayIncome + dayExpense,
        income: dayIncome,
        expenses: dayExpense,
        remainingBalance: runningBalance,
      });
    }

    // Explicitly filter out any dates before the startDate (as an additional safeguard)
    const filteredBalances = dailyBalances.filter((balance) => !isBefore(new Date(balance.date), startDate));

    return NextResponse.json({ monthBalance, dailyBalances: filteredBalances });
  } catch (error) {
    console.error("Failed to fetch daily balances:", error);
    return NextResponse.json({ error: "Failed to fetch daily balances" }, { status: 500 });
  }
}
