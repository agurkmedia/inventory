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
  const twoYearsAgo = new Date(startMonth.getFullYear() - 2, startMonth.getMonth(), 1);
  const twoYearsFromNow = new Date(startMonth.getFullYear() + 2, startMonth.getMonth(), 0);
  
  let currentMonth = new Date(twoYearsAgo);  // Start from two years ago
  let previousRemainingBalance = 0;  // Initialize previous balance to zero

  // Fetch the earliest balance available to set the initial carryover balance
  const earliestBalance = await prisma.balance.findFirst({
    where: {
      userId,
      year: twoYearsAgo.getFullYear(),
      month: twoYearsAgo.getMonth() + 1,  // JS months are 0-indexed
    },
    orderBy: { createdAt: 'asc' },
  });

  // Set the previous remaining balance to the earliest found balance or zero
  previousRemainingBalance = earliestBalance ? roundToTwoDecimals(earliestBalance.startingBalance) : 0;
  console.log(`Initial Previous Remaining Balance: ${previousRemainingBalance}`);

  // Start looping through each month
  while (currentMonth <= twoYearsFromNow) {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;  // JS months are 0-indexed

    console.log(`\nProcessing month: ${month}/${year}`);

    // Get or create the balance for the current month
    let balance = await prisma.balance.findFirst({
      where: { userId, year, month },
    });

    // If no balance exists for this month, create one using the previous month's balance
    if (!balance) {
      balance = await prisma.balance.create({
        data: {
          userId,
          year,
          month,
          startingBalance: previousRemainingBalance,
          remainingBalance: 0,  // Will be updated after calculation
        },
      });
      console.log(`Created balance for ${month}/${year} with Starting Balance: ${previousRemainingBalance}`);
    } else {
      console.log(`Found existing balance for ${month}/${year} with Starting Balance: ${balance.startingBalance}`);

      // Only update the starting balance if it's different from the previous month's remaining balance
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

    incomes.forEach((income) => {
      let incomeDate = new Date(income.date);
      while (incomeDate < new Date(year, month, 1)) {
        if (incomeDate >= currentMonth && incomeDate < new Date(year, month, 1)) {
          totalIncome += income.amount;
        }
        incomeDate = getNextRecurrenceDate(incomeDate, income.recurrenceInterval);
        if (income.recurrenceEnd && incomeDate > income.recurrenceEnd) break;
      }
    });

    console.log(`Total Income for ${month}/${year}: ${roundToTwoDecimals(totalIncome)}`);

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

    expenses.forEach((expense) => {
      let expenseDate = new Date(expense.date);
      while (expenseDate < new Date(year, month, 1)) {
        if (expenseDate >= currentMonth && expenseDate < new Date(year, month, 1)) {
          totalExpenses += expense.amount;
        }
        expenseDate = getNextRecurrenceDate(expenseDate, expense.recurrenceInterval);
        if (expense.recurrenceEnd && expenseDate > expense.recurrenceEnd) break;
      }
    });

    console.log(`Total Expenses for ${month}/${year}: ${roundToTwoDecimals(totalExpenses)}`);

    // --- Add Receipt Expenses ---
    const receiptItems = await prisma.receiptItem.findMany({
      where: {
        receipt: {
          userId,
          date: { gte: currentMonth, lt: new Date(year, month, 1) },
        },
      },
      select: { totalPrice: true },
    });

    let totalReceiptExpenses = 0;

    receiptItems.forEach((item) => {
      totalReceiptExpenses += item.totalPrice;
    });

    console.log(`Total Receipt Expenses for ${month}/${year}: ${roundToTwoDecimals(totalReceiptExpenses)}`);

    // --- Final Calculation ---
    const remainingBalance = roundToTwoDecimals(
      balance.startingBalance + totalIncome - totalExpenses - totalReceiptExpenses
    );
    console.log(`Remaining Balance for ${month}/${year}: ${remainingBalance}`);

    // Update the balance for the current month with the final remaining balance
    await prisma.balance.update({
      where: { id: balance.id },
      data: { remainingBalance },
    });

    // Set this month's remaining balance as next month's starting balance
    previousRemainingBalance = remainingBalance;
    console.log(`Carry over Remaining Balance to next month: ${previousRemainingBalance}`);

    // Move to the next month in sequence
    currentMonth.setMonth(currentMonth.getMonth() + 1);
  }
}
