import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/authOptions";
import pdf from 'pdf-parse';

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
    let processedText = '';

    if (method === 'pdf') {
      const data = await pdf(buffer);
      processedText = data.text;
    } else if (method === 'ocr') {
      // Implement OCR logic here if needed
      return NextResponse.json({ error: 'OCR method not implemented' }, { status: 501 });
    } else {
      return NextResponse.json({ error: 'Invalid import method' }, { status: 400 });
    }

    return NextResponse.json({ 
      message: `PDF processed successfully using ${method} method`,
      processedText
    }, { status: 200 });
  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json({ error: 'Error processing PDF' }, { status: 500 });
  }
}

// Remove or comment out the GET function