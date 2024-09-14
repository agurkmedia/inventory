'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Line, Pie, Bar, Doughnut } from 'react-chartjs-2';
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
  BarElement
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
  receipts: {
    total: number;
    breakdown: Array<{
      category: string;
      amount: number;
      date: string;
    }>;
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
    receipts: { total: 0, breakdown: [] },
    balance: 0
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
            day: 'MMM d'
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

  const renderReceiptBreakdown = () => {
    return categorySummary.receipts.breakdown.map((item, index) => (
      <tr key={index}>
        <td className="border px-4 py-2">{new Date(item.date).toLocaleDateString()}</td>
        <td className="border px-4 py-2">{item.category}</td>
        <td className="border px-4 py-2">${item.amount.toFixed(2)}</td>
      </tr>
    ));
  };

  if (status === 'loading') {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white mb-4">Economy & Budget</h1>

      {/* Navigation buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Add your navigation links here */}
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

      {/* Financial Summary Section */}
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md">
        <h2 className="text-lg font-semibold text-white mb-4">Financial Summary</h2>
        <p className="text-white mb-2">Overall Balance: ${categorySummary.balance.toFixed(2)}</p>
        
        {/* Display receipt breakdown with dates */}
        <div className="overflow-x-auto">
          <h3 className="text-white">Receipts Breakdown</h3>
          <table className="min-w-full text-white">
            <thead>
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {renderReceiptBreakdown()}
            </tbody>
          </table>
        </div>
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

      {/* Other charts and sections */}
    </div>
  );
}
