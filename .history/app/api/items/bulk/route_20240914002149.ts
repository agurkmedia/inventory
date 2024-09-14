// app/api/items/bulk/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const { names, inventoryId } = await req.json();

    if (!names || !Array.isArray(names) || !inventoryId) {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
    }

    // Fetch existing items
    const existingItems = await prisma.item.findMany({
      where: {
        name: { in: names },
        inventoryId,
      },
    });

    const existingItemsMap = new Map(existingItems.map((item) => [item.name, item]));

    // Determine which items need to be created
    const itemsToCreate = names
      .filter((name) => !existingItemsMap.has(name))
      .map((name) => ({
        name,
        inventoryId,
        price: 0,
        quantity: 1,
      }));

    // Create new items
    let newItems = [];
    if (itemsToCreate.length > 0) {
      newItems = await prisma.$transaction(
        itemsToCreate.map((itemData) => prisma.item.create({ data: itemData }))
      );
    }

    // Combine existing and new items
    const allItems = [...existingItems, ...newItems];

    return NextResponse.json(allItems);
  } catch (error: any) {
    console.error('Failed to fetch or create items in bulk:', error);
    return NextResponse.json(
      { error: 'Failed to process items', details: error.message },
      { status: 500 }
    );
  }
}
