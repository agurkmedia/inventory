import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request) {
	const session = await getServerSession(authOptions);

	if (!session) {
		return NextResponse.json({ error: "Not authorized" }, { status: 401 });
	}

	try {
		// First, get all inventories belonging to the user
		const userInventories = await prisma.inventory.findMany({
			where: { userId: session.user?.id },
			select: { id: true }
		});

		// Then, find all items in these inventories
		const items = await prisma.item.findMany({
			where: {
				inventoryId: {
					in: userInventories.map(inv => inv.id)
				}
			},
			include: {
				inventory: true
			}
		});

		return NextResponse.json(items);
	} catch (error) {
		console.error('Failed to fetch items:', error);
		return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
	}
}

export async function POST(req: Request) {
	console.log("POST /api/items called");
	const session = await getServerSession(authOptions);

	if (!session) {
		console.log("Unauthorized access attempt");
		return NextResponse.json({ error: "Not authorized" }, { status: 401 });
	}

	try {
		const formData = await req.formData();
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const quantity = parseInt(formData.get('quantity') as string);
		const price = parseFloat(formData.get('price') as string);
		const inventoryId = formData.get('inventoryId') as string;

		console.log("Received item data:", { name, description, quantity, price, inventoryId });
		
		if (isNaN(quantity) || isNaN(price)) {
			throw new Error('Invalid quantity or price');
		}

		// Verify that the inventory belongs to the user
		const inventory = await prisma.inventory.findFirst({
			where: { id: inventoryId, userId: session.user?.id }
		});

		if (!inventory) {
			console.log("Inventory not found or not authorized");
			return NextResponse.json({ error: 'Inventory not found or not authorized' }, { status: 404 });
		}

		const newItem = await prisma.item.create({
			data: {
				name,
				description,
				quantity,
				price,
				inventoryId,
			},
		});

		console.log("New item created:", newItem);
		return NextResponse.json(newItem, { status: 201 });
	} catch (error) {
		console.error('Failed to create item:', error);
		return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
	}
}