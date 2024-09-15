import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const models = await prisma.cSVModel.findMany();
    return NextResponse.json(models);
  } catch (error) {
    console.error('Error fetching CSV models:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, columnMapping, isDefault } = await request.json();
    
    if (isDefault) {
      // If the new model is set as default, unset the current default
      await prisma.cSVModel.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const newModel = await prisma.cSVModel.create({
      data: {
        name,
        columnMapping,
        isDefault,
      },
    });

    return NextResponse.json(newModel, { status: 201 });
  } catch (error) {
    console.error('Error creating CSV model:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}