// route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import {
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
} from 'date-fns';

// Function to round values to two decimals
function roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const mode = url.searchParams.get('mode') || 'monthly';
    const year = url.searchParams.get('year');
    const month = url.searchParams.get('month');
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');

    try {
        let startDate: Date, endDate: Date;

        switch (mode) {
            case 'monthly':
                if (!year || !month) {
                    return NextResponse.json({ error: 'Year and month are required for monthly mode' }, { status: 400 });
                }
                startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
                endDate = endOfMonth(startDate);
                break;
            case 'yearly':
                if (!year) {
                    return NextResponse.json({ error: 'Year is required for yearly mode' }, { status: 400 });
                }
                startDate = startOfYear(new Date(parseInt(year), 0));
                endDate = endOfYear(startDate);
                break;
            case 'last12months':
                if (!startDateParam || !endDateParam) {
                    return NextResponse.json({ error: 'Start and end dates are required for last12months mode' }, { status: 400 });
                }
                startDate = new Date(startDateParam);
                endDate = new Date(endDateParam);
                break;
            case 'allTime':
                // Find the earliest date among incomes, expenses, and receipts
                const earliestIncome = await prisma.income.findFirst({
                    orderBy: { date: 'asc' },
                    select: { date: true },
                    where: { userId: session.user?.id }
                });
                const earliestExpense = await prisma.expense.findFirst({
                    orderBy: { date: 'asc' },
                    select: { date: true },
                    where: { userId: session.user?.id }
                });
                const earliestReceipt = await prisma.receiptItem.findFirst({
                    orderBy: { date: 'asc' },
                    select: { date: true },
                    where: { receipt: { userId: session.user?.id } }
                });

                startDate = new Date(Math.min(
                    earliestIncome?.date?.getTime() ?? Infinity,
                    earliestExpense?.date?.getTime() ?? Infinity,
                    earliestReceipt?.date?.getTime() ?? Infinity
                ));

                // If no data found, set startDate to a default date
                if (!isFinite(startDate.getTime())) {
                    startDate = new Date(); // Or set to a default start date
                }

                endDate = new Date(); // Current date
                break;
            default:
                return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
        }

        let totalIncome = 0;
        let totalExpenses = 0;
        const incomeBreakdown: { [source: string]: number } = {};
        const expenseBreakdown: { [category: string]: number } = {};

        // Initialize categoryTotals
        const categoryTotals: { [category: string]: { income: number; expense: number; net: number } } = {};

        // Fetch all expense categories
        const categories = await prisma.expenseCategory.findMany({
            where: { userId: session.user?.id }
        });

        // Initialize categoryTotals with all categories set to 0
        categories.forEach(category => {
            categoryTotals[category.name] = { income: 0, expense: 0, net: 0 };
        });

        // Fetch and process expenses
        const expenses = await prisma.expense.findMany({
            where: {
                userId: session.user?.id,
                date: { gte: startDate, lte: endDate }
            },
            include: { category: true }
        });

        expenses.forEach(expense => {
            const category = expense.category.name;
            totalExpenses += expense.amount;
            expenseBreakdown[category] = (expenseBreakdown[category] || 0) + expense.amount;
            if (!categoryTotals[category]) {
                categoryTotals[category] = { income: 0, expense: 0, net: 0 };
            }
            categoryTotals[category].expense += expense.amount;
            categoryTotals[category].net -= expense.amount;
        });

        // Fetch and process incomes
        const incomes = await prisma.income.findMany({
            where: {
                userId: session.user?.id,
                date: { gte: startDate, lte: endDate }
            }
        });

        incomes.forEach(income => {
            const source = income.source;
            totalIncome += income.amount;
            incomeBreakdown[source] = (incomeBreakdown[source] || 0) + income.amount;
            if (!categoryTotals[source]) {
                categoryTotals[source] = { income: 0, expense: 0, net: 0 };
            }
            categoryTotals[source].income += income.amount;
            categoryTotals[source].net += income.amount;
        });

        // Fetch and process receipt items
        const receiptItems = await prisma.receiptItem.findMany({
            where: {
                receipt: {
                    userId: session.user?.id,
                },
                date: { gte: startDate, lte: endDate }
            },
            include: { category: true }
        });

        receiptItems.forEach(item => {
            const category = item.category.name;
            if (item.totalPrice > 0) {
                // Expense
                totalExpenses += item.totalPrice;
                expenseBreakdown[category] = (expenseBreakdown[category] || 0) + item.totalPrice;
                if (!categoryTotals[category]) {
                    categoryTotals[category] = { income: 0, expense: 0, net: 0 };
                }
                categoryTotals[category].expense += item.totalPrice;
                categoryTotals[category].net -= item.totalPrice;
            } else if (item.totalPrice < 0) {
                // Income (refund)
                const incomeAmount = Math.abs(item.totalPrice);
                totalIncome += incomeAmount;
                incomeBreakdown[category] = (incomeBreakdown[category] || 0) + incomeAmount;
                if (!categoryTotals[category]) {
                    categoryTotals[category] = { income: 0, expense: 0, net: 0 };
                }
                categoryTotals[category].income += incomeAmount;
                categoryTotals[category].net += incomeAmount;
            }
        });

        // Calculate total days and months
        let totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (totalDays <= 0) totalDays = 1; // Ensure at least one day

        let totalMonths = ((endDate.getFullYear() - startDate.getFullYear()) * 12) + (endDate.getMonth() - startDate.getMonth()) + 1;
        if (totalMonths <= 0) totalMonths = 1; // Ensure at least one month

        const aggregatedData = [{
            period: startDate.toISOString(),
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            totalDays,
            totalMonths,
            incomes: {
                total: roundToTwoDecimals(totalIncome),
                breakdown: incomeBreakdown,
            },
            expenses: {
                total: roundToTwoDecimals(totalExpenses),
                breakdown: expenseBreakdown,
            },
            netPerCategory: categoryTotals,
            balance: roundToTwoDecimals(totalIncome - totalExpenses),
        }];

        return NextResponse.json({ mode, data: aggregatedData });
    } catch (error) {
        console.error('Failed to fetch financial data:', error);
        return NextResponse.json({ error: 'Failed to fetch financial data' }, { status: 500 });
    }
}
