import { NextRequest, NextResponse } from 'next/server';
import { getDocument } from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const method = formData.get('method') as string;
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
      let extractedText = '';

      if (method === 'pdf') {
        extractedText = await extractTextFromPDF(arrayBuffer);
      } else if (method === 'ocr') {
        extractedText = await extractTextUsingOCR(arrayBuffer);
      }

      const parsedTransactions = parseText(extractedText);
      allParsedTransactions = [...allParsedTransactions, ...parsedTransactions];
    }

    return NextResponse.json({ parsedTransactions: allParsedTransactions });
  } catch (error) {
    console.error('Error processing PDFs:', error);
    return NextResponse.json({ error: 'Failed to process PDFs' }, { status: 500 });
  }
}

async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  const loadingTask = getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let extractedText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    extractedText += strings.join(' ') + '\n';
  }
  return extractedText;
}

async function extractTextUsingOCR(arrayBuffer: ArrayBuffer): Promise<string> {
  const loadingTask = getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let extractedText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = new OffscreenCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport }).promise;
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = await Tesseract.recognize(imageData, 'nor', {
      logger: (m) => console.log(m),
    });
    extractedText += data.text + '\n';
  }
  return extractedText;
}

function parseText(text: string): ParsedTransaction[] {
  // Implement your parsing logic here
  // This should be similar to the parseText function in your client-side code
  // Return an array of ParsedTransaction objects
}