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

  let currentMonth = new Date(twoYearsAgo);
  let previousRemainingBalance = 0;

  // Get the earliest balance available for initialization
  const earliestBalance = await prisma.balance.findFirst({
    where: { userId, year: twoYearsAgo.getFullYear(), month: twoYearsAgo.getMonth() + 1 },
    orderBy: { createdAt: 'asc' },
  });

  previousRemainingBalance = earliestBalance ? roundToTwoDecimals(earliestBalance.remainingBalance) : 0;
  console.log(`Initial Previous Remaining Balance: ${previousRemainingBalance}`);

  // Process each month sequentially
  while (currentMonth <= twoYearsFromNow) {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;

    console.log(`\nProcessing month: ${month}/${year}`);

    // Retrieve or create the balance for the current month
    let balance = await prisma.balance.findFirst({
      where: { userId, year, month },
    });

    if (!balance) {
      balance = await prisma.balance.create({
        data: {
          userId,
          year,
          month,
          startingBalance: previousRemainingBalance, // Ensure carryover is used here
          remainingBalance: 0, // Will be updated later
        },
      });
      console.log(`Created balance for ${month}/${year} with Starting Balance: ${previousRemainingBalance}`);
    } else {
      // Update starting balance for existing balance to match the previous month's remaining balance
      if (balance.startingBalance !== previousRemainingBalance) {
        await prisma.balance.update({
          where: { id: balance.id },
          data: { startingBalance: previousRemainingBalance }, // Ensure carryover is applied consistently
        });
        console.log(`Updated starting balance for ${month}/${year} to: ${previousRemainingBalance}`);
      }
    }

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
      while (incomeDate < new Date(year, month, 1)) {
        if (incomeDate >= currentMonth && incomeDate < new Date(year, month, 1)) {
          totalIncome += income.amount;
          console.log(`Income added: ${income.source} - Amount: ${income.amount}`);
        }
        incomeDate = getNextRecurrenceDate(incomeDate, income.recurrenceInterval);
        if (income.recurrenceEnd && incomeDate > income.recurrenceEnd) break;
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
      while (expenseDate < new Date(year, month, 1)) {
        if (expenseDate >= currentMonth && expenseDate < new Date(year, month, 1)) {
          totalExpenses += expense.amount;
          console.log(`Expense added: ${expense.description} - Amount: ${expense.amount}`);
        }
        expenseDate = getNextRecurrenceDate(expenseDate, expense.recurrenceInterval);
        if (expense.recurrenceEnd && expenseDate > expense.recurrenceEnd) break;
      }
    });

    console.log(`Total Expenses for ${month}/${year}: ${roundToTwoDecimals(totalExpenses)}`);

    // ---- Calculate receipt expenses ----
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
      console.log(`Receipt item added - Total Price: ${item.totalPrice}`);
    });

    console.log(`Total Receipt Expenses for ${month}/${year}: ${roundToTwoDecimals(totalReceiptExpenses)}`);

    // ---- Final Calculation ----
    const startingBalance = balance.startingBalance;
    console.log(`Starting Balance for ${month}/${year}: ${startingBalance}`);
    console.log(`Total Income for ${month}/${year}: ${totalIncome}`);
    console.log(`Total Expenses for ${month}/${year}: ${totalExpenses}`);
    console.log(`Total Receipt Expenses for ${month}/${year}: ${totalReceiptExpenses}`);

    const remainingBalance = roundToTwoDecimals(
      startingBalance + totalIncome - totalExpenses - totalReceiptExpenses
    );
    console.log(`Remaining Balance for ${month}/${year}: ${remainingBalance}`);

    // Update the balance for the current month
    await prisma.balance.update({
      where: { id: balance.id },
      data: { remainingBalance },
    });

    // **Carry over the remaining balance to the next month**
    previousRemainingBalance = remainingBalance;
    console.log(`Carry over Remaining Balance to next month: ${previousRemainingBalance}`);

    // Move to the next month in sequence
    currentMonth.setMonth(currentMonth.getMonth() + 1);
  }
}
