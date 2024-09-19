import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/authOptions";
import pdf from 'pdf-parse';

interface DNBTransaction {
  date: string;
  description: string;
  amount: number;
  balance?: number;
  category: string;
}

let inMemoryTransactions: DNBTransaction[] = [];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const method = formData.get('method') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    let text = '';

    if (method === 'pdf') {
      const data = await pdf(buffer);
      text = data.text;
    } else if (method === 'ocr') {
      // Implement OCR logic here if needed
      return NextResponse.json({ error: 'OCR method not implemented' }, { status: 501 });
    } else {
      return NextResponse.json({ error: 'Invalid import method' }, { status: 400 });
    }

    // Parse the extracted text
    const lines = text.split('\n').slice(1); // Skip the header line
    const transactions: DNBTransaction[] = [];

    let currentDate = '';
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const possibleDate = parts[0];
        if (/^\d{2}\.\d{2}$/.test(possibleDate)) {
          currentDate = possibleDate;
          const description = parts.slice(1, -1).join(' ');
          const amount = parseFloat(parts[parts.length - 1].replace('.', '').replace(',', '.'));
          if (!isNaN(amount)) {
            transactions.push({
              date: currentDate,
              description,
              amount: amount < 0 ? -amount : amount, // Ensure positive amounts
              category: 'Uncategorized'
            });
          }
        }
      }
    }

    // Store transactions in memory
    inMemoryTransactions = [...inMemoryTransactions, ...transactions];

    return NextResponse.json({ 
      message: `PDF imported successfully using ${method} method`,
      transactionsCount: transactions.length
    }, { status: 200 });
  } catch (error) {
    console.error('Error importing PDF:', error);
    return NextResponse.json({ error: 'Error importing PDF' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ transactions: inMemoryTransactions }, { status: 200 });
}