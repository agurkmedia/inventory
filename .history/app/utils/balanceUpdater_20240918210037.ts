import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getNextRecurrenceDate(date: Date, interval: string | null): Date | null {
  const newDate = new Date(date);
  switch (interval) {
    case 'DAILY':
      newDate.setDate(newDate.getDate() + 1);
      break;
    case 'WEEKLY':
      newDate.setDate(newDate.getDate() + 7);
      break;
    case 'MONTHLY':
      newDate.setMonth(newDate.getMonth() + 1);
      break;
    case 'QUARTERLY':
      newDate.setMonth(newDate.getMonth() + 3);
      break;
    case 'YEARLY':
      newDate.setFullYear(newDate.getFullYear() + 1);
      break;
    default:
      return null; // For non-recurring
  }
  return newDate;
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function updateBalances(userId: string, startMonth: Date) {
  const tenYearsAgo = new Date(startMonth.getFullYear() - 10, startMonth.getMonth(), 1);
  const twoYearsFromNow = new Date(startMonth.getFullYear() + 2, startMonth.getMonth(), 0);

  let currentMonth = new Date(tenYearsAgo);
  let previousRemainingBalance = 0;

  console.log(`Initial Previous Remaining Balance: ${previousRemainingBalance}`);

  while (currentMonth <= twoYearsFromNow) {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;

    console.log(`\nProcessing month: ${month}/${year}`);

    // ---- Calculate incomes ----
    const incomes = await prisma.income.findMany({
      where: {
        userId,
        OR: [
          { date: { gte: currentMonth, lt: new Date(year, month, 1) } }, // One-time income in the current month
          {
            recurrenceInterval: { not: null }, // Recurring income
            OR: [{ recurrenceEnd: null }, { recurrenceEnd: { gte: currentMonth } }],
          },
        ],
      },
    });

    let totalIncome = 0;
    incomes.forEach((income) => {
      let incomeDate = new Date(income.date);

      // Process non-recurring income just once
      if (!income.isRecurring || !income.recurrenceInterval) {
        if (incomeDate >= currentMonth && incomeDate < new Date(year, month, 1)) {
          totalIncome += income.amount;
          console.log(`Non-recurring Income added: ${income.source} - Amount: ${income.amount}`);
        }
        return;
      }

      // Process recurring income
      while (incomeDate < new Date(year, month, 1)) {
        if (incomeDate >= currentMonth && incomeDate < new Date(year, month, 1)) {
          totalIncome += income.amount;
          console.log(`Recurring Income added: ${income.source} - Amount: ${income.amount}`);
        }
        incomeDate = getNextRecurrenceDate(incomeDate, income.recurrenceInterval);
        if (!incomeDate || (income.recurrenceEnd && incomeDate > income.recurrenceEnd)) break;
      }
    });

    console.log(`Total Income for ${month}/${year}: ${roundToTwoDecimals(totalIncome)}`);

    // ---- Calculate expenses ----
    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        OR: [
          { date: { gte: currentMonth, lt: new Date(year, month, 1) } }, // One-time expenses in the current month
          {
            recurrenceInterval: { not: null }, // Recurring expenses
            OR: [{ recurrenceEnd: null }, { recurrenceEnd: { gte: currentMonth } }],
          },
        ],
      },
    });

    let totalExpenses = 0;
    expenses.forEach((expense) => {
      let expenseDate = new Date(expense.date);

      if (!expense.recurrenceInterval) {
        if (expenseDate >= currentMonth && expenseDate < new Date(year, month, 1)) {
          totalExpenses += expense.amount;
          console.log(`Non-recurring Expense added: ${expense.description} - Amount: ${expense.amount}`);
        }
        return;
      }

      while (expenseDate < new Date(year, month, 1)) {
        if (expenseDate >= currentMonth && expenseDate < new Date(year, month, 1)) {
          totalExpenses += expense.amount;
          console.log(`Recurring Expense added: ${expense.description} - Amount: ${expense.amount}`);
        }
        expenseDate = getNextRecurrenceDate(expenseDate, expense.recurrenceInterval);
        if (!expenseDate || (expense.recurrenceEnd && expenseDate > expense.recurrenceEnd)) break;
      }
    });

    console.log(`Total Expenses for ${month}/${year}: ${roundToTwoDecimals(totalExpenses)}`);

    // ---- Calculate receipt expenses and incomes ----
    const receiptItems = await prisma.receiptItem.findMany({
      where: {
        receipt: {
          userId,
        },
        date: { gte: currentMonth, lt: new Date(year, month, 1) }, // Use receiptItem's date
      },
      select: { totalPrice: true },
    });

    let totalReceiptExpenses = 0;
    let totalReceiptIncomes = 0;
    receiptItems.forEach((item) => {
      if (item.totalPrice < 0) {
        totalReceiptExpenses += Math.abs(item.totalPrice);
        console.log(`Receipt item added as Expense - Total Price: ${item.totalPrice}`);
      } else {
        totalReceiptIncomes += item.totalPrice;
        console.log(`Receipt item added as Income - Total Price: ${item.totalPrice}`);
      }
    });

    console.log(`Total Receipt Expenses for ${month}/${year}: ${roundToTwoDecimals(totalReceiptExpenses)}`);
    console.log(`Total Receipt Incomes for ${month}/${year}: ${roundToTwoDecimals(totalReceiptIncomes)}`);

    // ---- Final Calculation ----
    console.log(`Previous Remaining Balance (carryover) for ${month}/${year}: ${previousRemainingBalance}`);
    console.log(`Total Income for ${month}/${year}: ${totalIncome}`);
    console.log(`Total Expenses for ${month}/${year}: ${totalExpenses}`);
    console.log(`Total Receipt Expenses for ${month}/${year}: ${totalReceiptExpenses}`);
    console.log(`Total Receipt Incomes for ${month}/${year}: ${totalReceiptIncomes}`);

    const remainingBalance = roundToTwoDecimals(
      previousRemainingBalance + totalIncome + totalReceiptIncomes - totalExpenses - totalReceiptExpenses
    );
    console.log(`Remaining Balance for ${month}/${year}: ${remainingBalance}`);

    await prisma.balance.upsert({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
      update: { startingBalance: previousRemainingBalance, remainingBalance },
      create: {
        userId,
        year,
        month,
        startingBalance: previousRemainingBalance,
        remainingBalance,
      },
    });

    previousRemainingBalance = remainingBalance;
    currentMonth.setMonth(currentMonth.getMonth() + 1);
  }
}
