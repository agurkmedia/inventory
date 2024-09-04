import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const inventories = await prisma.inventory.findMany();
    return NextResponse.json(inventories);
  } catch (error) {
    console.error('Error fetching inventories:', error);
    return NextResponse.json({ error: 'Failed to fetch inventories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const newInventory = await prisma.inventory.create({
      data: { name },
    });

    return NextResponse.json(newInventory);
  } catch (error) {
    console.error('Error creating inventory:', error);
    return NextResponse.json({ error: 'Failed to create inventory' }, { status: 500 });
  }
}