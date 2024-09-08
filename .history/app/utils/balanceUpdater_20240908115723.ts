import prisma from '@/lib/prisma';

export async function updateBalances(userId: string, startMonth: Date) {
  const endMonth = new Date(startMonth.getFullYear(), startMonth.getMonth() + 16, 1);

  let currentMonth = new Date(startMonth.getFullYear(), startMonth.getMonth(), 1);
  let previousBalance = null;

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
      },
    });

    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        },
      },
    });

    const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Get or create the balance for the current month
    let balance = await prisma.balance.findFirst({
      where: { userId, year, month },
    });

    if (!balance) {
      // If there's no balance for this month, create one
      balance = await prisma.balance.create({
        data: {
          userId,
          year,
          month,
          startingBalance: previousBalance ? previousBalance.remainingBalance : 0,
          remainingBalance: 0, // This will be calculated and updated below
        },
      });
    } else if (previousBalance && balance.startingBalance !== previousBalance.remainingBalance) {
      // If the starting balance doesn't match the previous month's remaining balance, update it
      balance.startingBalance = previousBalance.remainingBalance;
    }

    // Calculate the remaining balance
    const remainingBalance = balance.startingBalance + totalIncome - totalExpenses;

    // Update the balance
    await prisma.balance.update({
      where: { id: balance.id },
      data: { 
        startingBalance: balance.startingBalance,
        remainingBalance 
      },
    });

    previousBalance = {
      ...balance,
      remainingBalance,
    };

    // Move to the next month
    currentMonth.setMonth(currentMonth.getMonth() + 1);
  }
}