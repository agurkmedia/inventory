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

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function updateBalances(userId: string, startMonth: Date) {
  const currentDate = new Date();
  const twoYearsAgo = new Date(currentDate.getFullYear() - 2, currentDate.getMonth(), 1);
  const twoYearsFromNow = new Date(currentDate.getFullYear() + 2, currentDate.getMonth() + 1, 0);

  let currentMonth = new Date(twoYearsAgo);
  let previousRemainingBalance = 0;

  // Find the earliest balance (if any) from two years ago
  const earliestBalance = await prisma.balance.findFirst({
    where: {
      userId,
      year: twoYearsAgo.getFullYear(),
      month: twoYearsAgo.getMonth() + 1,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Set initial carry-over balance from the earliest balance found or 0
  previousRemainingBalance = earliestBalance ? roundToTwoDecimals(earliestBalance.startingBalance) : 0;
  console.log(`Initial Previous Remaining Balance: ${previousRemainingBalance}`);

  while (currentMonth <= twoYearsFromNow) {
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
          startingBalance: previousRemainingBalance,
          remainingBalance: 0, // Will be updated later
        },
      });
      console.log(`Created balance for ${month}/${year} with Starting Balance: ${previousRemainingBalance}`);
    } else {
      console.log(`Found existing balance for ${month}/${year} with Starting Balance: ${balance.startingBalance}`);

      // Update the starting balance for the existing month only if necessary
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

    console.log(`Total Income for ${month}/${year}: ${roundToTwoDecimals(totalIncome)}`);
    console.log(`Total Recurrent Income for ${month}/${year}: ${roundToTwoDecimals(recurrentIncome)}`);

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

    console.log(`Total Expenses for ${month}/${year}: ${roundToTwoDecimals(totalExpenses)}`);
    console.log(`Total Recurrent Expenses for ${month}/${year}: ${roundToTwoDecimals(recurrentExpenses)}`);

    // --- Add Receipt Expenses ---

    // Fetch receipt items for the current month
    const receiptItems = await prisma.receiptItem.findMany({
      where: {
        receipt: {
          userId: userId,
          date: {
            gte: currentMonth,
            lt: new Date(year, month, 1),
          },
        },
      },
      select: {
        totalPrice: true,  // Sum totalPrice from each receipt item
      },
    });

    let totalReceiptExpenses = 0;

    receiptItems.forEach((item) => {
      totalReceiptExpenses += item.totalPrice;
    });

    console.log(`Total Receipt Expenses for ${month}/${year}: ${roundToTwoDecimals(totalReceiptExpenses)}`);

    // --- Final Calculation ---

    // Calculate the remaining balance for the current month, including receipt expenses
    const remainingBalance = roundToTwoDecimals(
      balance.startingBalance + totalIncome - totalExpenses - totalReceiptExpenses
    );
    console.log(`Remaining Balance for ${month}/${year}: ${remainingBalance}`);

    // Update the balance once, using the final remaining balance
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
