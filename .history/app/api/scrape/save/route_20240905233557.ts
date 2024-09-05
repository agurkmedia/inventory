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
    const { items, inventoryId } = await req.json();
    console.log(`Saving ${items.length} items to the database`);

    // Verify that the inventory belongs to the user
    const inventory = await prisma.inventory.findFirst({
      where: { id: inventoryId, userId: session.user.id }
    });

    if (!inventory) {
      return NextResponse.json({ error: 'Invalid inventory' }, { status: 400 });
    }

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
            inventoryId: inventoryId,
          },
        });
        console.log('Item saved successfully:', item.name);
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