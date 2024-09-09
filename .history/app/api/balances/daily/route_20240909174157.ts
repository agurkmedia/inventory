import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { addDays, addWeeks, addMonths, endOfMonth, startOfMonth, isBefore } from 'date-fns';

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
      return addDays(date, 365);
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
    const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const endDate = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));

    const monthBalance = await prisma.balance.findFirst({
      where: {
        userId: session.user?.id,
        month: parseInt(month),
        year: parseInt(year)
      }
    });

    if (!monthBalance) {
      return NextResponse.json({ error: "Balance not found for the specified month" }, { status: 404 });
    }

    const incomes = await prisma.income.findMany({
      where: {
        userId: session.user?.id,
        OR: [
          { date: { gte: startDate, lte: endDate } }, // One-time income
          { 
            recurrenceInterval: { not: null }, // Recurring income
            OR: [
              { recurrenceEnd: null },
              { recurrenceEnd: { gte: startDate } }
            ]
          }
        ]
      }
    });

    const expenses = await prisma.expense.findMany({
      where: {
        userId: session.user?.id,
        OR: [
          { date: { gte: startDate, lte: endDate } }, // One-time expenses
          { 
            recurrenceInterval: { not: null }, // Recurring expenses
            OR: [
              { recurrenceEnd: null },
              { recurrenceEnd: { gte: startDate } }
            ]
          }
        ]
      }
    });

    const receiptItems = await prisma.receiptItem.findMany({
      where: {
        receipt: {
          userId: session.user?.id,
          date: { gte: startDate, lte: endDate }
        }
      },
      include: { receipt: true }
    });

    const dailyBalances = [];
    let runningBalance = monthBalance.startingBalance;

    // Process each day in the month
    for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
      const dateString = d.toISOString().split('T')[0];

      let dayIncome = 0;
      let dayExpense = 0;

      // Calculate daily income
      incomes.forEach(income => {
        if (!income.recurrenceInterval) {
          if (income.date.toISOString().startsWith(dateString)) {
            dayIncome += income.amount;
          }
        } else {
          let incomeDate = new Date(income.date);
          while (isBefore(incomeDate, addDays(d, 1))) {
            if (incomeDate.toISOString().startsWith(dateString)) {
              dayIncome += income.amount;
            }
            incomeDate = getNextRecurrenceDate(incomeDate, income.recurrenceInterval);
            if (income.recurrenceEnd && isBefore(income.recurrenceEnd, incomeDate)) break;
          }
        }
      });

      // Calculate daily expenses
      expenses.forEach(expense => {
        if (!expense.recurrenceInterval) {
          if (expense.date.toISOString().startsWith(dateString)) {
            dayExpense += expense.amount;
          }
        } else {
          let expenseDate = new Date(expense.date);
          while (isBefore(expenseDate, addDays(d, 1))) {
            if (expenseDate.toISOString().startsWith(dateString)) {
              dayExpense += expense.amount;
            }
            expenseDate = getNextRecurrenceDate(expenseDate, expense.recurrenceInterval);
            if (expense.recurrenceEnd && isBefore(expense.recurrenceEnd, expenseDate)) break;
          }
        }
      });

      // Calculate receipt expenses
      const dayReceiptItems = receiptItems.filter(item => item.receipt.date.toISOString().startsWith(dateString));
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
        remainingBalance: runningBalance
      });
    }

    return NextResponse.json({ monthBalance, dailyBalances });
  } catch (error) {
    console.error('Failed to fetch daily balances:', error);
    return NextResponse.json({ error: 'Failed to fetch daily balances' }, { status: 500 });
  }
}
