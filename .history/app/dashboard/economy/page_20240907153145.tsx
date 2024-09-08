'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, TimeScale } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement, 
  LineElement, 
  Title, 
  TimeScale, 
  annotationPlugin
);

interface Income {
  id: string;
  source: string;
  amount: number;
  date: string;
  recurrenceInterval: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | null;
  recurrenceEnd: string | null;
}

interface Expense {
  id: string;
  amount: number;
  category: {
    id: string;
    name: string;
  };
  description: string;
  date: string;
  recurrenceInterval: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | null;
  recurrenceEnd: string | null;
}

type ProjectionPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export default function EconomyAndBudget() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState('');
  const [projectionPeriod, setProjectionPeriod] = useState<ProjectionPeriod>('monthly');
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchIncomes();
      fetchExpenses();
    }
  }, [status]);

  const fetchIncomes = async () => {
    try {
      const res = await fetch('/api/income');
      if (!res.ok) throw new Error('Failed to fetch incomes');
      const data = await res.json();
      setIncomes(data);
    } catch (err) {
      console.error('Failed to fetch incomes:', err);
      setError('Failed to load incomes. Please try again.');
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/expenses');
      if (!res.ok) throw new Error('Failed to fetch expenses');
      const data = await res.json();
      setExpenses(data);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
      setError('Failed to load expenses. Please try again.');
    }
  };

  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const balance = totalIncome - totalExpenses;

  const pieChartData = {
    labels: Array.from(new Set(expenses.map(e => e.category.name))),
    datasets: [
      {
        data: Array.from(new Set(expenses.map(e => e.category.name))).map(category =>
          expenses.filter(e => e.category.name === category).reduce((sum, e) => sum + e.amount, 0)
        ),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
        ],
      },
    ],
  };

  const barChartData = {
    labels: ['Income', 'Expenses'],
    datasets: [
      {
        label: 'Amount',
        data: [totalIncome, totalExpenses],
        backgroundColor: ['#4BC0C0', '#FF6384'],
      },
    ],
  };

  const projectionChartData = generateProjectionChartData(incomes, expenses);

  if (status === 'loading') {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white mb-4">Economy & Budget</h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md">
          <h2 className="text-lg font-semibold text-white mb-2">Expenses by Category</h2>
          <div className="aspect-w-16 aspect-h-9 h-48">
            <Pie data={pieChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: 'white' } } } }} />
          </div>
        </div>
        <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md">
          <h2 className="text-lg font-semibold text-white mb-2">Income vs Expenses</h2>
          <div className="aspect-w-16 aspect-h-9 h-48">
            <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: 'white' } } }, scales: { x: { ticks: { color: 'white' } }, y: { ticks: { color: 'white' } } } }} />
          </div>
        </div>
      </div>
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md">
        <h2 className="text-lg font-semibold text-white mb-2">Projections</h2>
        <div className="flex justify-center space-x-2 mb-4">
          {(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as ProjectionPeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setProjectionPeriod(period)}
              className={`px-4 py-2 rounded ${projectionPeriod === period ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-200'}`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
        <div className="aspect-w-16 aspect-h-9 h-64">
          <Line 
            data={{
              labels: projectionChartData[projectionPeriod].labels,
              datasets: [{
                label: 'Balance',
                data: projectionChartData[projectionPeriod].data,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
              }]
            }} 
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (context) => `Balance: $${context.parsed.y.toFixed(2)}`
                  }
                }
              },
              scales: {
                x: { 
                  type: 'time',
                  time: {
                    unit: projectionPeriod === 'daily' ? 'day' : 
                          projectionPeriod === 'weekly' ? 'week' : 
                          projectionPeriod === 'monthly' ? 'month' : 
                          projectionPeriod === 'quarterly' ? 'quarter' : 'year'
                  },
                  ticks: { color: 'white' }
                },
                y: { ticks: { color: 'white' } }
              }
            }}
          />
        </div>
      </div>
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md">
        <h2 className="text-lg font-semibold text-white mb-2">Summary</h2>
        <p className="text-white">Total Income: ${totalIncome.toFixed(2)}</p>
        <p className="text-white">Total Expenses: ${totalExpenses.toFixed(2)}</p>
        <p className="text-white">Current Balance: ${balance.toFixed(2)}</p>
      </div>
      <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-2">
        <Link href="/dashboard/economy/add-income" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-center text-sm">
          Add Income
        </Link>
        <Link href="/dashboard/economy/add-expense" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-center text-sm">
          Add Expense
        </Link>
        <Link href="/dashboard/economy/manage-incomes" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-center text-sm">
          Manage Incomes
        </Link>
        <Link href="/dashboard/economy/manage-expenses" className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-center text-sm">
          Manage Expenses
        </Link>
        <Link href="/dashboard/economy/expense-categories" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-center text-sm">
          Manage Categories
        </Link>
      </div>
    </div>
  );
}

function generateProjectionChartData(incomes: Income[], expenses: Expense[]) {
  const currentDate = new Date();
  const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
  const endOfYear = new Date(currentDate.getFullYear(), 11, 31);

  const dailyData: { [key: string]: number } = {};
  let runningBalance = 0;

  // Initialize daily data for the entire year
  for (let d = new Date(startOfYear); d <= endOfYear; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split('T')[0];
    dailyData[dateKey] = runningBalance;
  }

  // Combine incomes and expenses into a single array of transactions
  const transactions = [
    ...incomes.map(income => ({ ...income, type: 'income' as const })),
    ...expenses.map(expense => ({ ...expense, type: 'expense' as const }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Process transactions
  transactions.forEach(transaction => {
    const transactionDate = new Date(transaction.date);
    if (transactionDate >= startOfYear && transactionDate <= endOfYear) {
      const dateKey = transactionDate.toISOString().split('T')[0];
      if (transaction.type === 'income') {
        runningBalance += transaction.amount;
      } else {
        runningBalance -= transaction.amount;
      }
      dailyData[dateKey] = runningBalance;

      // Handle recurring transactions
      if (transaction.recurrenceInterval && transaction.recurrenceInterval !== 'NONE') {
        let nextDate = new Date(transactionDate);
        const endDate = transaction.recurrenceEnd ? new Date(transaction.recurrenceEnd) : endOfYear;

        while (nextDate <= endDate) {
          nextDate = getNextRecurrenceDate(nextDate, transaction.recurrenceInterval);
          if (nextDate <= endOfYear) {
            const nextDateKey = nextDate.toISOString().split('T')[0];
            if (transaction.type === 'income') {
              runningBalance += transaction.amount;
            } else {
              runningBalance -= transaction.amount;
            }
            dailyData[nextDateKey] = runningBalance;
          }
        }
      }
    }
  });

  // Fill in the running balance for days after transactions
  let lastBalance = 0;
  for (let d = new Date(startOfYear); d <= endOfYear; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split('T')[0];
    if (dailyData[dateKey] !== lastBalance) {
      lastBalance = dailyData[dateKey];
    } else {
      dailyData[dateKey] = lastBalance;
    }
  }

  // Prepare data for charts
  const dailyLabels = Object.keys(dailyData);
  const dailyDataPoints = Object.values(dailyData);

  const weeklyData = aggregateData(dailyData, 7);
  const monthlyData = aggregateData(dailyData, 30);
  const quarterlyData = aggregateData(dailyData, 91);
  const yearlyData = aggregateData(dailyData, 365);

  return {
    daily: { labels: dailyLabels, data: dailyDataPoints },
    weekly: weeklyData,
    monthly: monthlyData,
    quarterly: quarterlyData,
    yearly: yearlyData,
  };
}

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

function aggregateData(dailyData: { [key: string]: number }, days: number) {
  const aggregatedData: { [key: string]: number } = {};
  let currentSum = 0;
  let count = 0;

  Object.entries(dailyData).forEach(([date, value], index) => {
    currentSum = value;
    count++;

    if (count === days || index === Object.keys(dailyData).length - 1) {
      aggregatedData[date] = currentSum;
      count = 0;
    }
  });

  return {
    labels: Object.keys(aggregatedData),
    data: Object.values(aggregatedData),
  };
}