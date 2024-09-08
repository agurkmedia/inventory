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
  let previousRemainingBalance = 0; // To store remaining balance for carryover

  // Start by finding the latest balance (if any) from the month before `startMonth`
  const previousMonth = new Date(startMonth.getFullYear(), startMonth.getMonth() - 1, 1);
  const previousBalance = await prisma.balance.findFirst({
    where: {
      userId,
      year: previousMonth.getFullYear(),
      month: previousMonth.getMonth() + 1, // JS is 0-indexed for months
    },
    orderBy: { createdAt: 'desc' },
  });

  // Set initial carry-over balance from the previous month's remaining balance
  previousRemainingBalance = previousBalance ? previousBalance.remainingBalance || 0 : 0;
  console.log(`Initial Previous Remaining Balance: ${previousRemainingBalance}`);

  while (currentMonth < endMonth) {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1; // JS months are 0-indexed

    console.log(`\nProcessing month: ${month}/${year}`);

    // Get or create the balance for the current month
    let balance = await prisma.balance.findFirst({
      where: { userId, year, month },
    });

    if (!balance) {
      balance = await prisma.balance.create({
        data: {
          userId,
          year,
          month,
          startingBalance: previousRemainingBalance, // Carry over the remaining balance from the previous month
          remainingBalance: 0, // Will be updated later
        },
      });
      console.log(`Created balance for ${month}/${year} with Starting Balance: ${previousRemainingBalance}`);
    } else {
      console.log(`Found existing balance for ${month}/${year} with Starting Balance: ${balance.startingBalance}`);

      // Update the starting balance for the existing month if it doesn't match the carryover
      if (balance.startingBalance !== previousRemainingBalance) {
        await prisma.balance.update({
          where: { id: balance.id },
          data: {
            startingBalance: previousRemainingBalance,
          },
        });
        console.log(`Updated starting balance for ${month}/${year} to: ${previousRemainingBalance}`);
      }
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
              { recurrenceEnd: { gte: currentMonth } },
            ],
          },
        ],
      },
    });

    let totalIncome = 0;
    let recurrentIncome = 0;

    incomes.forEach((income) => {
      if (!income.recurrenceInterval) {
        console.log(`Income (one-time): ${income.source} - Amount: ${income.amount}`);
        totalIncome += income.amount;
      } else {
        let incomeDate = new Date(income.date);
        while (incomeDate < new Date(year, month, 1)) {
          if (incomeDate >= currentMonth && incomeDate < new Date(year, month, 1)) {
            console.log(`Income (recurring): ${income.source} - Amount: ${income.amount}`);
            totalIncome += income.amount;
            recurrentIncome += income.amount;
          }
          incomeDate = getNextRecurrenceDate(incomeDate, income.recurrenceInterval);
          if (income.recurrenceEnd && incomeDate > income.recurrenceEnd) break;
        }
      }
    });

    console.log(`Total Income for ${month}/${year}: ${totalIncome}`);
    console.log(`Total Recurrent Income for ${month}/${year}: ${recurrentIncome}`);

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
              { recurrenceEnd: { gte: currentMonth } },
            ],
          },
        ],
      },
    });

    let totalExpenses = 0;
    let recurrentExpenses = 0;

    expenses.forEach((expense) => {
      if (!expense.recurrenceInterval) {
        console.log(`Expense (one-time): ${expense.description} - Amount: ${expense.amount}`);
        totalExpenses += expense.amount;
      } else {
        let expenseDate = new Date(expense.date);
        while (expenseDate < new Date(year, month, 1)) {
          if (expenseDate >= currentMonth && expenseDate < new Date(year, month, 1)) {
            console.log(`Expense (recurring): ${expense.description} - Amount: ${expense.amount}`);
            totalExpenses += expense.amount;
            recurrentExpenses += expense.amount;
          }
          expenseDate = getNextRecurrenceDate(expenseDate, expense.recurrenceInterval);
          if (expense.recurrenceEnd && expenseDate > expense.recurrenceEnd) break;
        }
      }
    });

    console.log(`Total Expenses for ${month}/${year}: ${totalExpenses}`);
    console.log(`Total Recurrent Expenses for ${month}/${year}: ${recurrentExpenses}`);

    // Calculate the remaining balance for the current month
    const remainingBalance = balance.startingBalance + totalIncome - totalExpenses;
    console.log(`Remaining Balance for ${month}/${year}: ${remainingBalance}`);

    // Update the balance
    await prisma.balance.update({
      where: { id: balance.id },
      data: { remainingBalance },
    });

    // Carry over the remaining balance to the next month
    previousRemainingBalance = remainingBalance;
    console.log(`Carry over Remaining Balance to next month: ${previousRemainingBalance}`);

    // Move to the next month
    currentMonth.setMonth(currentMonth.getMonth() + 1);
  }
}
