'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function EconomyAndBudget() {
  const [transactions, setTransactions] = useState([]);
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

  const expensesByCategory = transactions.reduce((acc, transaction) => {
    if (!acc[transaction.category]) {
      acc[transaction.category] = 0;
    }
    acc[transaction.category] += transaction.amount;
    return acc;
  }, {});

  const pieChartData = {
    labels: Object.keys(expensesByCategory),
    datasets: [
      {
        data: Object.values(expensesByCategory),
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
        data: [income, transactions.reduce((sum, t) => sum + t.amount, 0)],
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
        <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-3 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-2">Expenses by Category</h2>
          <div className="aspect-w-16 aspect-h-9 h-64">
            <Pie data={pieChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
        <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-3 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-2">Income vs Expenses</h2>
          <div className="aspect-w-16 aspect-h-9 h-64">
            <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-2">
        <Link href="/dashboard/economy/new-transaction" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-center text-sm">
          Add New Transaction
        </Link>
        <Link href="/dashboard/economy/set-income" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-center text-sm">
          Set Income
        </Link>
      </div>
    </div>
  );
}