import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { updateBalances } from '@/app/utils/balanceUpdater';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const receipt = await prisma.receipt.findUnique({
      where: { 
        id: params.id,
        userId: session.user?.id,
      },
      include: {
        receiptItems: {
          include: {
            item: true,
            category: true,
          },
        },
      },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    const formattedReceipt = {
      ...receipt,
      items: receipt.receiptItems.map(item => ({
        id: item.id,
        itemName: item.item.name,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        categoryName: item.category.name,
      })),
    };

    return NextResponse.json(formattedReceipt);
  } catch (error) {
    console.error('Failed to fetch receipt:', error);
    return NextResponse.json({ error: 'Failed to fetch receipt' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const { storeName, totalAmount, date } = await req.json();

    // Verify that the receipt belongs to the user
    const existingReceipt = await prisma.receipt.findUnique({
      where: { 
        id: params.id,
        userId: session.user?.id,
      },
    });

    if (!existingReceipt) {
      return NextResponse.json({ error: "Receipt not found or not authorized" }, { status: 404 });
    }

    const updatedReceipt = await prisma.receipt.update({
      where: { id: params.id },
      data: {
        storeName,
        totalAmount,
        date: new Date(date),
      },
    });

    // Update balances starting from the month of this updated receipt
    await updateBalances(session.user?.id as string, new Date(date));

    return NextResponse.json(updatedReceipt);
  } catch (error) {
    console.error('Failed to update receipt:', error);
    return NextResponse.json({ error: 'Failed to update receipt' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    // Verify that the receipt belongs to the user
    const receipt = await prisma.receipt.findUnique({
      where: { 
        id: params.id,
        userId: session.user?.id,
      },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found or not authorized" }, { status: 404 });
    }

    // Delete the receipt
    await prisma.receipt.delete({
      where: { id: params.id },
    });

    // Update balances starting from the month of the deleted receipt
    /await updateBalances(session.user?.id as string, receipt.date);

    return NextResponse.json({ message: 'Receipt deleted successfully' });
  } catch (error) {
    console.error('Failed to delete receipt:', error);
    return NextResponse.json({ error: 'Failed to delete receipt' }, { status: 500 });
  }
}