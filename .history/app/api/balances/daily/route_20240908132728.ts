import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

function getNextRecurrenceDate(date: Date, interval: string | null): Date {
  const newDate = new Date(date);
  switch (interval) {
    case 'DAILY':
      newDate.setDate(newDate.getDate() + 1);
      break;
    case 'WEEKLY':
      newDate.setDate(newDate.getDate() + 7);
      break;
    case 'MONTHLY':
      newDate.setMonth(newDate.getMonth() + 1);
      break;
    case 'QUARTERLY':
      newDate.setMonth(newDate.getMonth() + 3);
      break;
    case 'YEARLY':
      newDate.setFullYear(newDate.getFullYear() + 1);
      break;
  }
  return newDate;
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
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

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
          { date: { gte: startDate, lte: endDate } },
          { 
            recurrenceInterval: { not: null },
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
          { date: { gte: startDate, lte: endDate } },
          { 
            recurrenceInterval: { not: null },
            OR: [
              { recurrenceEnd: null },
              { recurrenceEnd: { gte: startDate } }
            ]
          }
        ]
      }
    });

    // Fetch receipt items for the current month
    const receiptItems = await prisma.receiptItem.findMany({
      where: {
        receipt: {
          userId: session.user?.id,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      },
      include: {
        receipt: true
      }
    });

    const dailyBalances = [];
    let runningBalance = monthBalance.startingBalance;

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateString = d.toISOString().split('T')[0];
      
      let dayIncome = 0;
      let dayExpense = 0;

      // Calculate incomes for the day
      incomes.forEach(income => {
        if (!income.recurrenceInterval) {
          if (income.date.toISOString().startsWith(dateString)) {
            dayIncome += income.amount;
          }
        } else {
          let incomeDate = new Date(income.date);
          while (incomeDate <= d) {
            if (incomeDate.toISOString().startsWith(dateString)) {
              dayIncome += income.amount;
            }
            incomeDate = getNextRecurrenceDate(incomeDate, income.recurrenceInterval);
            if (income.recurrenceEnd && incomeDate > income.recurrenceEnd) break;
          }
        }
      });

      // Calculate expenses for the day
      expenses.forEach(expense => {
        if (!expense.recurrenceInterval) {
          if (expense.date.toISOString().startsWith(dateString)) {
            dayExpense += expense.amount;
          }
        } else {
          let expenseDate = new Date(expense.date);
          while (expenseDate <= d) {
            if (expenseDate.toISOString().startsWith(dateString)) {
              dayExpense += expense.amount;
            }
            expenseDate = getNextRecurrenceDate(expenseDate, expense.recurrenceInterval);
            if (expense.recurrenceEnd && expenseDate > expense.recurrenceEnd) break;
          }
        }
      });

      // Add receipt expenses
      const dayReceiptItems = receiptItems.filter(item => item.receipt.date.toISOString().startsWith(dateString));
      dayExpense += dayReceiptItems.reduce((sum, item) => sum + item.totalPrice, 0);

      runningBalance += dayIncome - dayExpense;

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