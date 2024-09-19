import { NextResponse } from 'next/server';
import formidable from 'formidable';
import fs from 'fs';
import { createWorker } from 'tesseract.js';
import os from 'os';
import pdf2img from 'pdf-img-convert';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const method = formData.get('method') as string;
    const files = formData.getAll('file') as File[];

    console.log('Processing method:', method);
    console.log('Number of files:', files.length);

    let allParsedTransactions: ParsedTransaction[] = [];

    // ... Include your processing logic here, adapted for Edge Runtime if necessary ...

    return NextResponse.json({ transactions: allParsedTransactions });
  } catch (error: any) {
    console.error('Error processing PDF:', error);
    return NextResponse.json({ error: `Error processing PDF: ${error.message}` }, { status: 500 });
  }
}