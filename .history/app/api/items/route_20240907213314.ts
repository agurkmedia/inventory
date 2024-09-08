import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
	const session = await getServerSession(authOptions);

	if (!session) {
		return NextResponse.json({ error: "Not authorized" }, { status: 401 });
	}

	try {
		const userId = session.user.id;
		const items = await prisma.item.findMany({
			where: { inventory: { userId } },
			include: { inventory: true }
		});

		const itemScrapings = await prisma.itemScraping.findMany({
			where: { inventory: { userId } },
			include: { inventory: true }
		});

		const formattedItems = items.map(item => ({
			id: item.id,
			name: item.name,
			description: item.description,
			quantity: item.quantity,
			price: item.price,
			inventoryName: item.inventory.name,
			inventoryId: item.inventoryId,
			image: item.image ? item.image.toString('base64') : null
		}));

		const formattedItemScrapings = itemScrapings.map(item => ({
			id: item.id,
			name: item.name,
			description: item.description,
			quantity: item.quantity,
			price: item.price,
			inventoryName: item.inventory.name,
			inventoryId: item.inventoryId,
			image: item.image ? item.image.toString('base64') : null
		}));

		return NextResponse.json({ items: formattedItems, itemScrapings: formattedItemScrapings });
	} catch (error) {
		console.error('Failed to fetch items:', error);
		return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
	}
}

export async function POST(req: Request) {
	const session = await getServerSession(authOptions);

	if (!session) {
		return NextResponse.json({ error: "Not authorized" }, { status: 401 });
	}

	try {
		const { name, inventoryId, quantity, price } = await req.json();
		
		// Verify that the inventory belongs to the user
		const inventory = await prisma.inventory.findFirst({
			where: { id: inventoryId, userId: session.user?.id }
		});

		if (!inventory) {
			return NextResponse.json({ error: 'Inventory not found or not authorized' }, { status: 404 });
		}

		const newItem = await prisma.item.create({
			data: {
				name,
				quantity,
				price,
				inventoryId,
			},
		});

		return NextResponse.json(newItem, { status: 201 });
	} catch (error) {
		console.error('Failed to create item:', error);
		return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
	}
}