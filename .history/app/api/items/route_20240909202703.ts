import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
	console.log("GET /api/items called");
	const session = await getServerSession(authOptions);

	if (!session) {
		console.log("Unauthorized access attempt");
		return NextResponse.json({ error: "Not authorized" }, { status: 401 });
	}

	try {
		const userId = session.user?.id;
		console.log("Fetching items for user:", userId);
		const items = await prisma.item.findMany({
			where: { inventory: { userId } },
			include: { inventory: true }
		});

		console.log("Items fetched:", items.length);
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

		return NextResponse.json({ items: formattedItems });
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