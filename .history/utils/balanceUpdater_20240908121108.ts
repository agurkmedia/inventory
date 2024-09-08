import prisma from '@/lib/prisma';

function getNextRecurrenceDate(date: Date, interval: string): Date {
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
  }
  return newDate;
}

export async function updateBalances(userId: string, startMonth: Date) {
  const endMonth = new Date(startMonth.getFullYear(), startMonth.getMonth() + 16, 1);

  let currentMonth = new Date(startMonth.getFullYear(), startMonth.getMonth(), 1);
  let previousBalance = null;

  // Fetch all recurring incomes and expenses
  const recurringIncomes = await prisma.income.findMany({
    where: {
      userId,
      recurrenceInterval: { not: null },
      OR: [
        { recurrenceEnd: null },
        { recurrenceEnd: { gte: startMonth } }
      ]
    }
  });

  const recurringExpenses = await prisma.expense.findMany({
    where: {
      userId,
      recurrenceInterval: { not: null },
      OR: [
        { recurrenceEnd: null },
        { recurrenceEnd: { gte: startMonth } }
      ]
    }
  });

  while (currentMonth < endMonth) {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1; // JavaScript months are 0-indexed

    // Calculate the total income and expenses for the current month
    const incomes = await prisma.income.findMany({
      where: {
        userId,
        date: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        },
        recurrenceInterval: null, // Only non-recurring incomes
      },
    });

    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        },
        recurrenceInterval: null, // Only non-recurring expenses
      },
    });

    let totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
    let totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Add recurring incomes
    recurringIncomes.forEach(income => {
      let recurrenceDate = new Date(income.date);
      while (recurrenceDate < new Date(year, month, 1)) {
        if (recurrenceDate >= new Date(year, month - 1, 1) && recurrenceDate < new Date(year, month, 1)) {
          totalIncome += income.amount;
        }
        recurrenceDate = getNextRecurrenceDate(recurrenceDate, income.recurrenceInterval);
        if (income.recurrenceEnd && recurrenceDate > income.recurrenceEnd) break;
      }
    });

    // Add recurring expenses
    recurringExpenses.forEach(expense => {
      let recurrenceDate = new Date(expense.date);
      while (recurrenceDate < new Date(year, month, 1)) {
        if (recurrenceDate >= new Date(year, month - 1, 1) && recurrenceDate < new Date(year, month, 1)) {
          totalExpenses += expense.amount;
        }
        recurrenceDate = getNextRecurrenceDate(recurrenceDate, expense.recurrenceInterval);
        if (expense.recurrenceEnd && recurrenceDate > expense.recurrenceEnd) break;
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