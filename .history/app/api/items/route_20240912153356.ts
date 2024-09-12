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
	const session = await getServerSession(authOptions);
	if (!session) {
		return NextResponse.json({ error: "Not authorized" }, { status: 401 });
	}

	try {
		const { name, inventoryId, price } = await req.json();
		const newItem = await prisma.item.create({
			data: {
				name,
				inventoryId,
				price,
			},
		});
		return NextResponse.json(newItem);
	} catch (error) {
		console.error('Failed to create item:', error);
		return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
	}
}