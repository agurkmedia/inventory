import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { addDays, addWeeks, addMonths, addYears, isAfter, isBefore } from 'date-fns';

// Function to get the next recurrence date using date-fns for safer date manipulation
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

// Function to round values to two decimals
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
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

    // Process each day in the month
    for (let d = new Date(startDate); isBefore(d, addDays(endDate, 1)); d = addDays(d, 1)) {
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
            if (income.recurrenceEnd && isAfter(incomeDate, income.recurrenceEnd)) break;
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
              
              // Debug logging for different recurrence intervals
              if (expense.recurrenceInterval === 'MONTHLY') {
                console.log(`Monthly Expense applied on ${dateString} - Amount: ${expense.amount}`);
              }
              if (expense.recurrenceInterval === 'QUARTERLY') {
                console.log(`Quarterly Expense applied on ${dateString} - Amount: ${expense.amount}`);
              }
            }
            expenseDate = getNextRecurrenceDate(expenseDate, expense.recurrenceInterval);
            if (expense.recurrenceEnd && isAfter(expenseDate, expense.recurrenceEnd)) break;
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
