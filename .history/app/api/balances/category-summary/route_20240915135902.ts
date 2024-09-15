import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { addDays, addWeeks, addMonths, addYears, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

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
    const month = url.searchParams.get('month');
    const year = url.searchParams.get('year');
    const mode = url.searchParams.get('mode') || 'monthly'; // New parameter to decide between 'monthly' and 'yearly'

    if (!year || (!month && mode === 'monthly')) {
        return NextResponse.json({ error: 'Year and month are required for monthly aggregation' }, { status: 400 });
    }

    try {
        // Define the date range for the selected mode
        let startDate, endDate;

        if (mode === 'yearly') {
            startDate = new Date(parseInt(year), 0, 1); // January 1st of the selected year
            endDate = new Date(parseInt(year), 11, 31); // December 31st of the selected year
        } else {
            startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            endDate = endOfMonth(startDate);
        }

        let totalIncome = 0;
        let totalExpenses = 0;
        let totalReceipts = 0;
        const incomeBreakdown: { [source: string]: number } = {};
        const expenseBreakdown: { [category: string]: number } = {};
        const receiptBreakdown: { [category: string]: number } = {};

        // Fetch incomes for the entire period
        const incomes = await prisma.income.findMany({
            where: {
                userId: session.user?.id,
                OR: [
                    { date: { gte: startDate, lte: endDate }, isRecurring: false },
                    {
                        isRecurring: true,
                        recurrenceInterval: { not: null },
                        OR: [
                            { recurrenceEnd: null },
                            { recurrenceEnd: { gte: startDate } }
                        ]
                    }
                ]
            }
        });

        // Fetch expenses for the entire period
        const expenses = await prisma.expense.findMany({
            where: {
                userId: session.user?.id,
                OR: [
                    { date: { gte: startDate, lte: endDate }, isRecurring: false },
                    {
                        isRecurring: true,
                        recurrenceInterval: { not: null },
                        OR: [
                            { recurrenceEnd: null },
                            { recurrenceEnd: { gte: startDate } }
                        ]
                    }
                ]
            },
            include: { category: true }
        });

        // Fetch receipt items for the entire period
        const receiptItems = await prisma.receiptItem.findMany({
            where: {
                receipt: {
                    userId: session.user?.id,
                },
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: { category: true }
        });

        // Process incomes
        incomes.forEach(income => {
            let incomeDate = new Date(income.date);

            if (!income.isRecurring) {
                if (incomeDate >= startDate && incomeDate <= endDate) {
                    totalIncome += income.amount;
                    incomeBreakdown[income.source] = (incomeBreakdown[income.source] || 0) + income.amount;
                }
            } else {
                while (incomeDate <= endDate) {
                    if (incomeDate >= startDate) {
                        totalIncome += income.amount;
                        incomeBreakdown[income.source] = (incomeBreakdown[income.source] || 0) + income.amount;
                    }
                    incomeDate = getNextRecurrenceDate(incomeDate, income.recurrenceInterval);
                    if (income.recurrenceEnd && incomeDate > income.recurrenceEnd) break;
                }
            }
        });

        // Process expenses
        expenses.forEach(expense => {
            let expenseDate = new Date(expense.date);

            if (!expense.isRecurring) {
                if (expenseDate >= startDate && expenseDate <= endDate) {
                    totalExpenses += expense.amount;
                    const categoryName = expense.category.name;
                    expenseBreakdown[categoryName] = (expenseBreakdown[categoryName] || 0) + expense.amount;
                }
            } else {
                while (expenseDate <= endDate) {
                    if (expenseDate >= startDate) {
                        totalExpenses += expense.amount;
                        const categoryName = expense.category.name;
                        expenseBreakdown[categoryName] = (expenseBreakdown[categoryName] || 0) + expense.amount;
                    }
                    expenseDate = getNextRecurrenceDate(expenseDate, expense.recurrenceInterval);
                    if (expense.recurrenceEnd && expenseDate > expense.recurrenceEnd) break;
                }
            }
        });

        // Process receipt items
        receiptItems.forEach(receiptItem => {
            const categoryName = receiptItem.category.name;
            totalReceipts += receiptItem.totalPrice;
            receiptBreakdown[categoryName] = (receiptBreakdown[categoryName] || 0) + receiptItem.totalPrice;

            // Add receipt items to income or expense based on totalPrice sign
            if (receiptItem.totalPrice > 0) {
                totalIncome += receiptItem.totalPrice;
                incomeBreakdown[categoryName] = (incomeBreakdown[categoryName] || 0) + receiptItem.totalPrice;
            } else {
                const absoluteExpense = Math.abs(receiptItem.totalPrice);
                totalExpenses += absoluteExpense;
                expenseBreakdown[categoryName] = (expenseBreakdown[categoryName] || 0) + absoluteExpense;
            }
        });

        // Create the aggregated data
        const aggregatedData = [{
            period: startDate.toISOString(),
            incomes: {
                total: roundToTwoDecimals(totalIncome),
                breakdown: incomeBreakdown,
            },
            expenses: {
                total: roundToTwoDecimals(totalExpenses),
                breakdown: expenseBreakdown,
            },
            receipts: {
                total: roundToTwoDecimals(totalReceipts),
                breakdown: receiptBreakdown,
            },
            balance: roundToTwoDecimals(totalIncome - totalExpenses),
        }];

        return NextResponse.json({ mode, data: aggregatedData });
    } catch (error) {
        console.error('Failed to fetch financial data:', error);
        return NextResponse.json({ error: 'Failed to fetch financial data' }, { status: 500 });
    }
}
