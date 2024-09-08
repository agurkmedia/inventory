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
		const inventories = await prisma.inventory.findMany({
			where: { userId },
			include: {
				_count: {
					select: { items: true, itemScrapings: true }
				}
			}
		});

		const inventoriesWithItemCount = inventories.map(inventory => ({
			id: inventory.id,
			name: inventory.name,
			itemCount: inventory._count.items + inventory._count.itemScrapings
		}));

		return NextResponse.json(inventoriesWithItemCount);
	} catch (error) {
		console.error('Error fetching inventories:', error);
		return NextResponse.json({ error: 'Failed to fetch inventories' }, { status: 500 });
	}
}

export async function POST(req: Request) {
	const session = await getServerSession(authOptions);

	if (!session || !session.user) {
		return NextResponse.json({ error: "Not authorized" }, { status: 401 });
	}

	try {
		const { name } = await req.json();
		if (!name) {
			return NextResponse.json({ error: 'Name is required' }, { status: 400 });
		}

		const newInventory = await prisma.inventory.create({
			data: {
				name,
				userId: session.user.id,
			},
		});

		return NextResponse.json(newInventory);
	} catch (error) {
		console.error('Error creating inventory:', error);
		return NextResponse.json({ error: 'Failed to create inventory' }, { status: 500 });
	}
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
	const session = await getServerSession(authOptions);

	if (!session || !session.user) {
		return NextResponse.json({ error: "Not authorized" }, { status: 401 });
	}

	try {
		const { id } = params;
		const { name } = await req.json();

		if (!name) {
			return NextResponse.json({ error: 'Name is required' }, { status: 400 });
		}

		// Check if the inventory belongs to the user
		const inventory = await prisma.inventory.findFirst({
			where: { id, userId: session.user.id },
		});

		if (!inventory) {
			return NextResponse.json({ error: 'Inventory not found or not authorized' }, { status: 404 });
		}

		const updatedInventory = await prisma.inventory.update({
			where: { id },
			data: { name },
		});

		return NextResponse.json(updatedInventory);
	} catch (error) {
		console.error('Error updating inventory:', error);
		return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 });
	}
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
	const session = await getServerSession(authOptions);

	if (!session || !session.user) {
		return NextResponse.json({ error: "Not authorized" }, { status: 401 });
	}

	try {
		const { id } = params;

		// Check if the inventory belongs to the user
		const inventory = await prisma.inventory.findFirst({
			where: { id, userId: session.user.id },
		});

		if (!inventory) {
			return NextResponse.json({ error: 'Inventory not found or not authorized' }, { status: 404 });
		}

		await prisma.inventory.delete({
			where: { id },
		});

		return NextResponse.json({ message: 'Inventory deleted successfully' });
	} catch (error) {
		console.error('Error deleting inventory:', error);
		return NextResponse.json({ error: 'Failed to delete inventory' }, { status: 500 });
	}
}