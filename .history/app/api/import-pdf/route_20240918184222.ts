import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/authOptions";
import pdf from 'pdf-parse';
import { createWorker } from 'tesseract.js';

interface DNBTransaction {
  date: Date;
  amount: number;
  text: string;
  category: string;
}

let inMemoryTransactions: DNBTransaction[] = [];

async function performOCR(buffer: ArrayBuffer): Promise<string> {
  const worker = await createWorker('eng');
  const { data: { text } } = await worker.recognize(new Uint8Array(buffer));
  await worker.terminate();
  return text;
}

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
      text = await performOCR(buffer);
    } else {
      return NextResponse.json({ error: 'Invalid import method' }, { status: 400 });
    }

    // Parse the extracted text
    const lines = text.split('\n');
    const transactions: DNBTransaction[] = [];

    for (const line of lines) {
      // Implement your parsing logic here
      // This is just an example and will need to be adjusted based on your PDF structure
      const match = line.match(/(\d{2}\.\d{2}\.\d{4})\s+(-?\d+\.\d{2})\s+(.+)/);
      if (match) {
        const [, date, amount, description] = match;
        transactions.push({
          date: new Date(date.split('.').reverse().join('-')),
          amount: parseFloat(amount),
          text: description,
          category: 'Uncategorized', // You may want to implement a categorization logic
        });
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

// New GET method to retrieve the in-memory transactions
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ transactions: inMemoryTransactions }, { status: 200 });
}