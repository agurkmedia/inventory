import prisma from '@/lib/prisma';

function getNextRecurrenceDate(date: Date, interval: string | null): Date {
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
      return newDate;
  }
  return newDate;
}

export async function updateBalances(userId: string, startMonth: Date) {
  const endMonth = new Date(startMonth.getFullYear(), startMonth.getMonth() + 16, 1);

  let currentMonth = new Date(startMonth.getFullYear(), startMonth.getMonth(), 1);
  let previousBalance = null;

  // Fetch all incomes and expenses (both recurring and non-recurring)
  const allIncomes = await prisma.income.findMany({
    where: {
      userId,
      OR: [
        { recurrenceInterval: null },
        { recurrenceEnd: null },
        { recurrenceEnd: { gte: startMonth } }
      ]
    }
  });

  const allExpenses = await prisma.expense.findMany({
    where: {
      userId,
      OR: [
        { recurrenceInterval: null },
        { recurrenceEnd: null },
        { recurrenceEnd: { gte: startMonth } }
      ]
    }
  });

  while (currentMonth < endMonth) {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1; // JavaScript months are 0-indexed

    let totalIncome = 0;
    let totalExpenses = 0;

    // Calculate incomes for the current month
    allIncomes.forEach(income => {
      let incomeDate = new Date(income.date);
      if (income.recurrenceInterval) {
        while (incomeDate < currentMonth) {
          incomeDate = getNextRecurrenceDate(incomeDate, income.recurrenceInterval);
        }
      }
      if (incomeDate.getFullYear() === year && incomeDate.getMonth() + 1 === month) {
        if (!income.recurrenceEnd || incomeDate <= income.recurrenceEnd) {
          totalIncome += income.amount;
        }
      }
    });

    // Calculate expenses for the current month
    allExpenses.forEach(expense => {
      let expenseDate = new Date(expense.date);
      if (expense.recurrenceInterval) {
        while (expenseDate < currentMonth) {
          expenseDate = getNextRecurrenceDate(expenseDate, expense.recurrenceInterval);
        }
      }
      if (expenseDate.getFullYear() === year && expenseDate.getMonth() + 1 === month) {
        if (!expense.recurrenceEnd || expenseDate <= expense.recurrenceEnd) {
          totalExpenses += expense.amount;
        }
      }
    });

    // Get or create the balance for the current month
    let balance = await prisma.balance.findFirst({
      where: { userId, year, month },
    });

    if (balance) {
      // If balance exists, use its starting balance
      const remainingBalance = balance.startingBalance + totalIncome - totalExpenses;
      balance = await prisma.balance.update({
        where: { id: balance.id },
        data: { 
          remainingBalance 
        },
      });
    } else {
      // If balance doesn't exist, create a new one
      const startingBalance = previousBalance ? previousBalance.remainingBalance : 0;
      const remainingBalance = startingBalance + totalIncome - totalExpenses;
      balance = await prisma.balance.create({
        data: {
          userId,
          year,
          month,
          startingBalance,
          remainingBalance,
        },
      });
    }

    previousBalance = balance;

    // Move to the next month
    currentMonth.setMonth(currentMonth.getMonth() + 1);
  }
}