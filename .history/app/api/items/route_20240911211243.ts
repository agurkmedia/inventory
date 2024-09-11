import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
	const session = await getServerSession(authOptions);
	if (!session || !session.user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const items = await prisma.item.findMany({
			where: { userId: session.user.id },  // Filter items by userId
		});
		return NextResponse.json({ items });
	} catch (error) {
		console.error('Failed to fetch items:', error);
		return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
	}
}

export async function POST(request: Request) {
	const session = await getServerSession(authOptions);
	if (!session || !session.user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { name, inventoryId, quantity, price } = await request.json();
		console.log('POST /api/items called', { name, inventoryId, quantity, price });

		const newItem = await prisma.item.create({
			data: {
				name,
				inventoryId,
				quantity: parseInt(quantity),
				price: parseFloat(price),
				userId: session.user.id,  // Add this line to associate the item with the user
			},
		});

		return NextResponse.json(newItem, { status: 201 });
	} catch (error) {
		console.error('Failed to create item:', error);
		return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
	}
}