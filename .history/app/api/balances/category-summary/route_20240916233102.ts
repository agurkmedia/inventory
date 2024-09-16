import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { addDays, addWeeks, addMonths, addYears, startOfMonth, endOfMonth, startOfYear, endOfYear, subYears } from 'date-fns';

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
                
                // If no data found, set startDate to current date to avoid invalid date
                if (!isFinite(startDate.getTime())) {
                    startDate = new Date();
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

        // Fetch all expense categories
        const categories = await prisma.expenseCategory.findMany({
            where: { userId: session.user?.id }
        });

        // Initialize expenseBreakdown with all categories set to 0
        categories.forEach(category => {
            expenseBreakdown[category.name] = 0;
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
            totalExpenses += expense.amount;
            expenseBreakdown[expense.category.name] += expense.amount;
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
            if (item.totalPrice < 0) {
                totalExpenses += Math.abs(item.totalPrice);
                expenseBreakdown[item.category.name] += Math.abs(item.totalPrice);
            } else {
                totalIncome += item.totalPrice;
                incomeBreakdown[item.category.name] = (incomeBreakdown[item.category.name] || 0) + item.totalPrice;
            }
        });

        // Calculate total days and months
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalMonths = Math.ceil(totalDays / 30.44); // Average days in a month

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
            balance: roundToTwoDecimals(totalIncome - totalExpenses),
        }];

        return NextResponse.json({ mode, data: aggregatedData });
    } catch (error) {
        console.error('Failed to fetch financial data:', error);
        return NextResponse.json({ error: 'Failed to fetch financial data' }, { status: 500 });
    }
}
