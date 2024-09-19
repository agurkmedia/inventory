import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import pdf from 'pdf-parse';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const data = await pdf(buffer);

    // Parse the PDF content
    const lines = data.text.split('\n');
    const transactions = [];

    for (const line of lines) {
      // Implement your parsing logic here
      // This is just an example and will need to be adjusted based on your PDF structure
      const match = line.match(/(\d{2}\.\d{2}\.\d{4})\s+(-?\d+\.\d{2})\s+(.+)/);
      if (match) {
        const [, date, amount, text] = match;
        transactions.push({
          date: new Date(date.split('.').reverse().join('-')),
          amount: parseFloat(amount),
          text,
          category: 'Uncategorized', // You may want to implement a categorization logic
        });
      }
    }

    // Save transactions to the database
    for (const transaction of transactions) {
      await prisma.dNBPDF.create({
        data: {
          userId: session.user.id,
          ...transaction,
        },
      });
    }

    return NextResponse.json({ message: 'PDF imported successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error importing PDF:', error);
    return NextResponse.json({ error: 'Error importing PDF' }, { status: 500 });
  }
}