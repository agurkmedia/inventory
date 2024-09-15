import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const models = await prisma.csvModel.findMany();
    return NextResponse.json(models);
  } catch (error) {
    console.error('Error fetching CSV models:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}