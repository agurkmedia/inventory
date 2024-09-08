'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, TimeScale, AnnotationPlugin } from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, TimeScale, AnnotationPlugin);

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

export default function EconomyAndBudget() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState('');
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
    labels: [...new Set(expenses.map(e => e.category.name))],
    datasets: [
      {
        data: [...new Set(expenses.map(e => e.category.name))].map(category =>
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
    return <div>Loading...</div>;
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
            <Pie data={pieChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
        <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md">
          <h2 className="text-lg font-semibold text-white mb-2">Income vs Expenses</h2>
          <div className="aspect-w-16 aspect-h-9 h-48">
            <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
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