import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { startOfMonth, endOfMonth } from 'date-fns';

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

  const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
  const endDate = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));

  try {
    const userId = session.user?.id;

    // Fetch incomes for the current month
    const incomes = await prisma.income.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
    });

    // Fetch expenses for the current month
    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        category: true, // Include the category to group expenses by category
      },
    });

    // Fetch receipt items for the current month
    const receiptItems = await prisma.receiptItem.findMany({
      where: {
        receipt: {
          userId,
          date: { gte: startDate, lte: endDate },
        },
      },
      include: {
        category: true, // Include the category for grouping
      },
    });

    // --- Group expenses and receipt items by category ---

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

    // Calculate total incomes
    const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);

    // Calculate total expenses and receipt totals
    const totalExpenses = Object.values(expenseBreakdown).reduce((sum, value) => sum + value, 0);
    const totalReceipts = Object.values(receiptBreakdown).reduce((sum, value) => sum + value, 0);

    // Prepare final data to be returned
    const data = {
      incomes: {
        total: totalIncome,
        breakdown: incomes,
      },
      expenses: {
        total: totalExpenses,
        breakdown: expenseBreakdown,
      },
      receipts: {
        total: totalReceipts,
        breakdown: receiptBreakdown,
      },
      balance: totalIncome - (totalExpenses + totalReceipts), // Final balance for the month
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch financial data:', error);
    return NextResponse.json({ error: 'Failed to fetch financial data' }, { status: 500 });
  }
}
