import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const keywordMappings = await prisma.keywordMapping.findMany({
      where: { userId: session.user.id },
    });
    return NextResponse.json(keywordMappings);
  } catch (error) {
    console.error('Failed to fetch keyword mappings:', error);
    return NextResponse.json({ error: 'Failed to fetch keyword mappings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { keyword, description } = await request.json();
    const newMapping = await prisma.keywordMapping.create({
      data: {
        keyword,
        description,
        user: {
          connect: { email: session.user.email }
        }
      },
    });
    return NextResponse.json(newMapping);
  } catch (error) {
    console.error('Failed to create keyword mapping:', error);
    return NextResponse.json({ error: 'Failed to create keyword mapping' }, { status: 500 });
  }
}