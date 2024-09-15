import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || '');

  if (isNaN(year)) {
    return NextResponse.json({ error: 'Invalid year parameter' }, { status: 400 });
  }

  try {
    // Fetch and aggregate data for the entire year
    const yearlyData = await prisma.balance.findMany({
      where: {
        year: year,
      },
    });

    // Aggregate income and expenses for the year
    const incomes = await prisma.income.findMany({
      where: {
        date: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
    });

    const expenses = await prisma.expense.findMany({
      where: {
        date: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
    });

    // Calculate totals and breakdowns
    const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    const incomeBreakdown = incomes.reduce((acc, income) => {
      acc[income.source] = (acc[income.source] || 0) + income.amount;
      return acc;
    }, {});

    const expenseBreakdown = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {});

    const startingBalance = yearlyData[0]?.startingBalance || 0;
    const remainingBalance = yearlyData[yearlyData.length - 1]?.remainingBalance || 0;

    return NextResponse.json({
      startingBalance,
      remainingBalance,
      incomes: {
        total: totalIncome,
        breakdown: incomeBreakdown,
      },
      expenses: {
        total: totalExpenses,
        breakdown: expenseBreakdown,
      },
      balance: remainingBalance - startingBalance,
    });
  } catch (error) {
    console.error('Failed to fetch yearly summary:', error);
    return NextResponse.json({ error: 'Failed to fetch yearly summary' }, { status: 500 });
  }
}