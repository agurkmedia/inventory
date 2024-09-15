import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const mappings = await prisma.keywordMapping.findMany({
      where: { userId: session.user.id },
    });
    return NextResponse.json(mappings);
  } catch (error) {
    console.error('Error fetching keyword mappings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { keyword, description } = await req.json();
    const newMapping = await prisma.keywordMapping.create({
      data: {
        keyword,
        description,
        userId: session.user.id,
      },
    });
    return NextResponse.json(newMapping, { status: 201 });
  } catch (error) {
    console.error('Error creating keyword mapping:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
  }

  try {
    const { keyword, description } = await request.json();
    const updatedMapping = await prisma.keywordMapping.updateMany({
      where: { id, userId: session.user.id },
      data: { keyword, description },
    });
    
    if (updatedMapping.count === 0) {
      return NextResponse.json({ error: 'Mapping not found or unauthorized' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Mapping updated successfully' });
  } catch (error) {
    console.error('Failed to update keyword mapping:', error);
    return NextResponse.json({ error: 'Failed to update keyword mapping' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
  }

  try {
    const deletedMapping = await prisma.keywordMapping.deleteMany({
      where: { id, userId: session.user.id },
    });
    
    if (deletedMapping.count === 0) {
      return NextResponse.json({ error: 'Mapping not found or unauthorized' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Keyword mapping deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete keyword mapping:', error);
    return NextResponse.json({ error: 'Failed to delete keyword mapping' }, { status: 500 });
  }
}