import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const bankImports = await req.json();

    const savedImports = await Promise.all(bankImports.map(async (bankImport: any) => {
      // Determine if it's an income or expense based on the amount
      const isIncome = bankImport.amount > 0;

      if (isIncome) {
        return await prisma.income.create({
          data: {
            amount: Math.abs(bankImport.amount),
            description: bankImport.description,
            date: new Date(bankImport.date),
            userId: session.user.id,
            categoryId: 'default-income-category-id', // You might want to set a default category or let the user choose later
          },
        });
      } else {
        return await prisma.expense.create({
          data: {
            amount: Math.abs(bankImport.amount),
            description: bankImport.description,
            date: new Date(bankImport.date),
            userId: session.user.id,
            categoryId: 'default-expense-category-id', // You might want to set a default category or let the user choose later
          },
        });
      }
    }));

    return NextResponse.json({ message: "Bank imports saved successfully", savedImports }, { status: 200 });
  } catch (error) {
    console.error('Failed to save bank imports:', error);
    return NextResponse.json({ error: 'Failed to save bank imports' }, { status: 500 });
  }
}