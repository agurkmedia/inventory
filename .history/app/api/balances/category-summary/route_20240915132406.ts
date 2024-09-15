import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, addMonths, format } from 'date-fns';

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
    const mode = url.searchParams.get('mode'); // New parameter to decide between 'monthly' and 'yearly'

    if (!year || (!month && mode === 'monthly')) {
        return NextResponse.json({ error: 'Year and month are required for monthly aggregation' }, { status: 400 });
    }

    try {
        let dateRanges = [];

        // Handle 'yearly' mode
        if (mode === 'yearly') {
            const start = startOfYear(new Date(parseInt(year)));
            for (let i = 0; i < 12; i++) {
                const monthStart = addMonths(start, i);
                dateRanges.push({
                    startDate: startOfMonth(monthStart),
                    endDate: endOfMonth(monthStart),
                });
            }
        } else {
            // Handle 'monthly' mode (default behavior)
            const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
            const endDate = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));
            dateRanges.push({ startDate, endDate });
        }

        let aggregatedData = [];
        for (const { startDate, endDate } of dateRanges) {
            const monthName = format(startDate, 'MMMM yyyy');

            const incomes = await prisma.income.findMany({
                where: {
                    userId: session.user?.id,
                    OR: [
                        { date: { gte: startDate, lte: endDate }, isRecurring: false },
                        {
                            isRecurring: true,
                            recurrenceInterval: { not: null },
                            OR: [{ recurrenceEnd: null }, { recurrenceEnd: { gte: startDate } }],
                        },
                    ],
                },
            });

            const expenses = await prisma.expense.findMany({
                where: {
                    userId: session.user?.id,
                    OR: [
                        { date: { gte: startDate, lte: endDate }, isRecurring: false },
                        {
                            isRecurring: true,
                            recurrenceInterval: { not: null },
                            OR: [{ recurrenceEnd: null }, { recurrenceEnd: { gte: startDate } }],
                        },
                    ],
                },
                include: {
                    category: true,
                },
            });

            const receiptItems = await prisma.receiptItem.findMany({
                where: {
                    receipt: {
                        userId: session.user?.id,
                        date: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                },
                include: {
                    category: true,
                },
            });

            const expenseBreakdown = {};
            const receiptBreakdown = {};

            expenses.forEach((expense) => {
                const categoryName = expense.category.name;
                expenseBreakdown[categoryName] = (expenseBreakdown[categoryName] || 0) + expense.amount;
            });

            receiptItems.forEach((receiptItem) => {
                const categoryName = receiptItem.category.name;
                receiptBreakdown[categoryName] = (receiptBreakdown[categoryName] || 0) + receiptItem.totalPrice;
            });

            let totalIncome = 0;
            incomes.forEach((income) => {
                totalIncome += income.amount;
            });

            const totalExpenses = Object.values(expenseBreakdown).reduce((sum, value) => sum + value, 0);
            const totalReceipts = Object.values(receiptBreakdown).reduce((sum, value) => sum + value, 0);

            aggregatedData.push({
                period: mode === 'yearly' ? monthName : format(startDate, 'MMMM'),
                incomes: {
                    total: roundToTwoDecimals(totalIncome),
                },
                expenses: {
                    total: roundToTwoDecimals(totalExpenses),
                    breakdown: expenseBreakdown,
                },
                receipts: {
                    total: roundToTwoDecimals(totalReceipts),
                    breakdown: receiptBreakdown,
                },
                balance: roundToTwoDecimals(totalIncome - (totalExpenses + totalReceipts)),
            });
        }

        return NextResponse.json({ mode, data: aggregatedData });
    } catch (error) {
        console.error('Failed to fetch financial data:', error);
        return NextResponse.json({ error: 'Failed to fetch financial data' }, { status: 500 });
    }
}
