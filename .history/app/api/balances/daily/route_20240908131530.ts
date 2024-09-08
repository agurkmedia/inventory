import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

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
        userId: session.user.id,
        month: parseInt(month),
        year: parseInt(year)
      }
    });

    if (!monthBalance) {
      return NextResponse.json({ error: "Balance not found for the specified month" }, { status: 404 });
    }

    const incomes = await prisma.income.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const expenses = await prisma.expense.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const receiptItems = await prisma.receiptItem.findMany({
      where: {
        receipt: {
          userId: session.user.id,
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
      
      const dayIncomes = incomes.filter(income => income.date.toISOString().startsWith(dateString));
      const dayExpenses = expenses.filter(expense => expense.date.toISOString().startsWith(dateString));
      const dayReceiptItems = receiptItems.filter(item => item.receipt.date.toISOString().startsWith(dateString));

      const dayIncome = dayIncomes.reduce((sum, income) => sum + income.amount, 0);
      const dayExpense = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0) +
                         dayReceiptItems.reduce((sum, item) => sum + item.totalPrice, 0);

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