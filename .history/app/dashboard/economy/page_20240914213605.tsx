'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Line, Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ArcElement,
  BarElement,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ArcElement,
  BarElement
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

interface CategorySummary {
  incomes: {
    total: number;
    breakdown: Array<{
      source: string;
      amount: number;
      date: string;
    }>;
  };
  expenses: {
    total: number;
    breakdown: { [category: string]: number };
  };
  balance: number;
}

export default function EconomyAndBudget() {
  const [dailyBalances, setDailyBalances] = useState<DailyBalance[]>([]);
  const [currentMonthBalance, setCurrentMonthBalance] = useState<Balance | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [error, setError] = useState('');
  const { data: session, status } = useSession();
  const initializeRef = useRef(false);
  const [categorySummary, setCategorySummary] = useState<CategorySummary>({
    incomes: { total: 0, breakdown: [] },
    expenses: { total: 0, breakdown: {} },
    balance: 0,
  });

  useEffect(() => {
    if (status === 'authenticated' && !initializeRef.current) {
      initializeRef.current = true;
      initializeBalances().then(() => {
        fetchMonthData(selectedMonth);
      });
    }
  }, [status, selectedMonth]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchMonthData(selectedMonth);
      fetchCategorySummary(selectedMonth);
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

      const res = await fetch(`/api/balances/daily?month=${month}&year=${year}`);
      if (!res.ok) throw new Error('Failed to fetch daily balances');
      const data = await res.json();
      setDailyBalances(data.dailyBalances);
      setCurrentMonthBalance(data.monthBalance);
    } catch (err) {
      console.error('Failed to fetch month data:', err);
      setError('Failed to load month data. Please try again.');
    }
  };

  const fetchCategorySummary = async (date: Date) => {
    try {
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const res = await fetch(`/api/balances/category-summary?month=${month}&year=${year}`);
      if (!res.ok) throw new Error('Failed to fetch category summary');
      const data = await res.json();
      setCategorySummary(data);
    } catch (err) {
      console.error('Failed to fetch category summary:', err);
      setError('Failed to load category summary. Please try again.');
    }
  };

  const handlePreviousMonth = () => {
    setSelectedMonth((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setSelectedMonth((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  // Chart Data and Options
  const chartData = {
    labels: dailyBalances.map((db) => db.date),
    datasets: [
      {
        label: 'Balance',
        data: dailyBalances.map((db) => db.remainingBalance),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
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
          },
        },
        ticks: { color: 'white' },
      },
      y: { ticks: { color: 'white' } },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => `Balance: $${context.parsed.y.toFixed(2)}`,
        },
      },
    },
  };

  const renderPieChart = (data: { [category: string]: number }, title: string) => {
    const chartData = {
      labels: Object.keys(data),
      datasets: [
        {
          data: Object.values(data),
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
          ],
        },
      ],
    };

    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'right' as const,
          labels: { color: 'white' },
        },
        title: {
          display: true,
          text: `${title}`,
          color: 'white',
          font: { size: 16 },
        },
      },
    };

    return <Pie data={chartData} options={options} />;
  };

  const renderBarChart = () => {
    const chartData = {
      labels: ['Income', 'Expenses'],
      datasets: [
        {
          label: 'Amount',
          data: [
            categorySummary.incomes.total,
            Object.values(categorySummary.expenses.breakdown).reduce((sum, value) => sum + value, 0),
          ],
          backgroundColor: ['#4BC0C0', '#FF6384'],
        },
      ],
    };

    const options = {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: 'white' },
        },
        x: { ticks: { color: 'white' } },
      },
      plugins: {
        legend: { labels: { color: 'white' } },
        title: {
          display: true,
          text: 'Monthly Income vs Expenses',
          color: 'white',
          font: { size: 16 },
        },
      },
    };

    return <Bar data={chartData} options={options} />;
  };

  if (status === 'loading') {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Navigation Buttons */}
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
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Balance Summary */}
      <div className="bg-white bg-opacity-10 rounded-lg p-4 shadow-md">
        <h2 className="text-lg font-semibold text-white">Balance Summary</h2>
        <p className="text-white">Starting Balance: ${currentMonthBalance?.startingBalance.toFixed(2) || '0.00'}</p>
        <p className="text-white">Remaining Balance: ${currentMonthBalance?.remainingBalance.toFixed(2) || '0.00'}</p>
      </div>

      {/* Expense and Income Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="aspect-w-1 aspect-h-1">
          {renderPieChart(categorySummary.expenses.breakdown, 'Expense Breakdown')}
        </div>
        <div className="aspect-w-1 aspect-h-1">
          {renderPieChart(
            categorySummary.incomes.breakdown.reduce((acc, income) => {
              acc[income.source] = (acc[income.source] || 0) + income.amount;
              return acc;
            }, {} as { [source: string]: number }),
            'Income Breakdown'
          )}
        </div>
      </div>

      {/* Monthly Income vs Expenses */}
      <div className="aspect-w-1 aspect-h-1">
        {renderBarChart()}
      </div>

      {/* Daily Balance Chart */}
      <div className="bg-white bg-opacity-10 rounded-lg p-4 shadow-md">
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
      <div className="bg-white bg-opacity-10 rounded-lg p-4 shadow-md">
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
