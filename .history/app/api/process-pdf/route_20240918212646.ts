import { NextRequest, NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createCanvas, loadImage } from 'canvas';
import pdf from 'pdf-parse';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const files = [];

  for (const [key, value] of formData.entries()) {
    if (key.startsWith('file') && value instanceof Blob) {
      files.push(value);
    }
  }

  if (files.length === 0) {
    return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
  }

  try {
    let allParsedTransactions = [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      let extractedText = await extractTextUsingOCR(arrayBuffer);
      const parsedTransactions = parseText(extractedText);
      allParsedTransactions = [...allParsedTransactions, ...parsedTransactions];
    }

    return NextResponse.json({ parsedTransactions: allParsedTransactions });
  } catch (error) {
    console.error('Error processing PDFs:', error);
    return NextResponse.json({ error: 'Failed to process PDFs' }, { status: 500 });
  }
}

async function extractTextUsingOCR(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfData = await pdf(arrayBuffer);
  let extractedText = '';

  for (let pageNum = 1; pageNum <= pdfData.numpages; pageNum++) {
    const canvas = createCanvas(595, 842); // A4 size at 72 dpi
    const ctx = canvas.getContext('2d');
    const image = await loadImage(arrayBuffer);
    ctx.drawImage(image, 0, 0);

    const { data } = await Tesseract.recognize(canvas.toBuffer(), 'nor', {
      logger: (m) => console.log(m),
    });
    extractedText += data.text + '\n';
  }
  return extractedText;
}

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
}

function parseText(text: string): ParsedTransaction[] {
  const lines = text.split('\n');
  const transactions: ParsedTransaction[] = [];

  for (const line of lines) {
    const match = line.match(/(\d{2}\.\d{2}(?:\.\d{2,4})?)\s+(.+?)\s+([-]?\d+(?:,\d{2})?)/);
    if (match) {
      const [, date, description, amount] = match;
      transactions.push({
        date,
        description: description.trim(),
        amount: parseFloat(amount.replace(',', '.')),
      });
    }
  }

  return transactions;
}