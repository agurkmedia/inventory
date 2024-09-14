import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { transactions } = await req.json(); // Receive parsed transactions from the client

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json({ error: 'Invalid transactions format' }, { status: 400 });
    }

    // Collect unique descriptions and dates for batch querying
    const transactionDetails = transactions.map((transaction) => ({
      description: transaction.description.trim(),
      date: new Date(transaction.date).toISOString(), // Convert to full ISO-8601 format
      amount: transaction.amount,
    }));

    // Fetch all existing receipt items that match the given descriptions and dates
    const existingItems = await prisma.receiptItem.findMany({
      where: {
        item: {
          name: { in: transactionDetails.map((t) => t.description) },
        },
        date: { in: transactionDetails.map((t) => t.date) }, // Use ISO-8601 formatted dates
        totalPrice: { in: transactionDetails.map((t) => t.amount) },
      },
      include: {
        item: true,
      },
    });

    // Map existing items to a set for faster lookups
    const existingItemSet = new Set(
      existingItems.map(
        (item) => `${item.item.name}-${new Date(item.date).toISOString()}-${item.totalPrice}`
      )
    );

    // Filter out transactions that already exist in the database
    const filteredTransactions = transactions.filter((transaction) => {
      const key = `${transaction.description.trim()}-${new Date(transaction.date).toISOString()}-$transaction.amount)}`;
      return !existingItemSet.has(key);
    });

    // Return the filtered transactions
    return NextResponse.json(filteredTransactions);
  } catch (error) {
    console.error('Error filtering transactions on the server:', error);
    return NextResponse.json({ error: 'Failed to filter transactions' }, { status: 500 });
  }
}
