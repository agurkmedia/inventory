import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const item = await prisma.item.findUnique({
      where: { id: params.id },
      select: { image: true, inventory: { select: { userId: true } } }
    });

    if (!item || item.inventory.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (!item.image) {
      return NextResponse.json({ error: 'No image' }, { status: 404 });
    }

    return new NextResponse(item.image, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': item.image.length.toString(),
      },
    });
  } catch (error) {
    console.error('Failed to fetch item image:', error);
    return NextResponse.json({ error: 'Failed to fetch item image' }, { status: 500 });
  }
}