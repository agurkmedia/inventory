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
  }
  return newDate;
}

export async function updateBalances(userId: string, startMonth: Date) {
  const endMonth = new Date(startMonth.getFullYear(), startMonth.getMonth() + 16, 1);

  let currentMonth = new Date(startMonth.getFullYear(), startMonth.getMonth(), 1);

  while (currentMonth < endMonth) {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1; // JavaScript months are 0-indexed

    // Get the starting balance for the current month
    let balance = await prisma.balance.findFirst({
      where: { userId, year, month },
    });

    if (!balance) {
      // If no balance exists for this month, use the previous month's remaining balance or 0
      const previousMonth = new Date(year, month - 2, 1);
      const previousBalance = await prisma.balance.findFirst({
        where: { 
          userId, 
          year: previousMonth.getFullYear(), 
          month: previousMonth.getMonth() + 1 
        },
        orderBy: { createdAt: 'desc' },
      });

      balance = await prisma.balance.create({
        data: {
          userId,
          year,
          month,
          startingBalance: previousBalance ? previousBalance.remainingBalance : 0,
          remainingBalance: 0, // This will be calculated and updated below
        },
      });
    }

    // Calculate incomes for the current month
    const incomes = await prisma.income.findMany({
      where: {
        userId,
        OR: [
          { date: { gte: currentMonth, lt: new Date(year, month, 1) } },
          { 
            recurrenceInterval: { not: null },
            OR: [
              { recurrenceEnd: null },
              { recurrenceEnd: { gte: currentMonth } }
            ]
          }
        ]
      },
    });

    let totalIncome = 0;
    incomes.forEach(income => {
      if (!income.recurrenceInterval) {
        totalIncome += income.amount;
      } else {
        let incomeDate = new Date(income.date);
        while (incomeDate < new Date(year, month, 1)) {
          if (incomeDate >= currentMonth && incomeDate < new Date(year, month, 1)) {
            totalIncome += income.amount;
          }
          incomeDate = getNextRecurrenceDate(incomeDate, income.recurrenceInterval);
          if (income.recurrenceEnd && incomeDate > income.recurrenceEnd) break;
        }
      }
    });

    // Calculate expenses for the current month
    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        OR: [
          { date: { gte: currentMonth, lt: new Date(year, month, 1) } },
          { 
            recurrenceInterval: { not: null },
            OR: [
              { recurrenceEnd: null },
              { recurrenceEnd: { gte: currentMonth } }
            ]
          }
        ]
      },
    });

    let totalExpenses = 0;
    expenses.forEach(expense => {
      if (!expense.recurrenceInterval) {
        totalExpenses += expense.amount;
      } else {
        let expenseDate = new Date(expense.date);
        while (expenseDate < new Date(year, month, 1)) {
          if (expenseDate >= currentMonth && expenseDate < new Date(year, month, 1)) {
            totalExpenses += expense.amount;
          }
          expenseDate = getNextRecurrenceDate(expenseDate, expense.recurrenceInterval);
          if (expense.recurrenceEnd && expenseDate > expense.recurrenceEnd) break;
        }
      }
    });

    // Calculate the remaining balance
    const remainingBalance = balance.startingBalance + totalIncome - totalExpenses;

    // Update the balance
    await prisma.balance.update({
      where: { id: balance.id },
      data: { remainingBalance },
    });

    // Move to the next month
    currentMonth.setMonth(currentMonth.getMonth() + 1);
  }
}