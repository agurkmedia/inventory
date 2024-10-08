import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { addDays, addWeeks, addMonths, addYears, isBefore, isAfter, startOfMonth, endOfMonth } from 'date-fns';

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
    const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1)); // First day of the month
    const endDate = endOfMonth(new Date(parseInt(year), parseInt(month) - 1)); // Last day of the month

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

    // Fetch incomes for the current month (including recurring)
    const incomes = await prisma.income.findMany({
      where: {
        userId: session.user?.id,
        OR: [
          { date: { gte: startDate, lte: endDate }, isRecurring: false }, // One-time income
          { 
            isRecurring: true, // Recurring income
            recurrenceInterval: { not: null },
            OR: [
              { recurrenceEnd: null },
              { recurrenceEnd: { gte: startDate } }
            ]
          }
        ]
      }
    });

    // Fetch expenses for the current month (including recurring) with category
    const expenses = await prisma.expense.findMany({
      where: {
        userId: session.user?.id,
        OR: [
          { date: { gte: startDate, lte: endDate }, isRecurring: false }, // One-time expenses
          { 
            isRecurring: true, // Recurring expenses
            recurrenceInterval: { not: null },
            OR: [
              { recurrenceEnd: null },
              { recurrenceEnd: { gte: startDate } }
            ]
          }
        ]
      },
      include: {
        category: true, // Include category for grouping
      }
    });

    // Fetch receipt items for the current month with category
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
        category: true, // Include category for grouping
      }
    });

    // ---- Group expenses and receipt items by category ----
    const expenseBreakdown: { [category: string]: number } = {};
    const receiptBreakdown: { [category: string]: number } = {};

    // Group and sum expenses by category
    expenses.forEach((expense) => {
      const categoryName = expense.category.name;
      if (!expenseBreakdown[categoryName]) {
        expenseBreakdown[categoryName] = 0;
      }
      expenseBreakdown[categoryName] += expense.amount;
    });

    // Group and sum receipt items by category
    receiptItems.forEach((receiptItem) => {
      const categoryName = receiptItem.category.name;
      if (!receiptBreakdown[categoryName]) {
        receiptBreakdown[categoryName] = 0;
      }
      receiptBreakdown[categoryName] += receiptItem.totalPrice;
    });

    // Calculate total incomes, expenses, and receipts
    const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = Object.values(expenseBreakdown).reduce((sum, value) => sum + value, 0);
    const totalReceipts = Object.values(receiptBreakdown).reduce((sum, value) => sum + value, 0);

    // Prepare final data to be returned
    const data = {
      incomes: {
        total: roundToTwoDecimals(totalIncome),
        breakdown: incomes,
      },
      expenses: {
        total: roundToTwoDecimals(totalExpenses),
        breakdown: expenseBreakdown,
      },
      receipts: {
        total: roundToTwoDecimals(totalReceipts),
        breakdown: receiptBreakdown,
      },
      balance: roundToTwoDecimals(totalIncome - (totalExpenses + totalReceipts)), // Final balance for the month
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch financial data:', error);
    return NextResponse.json({ error: 'Failed to fetch financial data' }, { status: 500 });
  }
}
