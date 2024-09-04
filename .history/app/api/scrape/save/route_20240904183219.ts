import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { items, inventoryId } = await req.json();
    console.log(`Saving ${items.length} items to the database`);

    for (const item of items) {
      console.log('Saving item:', item.name);

      try {
        await prisma.itemScraping.create({
          data: {
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            image: item.image ? Buffer.from(item.image, 'base64') : null,
            productCode: item.productCode,
            price: item.price,
            weight: item.weight,
            availability: item.availability,
            manufacturer: item.manufacturer,
            attenuation: item.attenuation,
            flocculation: item.flocculation,
            usageDirections: item.usageDirections,
            storageRecommendations: item.storageRecommendations,
            desinfisering: item.desinfisering,
            contactTime: item.contactTime,
            sourceUrl: item.sourceUrl,
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