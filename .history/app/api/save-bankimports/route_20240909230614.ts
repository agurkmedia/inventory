import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const { bankImports } = await req.json();

    for (const bankImport of bankImports) {
      if (bankImport.amount < 0) {
        // It's an expense
        await prisma.expense.create({
          data: {
            amount: Math.abs(bankImport.amount),
            description: bankImport.description,
            date: new Date(bankImport.date),
            userId: session.user.id,
            categoryId: 'default-category-id', // You might want to set a default category or let the user choose later