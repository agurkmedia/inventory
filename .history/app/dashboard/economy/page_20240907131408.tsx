'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: 'income' | 'expense';
}

export default function EconomyAndBudget() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [income, setIncome] = useState(0);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTransactions();
      fetchIncome();
    }
  }, [status]);

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions');
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      setTransactions(data);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    }
  };

  const fetchIncome = async () => {
    try {
      const res = await fetch('/api/income');
      if (!res.ok) throw new Error('Failed to fetch income');
      const data = await res.json();
      setIncome(data.amount);
    } catch (err) {
      console.error('Failed to fetch income:', err);
    }
  };

  const expenses = transactions.filter(t => t.type === 'expense');
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);

  const pieChartData = {
    labels: expenses.map(t => t.category),
    datasets: [
      {
        data: expenses.map(t => t.amount),
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
        data: [income, totalExpenses],
        backgroundColor: ['#4BC0C0', '#FF6384'],
      },
    ],
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white mb-4">Economy & Budget</h1>
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
      <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-2">
        <Link href="/dashboard/economy/add-income" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-center text-sm">
          Add Income
        </Link>
        <Link href="/dashboard/economy/add-expense" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-center text-sm">
          Add Expense
        </Link>
        <Link href="/dashboard/economy/transactions" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-center text-sm">
          View All Transactions
        </Link>
      </div>
    </div>
  );
}