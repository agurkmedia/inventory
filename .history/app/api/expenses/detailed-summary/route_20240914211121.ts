import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request) {
	const session = await getServerSession(authOptions);
	if (!session || !session.user) {
		return NextResponse.json({ error: "Not authorized" }, { status: 401 });
	}

	const { searchParams } = new URL(req.url);
	const month = parseInt(searchParams.get('month') || '');
	const year = parseInt(searchParams.get('year') || '');

	if (isNaN(month) || isNaN(year)) {
		return NextResponse.json({ error: "Invalid month or year" }, { status: 400 });
	}

	try {
		const startDate = new Date(year, month - 1, 1);
		const endDate = new Date(year, month, 0);

		// Fetch regular expenses
		const regularExpenses = await prisma.expense.findMany({
			where: {
				userId: session.user.id,
				date: { gte: startDate, lte: endDate },
			},
			include: { category: true },
		});

		// Fetch receipt expenses
		const receiptExpenses = await prisma.receiptItem.findMany({
			where: {
				receipt: {
					userId: session.user.id,
					date: { gte: startDate, lte: endDate },
				},
			},
			include: { category: true },
		});

		// Calculate breakdowns
		const regularBreakdown = calculateBreakdown(regularExpenses);
		const receiptBreakdown = calculateBreakdown(receiptExpenses);

		// Combine breakdowns
		const combinedBreakdown = combineCategoryBreakdowns(regularBreakdown, receiptBreakdown);

		return NextResponse.json({
			regularExpenses: {
				total: sum(Object.values(regularBreakdown)),
				breakdown: regularBreakdown,
			},
			receiptExpenses: {
				total: sum(Object.values(receiptBreakdown)),
				breakdown: receiptBreakdown,
			},
			combinedBreakdown,
		});
	} catch (error) {
		console.error('Failed to fetch detailed expense summary:', error);
		return NextResponse.json({ error: 'Failed to fetch detailed expense summary' }, { status: 500 });
	}
}

function calculateBreakdown(expenses: any[]): { [category: string]: number } {
	return expenses.reduce((acc, expense) => {
		const categoryName = expense.category.name;
		acc[categoryName] = (acc[categoryName] || 0) + expense.amount;
		return acc;
	}, {});
}

function combineCategoryBreakdowns(...breakdowns: { [category: string]: number }[]): { [category: string]: number } {
	return breakdowns.reduce((acc, breakdown) => {
		Object.entries(breakdown).forEach(([category, amount]) => {
			acc[category] = (acc[category] || 0) + amount;
		});
		return acc;
	}, {});
}

function sum(numbers: number[]): number {
	return numbers.reduce((a, b) => a + b, 0);
}