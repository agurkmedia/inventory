import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { parse } from 'csv-parse/sync';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileContent = await file.text();
    const records = parse(fileContent, {
      delimiter: ';',
      columns: true,
      skip_empty_lines: true,
    });

    const transactions = records.map((record: any) => ({
      date: record['Dato'],
      description: record['Forklaring'],
      amount: -parseFloat(record['Ut fra konto'] || '0') + parseFloat(record['Inn på konto'] || '0'),
    }));

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Failed to parse CSV:', error);
    return NextResponse.json({ error: 'Failed to parse CSV' }, { status: 500 });
  }
}