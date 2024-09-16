import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';

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
                endDate = new Date();
                startDate = subMonths(endDate, 12);
                break;
            case 'allTime':
                startDate = new Date(0); // Beginning of time
                endDate = new Date(); // Current date
                break;
            default:
                return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
        }

        // Fetch all receipts within the date range
        const receipts = await prisma.receipt.findMany({
            where: {
                userId: session.user?.id,
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                receiptItems: {
                    include: {
                        category: true
                    }
                }
            }
        });

        let totalIncome = 0;
        let totalExpenses = 0;
        const incomeBreakdown: { [source: string]: number } = {};
        const expenseBreakdown: { [category: string]: number } = {};

        receipts.forEach(receipt => {
            receipt.receiptItems.forEach(item => {
                const categoryName = item.category.name;
                if (item.totalPrice > 0) {
                    totalIncome += item.totalPrice;
                    incomeBreakdown[categoryName] = (incomeBreakdown[categoryName] || 0) + item.totalPrice;
                } else {
                    totalExpenses += Math.abs(item.totalPrice);
                    expenseBreakdown[categoryName] = (expenseBreakdown[categoryName] || 0) + item.totalPrice;
                }
            });
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
