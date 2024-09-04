import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { items } = await req.json();

    for (const item of items) {
      const imageBuffer = await fetch(item.imageUrl).then(res => res.arrayBuffer()).then(buf => Buffer.from(buf));

      await prisma.itemScraping.create({
        data: {
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          image: imageBuffer,
          inventoryId: 'your-inventory-id', // Replace with the actual inventory ID
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
        },
      });
    }

    return NextResponse.json({ message: 'Items saved successfully' });
  } catch (error) {
    console.error('Error saving items:', error);
    return NextResponse.json({ error: 'Failed to save items' }, { status: 500 });
  }
}