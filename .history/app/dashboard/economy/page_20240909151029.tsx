'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import prisma from '@/lib/prisma';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface DailyBalance {
  date: string;
  startingBalance: number;
  income: number;
  expenses: number;
  remainingBalance: number;
}

interface Balance {
  id: string;
  month: number;
  year: number;
  startingBalance: number;
  remainingBalance: number;
}

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

export default function EconomyAndBudget() {
  const [dailyBalances, setDailyBalances] = useState<DailyBalance[]>([]);
  const [currentMonthBalance, setCurrentMonthBalance] = useState<Balance | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [error, setError] = useState('');
  const { data: session, status } = useSession();
  const initializeRef = useRef(false);

  useEffect(() => {
    if (status === 'authenticated' && !initializeRef.current) {
      initializeRef.current = true;
      initializeBalances().then(() => {
        fetchMonthData(selectedMonth);
      });
    }
  }, [status]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchMonthData(selectedMonth);
    }
  }, [selectedMonth, status]);

  const initializeBalances = async () => {
    try {
      const res = await fetch('/api/balances/initialize', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Failed to initialize balances');
      }
    } catch (err) {
      console.error('Error initializing balances:', err);
      setError('Failed to initialize balances. Please try again.');
    }
  };

  const fetchMonthData = async (date: Date) => {
    try {
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const [incomes, expenses, receiptItems, balance] = await Promise.all([
        fetchIncomes(startDate, endDate),
        fetchExpenses(startDate, endDate),
        fetchReceiptItems(startDate, endDate),
        fetchBalance(month, year),
      ]);

      const dailyBalances = calculateDailyBalances(startDate, endDate, incomes, expenses, receiptItems, balance);

      setDailyBalances(dailyBalances);
      setCurrentMonthBalance(balance);
    } catch (err) {
      console.error('Failed to fetch month data:', err);
      setError('Failed to load month data. Please try again.');
    }
  };

  const fetchIncomes = async (startDate: Date, endDate: Date) => {
    const res = await fetch(`/api/incomes?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
    if (!res.ok) throw new Error('Failed to fetch incomes');
    return res.json();
  };

  const fetchExpenses = async (startDate: Date, endDate: Date) => {
    const res = await fetch(`/api/expenses?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
    if (!res.ok) throw new Error('Failed to fetch expenses');
    return res.json();
  };

  const fetchReceiptItems = async (startDate: Date, endDate: Date) => {
    const res = await fetch(`/api/receipts/items?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
    if (!res.ok) throw new Error('Failed to fetch receipt items');
    return res.json();
  };

  const fetchBalance = async (month: number, year: number) => {
    const res = await fetch(`/api/balances?month=${month}&year=${year}`);
    if (!res.ok) throw new Error('Failed to fetch balance');
    return res.json();
  };

  const calculateDailyBalances = (
    startDate: Date,
    endDate: Date,
    incomes: any[],
    expenses: any[],
    receiptItems: any[],
    balance: Balance
  ): DailyBalance[] => {
    const dailyBalances: DailyBalance[] = [];
    let currentDate = new Date(startDate);
    let runningBalance = balance.startingBalance;

    while (currentDate <= endDate) {
      let dailyIncome = 0;
      let dailyExpense = 0;

      // Calculate income for the day
      incomes.forEach((income) => {
        let incomeDate = new Date(income.date);
        if (
          (incomeDate.getTime() === currentDate.getTime()) ||
          (income.recurrenceInterval && isRecurringOnDate(income, currentDate))
        ) {
          dailyIncome += income.amount;
        }
      });

      // Calculate expenses for the day
      expenses.forEach((expense) => {
        let expenseDate = new Date(expense.date);
        if (
          (expenseDate.getTime() === currentDate.getTime()) ||
          (expense.recurrenceInterval && isRecurringOnDate(expense, currentDate))
        ) {
          dailyExpense += expense.amount;
        }
      });

      // Add receipt items for the day
      receiptItems.forEach((item) => {
        if (new Date(item.receipt.date).getTime() === currentDate.getTime()) {
          dailyExpense += item.totalPrice;
        }
      });

      runningBalance = roundToTwoDecimals(runningBalance + dailyIncome - dailyExpense);

      dailyBalances.push({
        date: currentDate.toISOString(),
        startingBalance: roundToTwoDecimals(runningBalance - dailyIncome + dailyExpense),
        income: roundToTwoDecimals(dailyIncome),
        expenses: roundToTwoDecimals(dailyExpense),
        remainingBalance: runningBalance,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dailyBalances;
  };

  const isRecurringOnDate = (item: any, date: Date): boolean => {
    let itemDate = new Date(item.date);
    while (itemDate <= date) {
      if (itemDate.getTime() === date.getTime()) {
        return true;
      }
      itemDate = getNextRecurrenceDate(itemDate, item.recurrenceInterval);
      if (item.recurrenceEnd && itemDate > new Date(item.recurrenceEnd)) {
        break;
      }
    }
    return false;
  };

  const handlePreviousMonth = () => {
    setSelectedMonth(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setSelectedMonth(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const chartData = {
    labels: dailyBalances.map(db => db.date),
    datasets: [
      {
        label: 'Balance',
        data: dailyBalances.map(db => db.remainingBalance),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'day' as const,
          displayFormats: {
            day: 'MMM d',
            week: 'MMM d',
            month: 'MMM yyyy',
            quarter: 'QQQ yyyy',
            year: 'yyyy'
          }
        },
        ticks: { color: 'white' }
      },
      y: { ticks: { color: 'white' } }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => `Balance: $${context.parsed.y.toFixed(2)}`
        }
      }
    }
  };

  if (status === 'loading') {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white mb-4">Economy & Budget</h1>
      
      {/* Navigation buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Link href="/dashboard/economy/manage-incomes" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-sm">
          Manage Incomes
        </Link>
        <Link href="/dashboard/economy/manage-expenses" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-sm">
          Manage Expenses
        </Link>
        <Link href="/dashboard/economy/manage-receipts" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-sm">
          Manage Receipts
        </Link>
        <Link href="/dashboard/economy/manage-balances" className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-sm">
          Manage Balances
        </Link>
        <Link href="/dashboard/economy/expense-categories" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-sm">
          Manage Categories
        </Link>
        <Link href="/dashboard/economy/import-transactions" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-sm">
          Import Transactions
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {/* Current Month Summary */}
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md">
        <h2 className="text-lg font-semibold text-white mb-2">Current Month Summary</h2>
        <p className="text-white">Starting Balance: ${currentMonthBalance?.startingBalance.toFixed(2) || '0.00'}</p>
        <p className="text-white">Remaining Balance: ${currentMonthBalance?.remainingBalance.toFixed(2) || '0.00'}</p>
      </div>
      
      {/* Daily Balance Chart */}
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Daily Balance</h2>
          <div>
            <button onClick={handlePreviousMonth} className="bg-blue-500 text-white px-2 py-1 rounded mr-2">Previous Month</button>
            <span className="text-white">{selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
            <button onClick={handleNextMonth} className="bg-blue-500 text-white px-2 py-1 rounded ml-2">Next Month</button>
          </div>
        </div>
        <div className="aspect-w-16 aspect-h-9 h-64">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
      
      {/* Daily Balance Table */}
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md">
        <h2 className="text-lg font-semibold text-white mb-2">Daily Balance Table</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-white">
            <thead>
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Starting Balance</th>
                <th className="px-4 py-2">Income</th>
                <th className="px-4 py-2">Expenses</th>
                <th className="px-4 py-2">Remaining Balance</th>
              </tr>
            </thead>
            <tbody>
              {dailyBalances.map((day) => (
                <tr key={day.date}>
                  <td className="border px-4 py-2">{new Date(day.date).toLocaleDateString()}</td>
                  <td className="border px-4 py-2">${day.startingBalance.toFixed(2)}</td>
                  <td className="border px-4 py-2">${day.income.toFixed(2)}</td>
                  <td className="border px-4 py-2">${day.expenses.toFixed(2)}</td>
                  <td className="border px-4 py-2">${day.remainingBalance.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}