// app/api/items/bulk/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

// Add this interface to define the structure of an Item
interface Item {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price: number;
  unitPrice: number;
  image: Buffer | null;
  inventoryId: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const { names, inventoryId } = await req.json();

    const existingItems = await prisma.item.findMany({
      where: {
        name: { in: names },
        inventoryId: inventoryId,
      },
    });

    const existingNames = new Set(existingItems.map(item => item.name));

    const itemsToCreate = names
      .filter(name => !existingNames.has(name))
      .map(name => ({
        name,
        inventoryId,
      }));

    let newItems: Item[] = [];  // Explicitly type newItems as Item[]
    if (itemsToCreate.length > 0) {
      newItems = await prisma.$transaction(
        itemsToCreate.map((itemData) => prisma.item.create({ data: itemData }))
      );
    }

    return NextResponse.json([...existingItems, ...newItems]);
  } catch (error) {
    console.error('Failed to fetch or create items:', error);
    return NextResponse.json({ error: 'Failed to fetch or create items' }, { status: 500 });
  }
}
