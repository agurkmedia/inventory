import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { items, inventoryId } = await req.json();
    console.log(`Saving ${items.length} items to the database`);

    for (const item of items) {
      console.log('Saving item:', item);

      // Ensure all necessary properties are defined
      const {
        name = '',
        description = '',
        quantity = 0,
        price = 0,
        sourceUrl = '',
      } = item;

      try {
        await prisma.itemScraping.create({
          data: {
            name: name.toString(),
            description: description.toString(),
            quantity: parseInt(quantity, 10),
            price: parseFloat(price),
            sourceUrl: sourceUrl.toString(),
            inventory: {
              connect: { id: inventoryId },
            },
          },
        });
      } catch (error) {
        console.error('Error saving item:', error);
      }
    }

    return NextResponse.json({ message: 'Items saved successfully' });
  } catch (error) {
    console.error('Error saving items:', error);
    return NextResponse.json({ error: 'Failed to save items' }, { status: 500 });
  }
}