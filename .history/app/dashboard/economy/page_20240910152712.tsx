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
  ArcElement
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
  ArcElement
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
    receipts: { total: 0, breakdown: {} },
    balance: 0
  });

  useEffect(() => {
    if (status === 'authenticated' && !initializeRef.current) {
      initializeRef.current = true;
      initializeBalances().then(() => {
        fetchMonthData(selectedMonth);
      });
    }
  }, [status, selectedMonth]); // Add selectedMonth here

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
          unit: 'day' as const, // Change this line
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

  const renderPieChart = (data: { [category: string]: number }, title: string, total: number) => {
    const chartData = {
      labels: Object.keys(data),
      datasets: [
        {
          data: Object.values(data),
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
            '#FF9999', '#66B2FF', '#99FF99', '#FFCC99', '#FF99CC', '#99CCFF'
          ],
        },
      ],
    };

    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'right' as const,
          labels: { color: 'white' }
        },
        title: {
          display: true,
          text: `${title} - Total: $${total.toFixed(2)}`,
          color: 'white',
          font: { size: 16 }
        }
      }
    };

    return <Pie data={chartData} options={options} />;
  };

  const renderBarChart = (data: { [category: string]: number }, title: string, color: string) => {
    const chartData = {
      labels: Object.keys(data),
      datasets: [{
        label: title,
        data: Object.values(data),
        backgroundColor: color,
      }]
    };

    const options = {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: 'white' }
        },
        x: { ticks: { color: 'white' } }
      },
      plugins: {
        legend: { labels: { color: 'white' } },
        title: {
          display: true,
          text: title,
          color: 'white',
          font: { size: 16 }
        }
      }
    };

    return <Bar data={chartData} options={options} />;
  };

  const renderDoughnutChart = (data: { [category: string]: number }, title: string) => {
    const chartData = {
      labels: Object.keys(data),
      datasets: [{
        data: Object.values(data),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
          '#FF9999', '#66B2FF', '#99FF99', '#FFCC99', '#FF99CC', '#99CCFF'
        ],
      }]
    };

    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'right' as const,
          labels: { color: 'white' }
        },
        title: {
          display: true,
          text: title,
          color: 'white',
          font: { size: 16 }
        }
      }
    };

    return <Doughnut data={chartData} options={options} />;
  };

  const renderIncomeVsExpenseChart = () => {
    const chartData = {
      labels: ['Income', 'Expenses'],
      datasets: [{
        label: 'Amount',
        data: [categorySummary.incomes.total, categorySummary.expenses.total + categorySummary.receipts.total],
        backgroundColor: ['#4BC0C0', '#FF6384'],
      }]
    };

    const options = {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: 'white' }
        },
        x: { ticks: { color: 'white' } }
      },
      plugins: {
        legend: { labels: { color: 'white' } },
        title: {
          display: true,
          text: 'Income vs Expenses',
          color: 'white',
          font: { size: 16 }
        }
      }
    };

    return <Bar data={chartData} options={options} />;
  };

  const renderBalanceStatusChart = () => {
    const balance = categorySummary.balance;
    const isPositive = balance >= 0;
    const chartData = {
      labels: ['Balance'],
      datasets: [{
        label: 'Balance',
        data: [Math.abs(balance)],
        backgroundColor: isPositive ? '#4BC0C0' : '#FF6384',
      }]
    };

    const options = {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: 'white' }
        },
        x: { ticks: { color: 'white' } }
      },
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `Balance Status: ${isPositive ? 'Green' : 'Red'}`,
          color: 'white',
          font: { size: 16 }
        }
      }
    };

    return (
      <div>
        <Bar data={chartData} options={options} />
        <p className="text-white text-center mt-2">
          {isPositive ? 'In the green by' : 'In the red by'} ${Math.abs(balance).toFixed(2)}
        </p>
      </div>
    );
  };

  const renderIncomePieChart = () => {
    const incomeData = categorySummary.incomes.breakdown.reduce((acc, income) => {
      acc[income.source] = (acc[income.source] || 0) + income.amount;
      return acc;
    }, {} as { [source: string]: number });

    return renderPieChart(incomeData, 'Incomes', categorySummary.incomes.total);
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
      
      {/* Financial Summary Section */}
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md">
        <h2 className="text-lg font-semibold text-white mb-4">Financial Summary</h2>
        <p className="text-white mb-2">Overall Balance: ${categorySummary.balance.toFixed(2)}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="aspect-w-1 aspect-h-1">
            {renderPieChart(categorySummary.expenses.breakdown, 'Expenses', categorySummary.expenses.total)}
          </div>
          <div className="aspect-w-1 aspect-h-1">
            {renderDoughnutChart(categorySummary.receipts.breakdown, 'Receipts')}
          </div>
          <div className="aspect-w-1 aspect-h-1">
            {renderBarChart(categorySummary.expenses.breakdown, 'Expense Breakdown', '#FF6384')}
          </div>
          <div className="aspect-w-1 aspect-h-1">
            {renderIncomeVsExpenseChart()}
          </div>
          <div className="aspect-w-1 aspect-h-1">
            {renderBalanceStatusChart()}
          </div>
          <div className="aspect-w-1 aspect-h-1">
            {renderBarChart(
              categorySummary.incomes.breakdown.reduce((acc, income) => {
                acc[income.source] = (acc[income.source] || 0) + income.amount;
                return acc;
              }, {} as { [source: string]: number }),
              'Income Sources',
              '#4BC0C0'
            )}
          </div>
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