'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Line, Pie, Bar, Doughnut } from 'react-chartjs-2';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
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
  mode: string;
  data: Array<{
    period: string;
    incomes: {
      total: number;
      breakdown: { [key: string]: number };
    };
    expenses: {
      total: number;
      breakdown: { [key: string]: number };
    };
    receipts: {
      total: number;
      breakdown: { [key: string]: number };
    };
    balance: number;
  }>;
}

export default function EconomyAndBudget() {
  const [dailyBalances, setDailyBalances] = useState<DailyBalance[]>([]);
  const [currentMonthBalance, setCurrentMonthBalance] = useState<Balance | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [error, setError] = useState('');
  const { data: session, status } = useSession();
  const initializeRef = useRef(false);
  const [categorySummary, setCategorySummary] = useState<CategorySummary>({
    mode: 'monthly',
    data: []
  });
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [showHuslan, setShowHuslan] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'amount'>('amount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
      fetchCategorySummary(selectedMonth, viewMode);
    }
  }, [selectedMonth, status, viewMode]);

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

  const fetchCategorySummary = async (date: Date, mode: 'monthly' | 'yearly') => {
    try {
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const res = await fetch(`/api/balances/category-summary?month=${month}&year=${year}&mode=${mode}`);
      if (!res.ok) throw new Error('Failed to fetch category summary');
      const data = await res.json();
  
      // Debugging: Log the category summary response
      console.log('Category Summary:', data);
  
      setCategorySummary(data);
    } catch (err) {
      console.error('Failed to fetch category summary:', err);
      setError('Failed to load category summary. Please try again.');
    }
  };
  

  const fetchYearlyData = async (year: number) => {
    try {
      const yearlyData = await Promise.all(
        Array.from({ length: 12 }, (_, i) => i + 1).map(async (month) => {
          const res = await fetch(`/api/balances/category-summary?month=${month}&year=${year}`);
          if (!res.ok) throw new Error(`Failed to fetch data for month ${month}`);
          return res.json();
        })
      );

      const summarizedData = yearlyData.reduce((acc, monthData) => {
        acc.incomes.total += monthData.incomes.total;
        acc.expenses.total += monthData.expenses.total;
        
        // Aggregate income breakdown
        monthData.incomes.breakdown.forEach((income) => {
          const existingIncome = acc.incomes.breakdown.find(i => i.source === income.source);
          if (existingIncome) {
            existingIncome.amount += income.amount;
          } else {
            acc.incomes.breakdown.push({ ...income });
          }
        });

        // Aggregate expense breakdown
        Object.entries(monthData.expenses.breakdown).forEach(([category, amount]) => {
          acc.expenses.breakdown[category] = (acc.expenses.breakdown[category] || 0) + (amount as number);
        });

        // Aggregate receipts
        acc.receipts.total += monthData.receipts.total;
        monthData.receipts.breakdown.forEach((receipt) => {
          acc.receipts.breakdown.push({ ...receipt });
        });

        return acc;
      }, {
        incomes: { total: 0, breakdown: [] },
        expenses: { total: 0, breakdown: {} },
        receipts: { total: 0, breakdown: [] },
        balance: 0
      } as CategorySummary);

      summarizedData.balance = summarizedData.incomes.total - summarizedData.expenses.total;

      setCategorySummary(summarizedData);
      setCurrentMonthBalance({
        id: 'yearly',
        month: 0,
        year: year,
        startingBalance: yearlyData[0].startingBalance,
        remainingBalance: yearlyData[11].remainingBalance
      });
    } catch (err) {
      console.error('Failed to fetch yearly data:', err);
      setError('Failed to load yearly data. Please try again.');
    }
  };

  const handleViewChange = (mode: 'monthly' | 'yearly') => {
    setViewMode(mode);
    fetchCategorySummary(selectedMonth, mode);
  };

  const handleDateRangeChange = (dates: [Date | null, Date | null]) => {
    setDateRange(dates);
    // Implement custom date range fetching logic here
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

  const renderPieChart = (data: any, title: string) => {
    if (!data || Object.keys(data).length === 0) {
      return <p className="text-white">No data available for {title}</p>;
    }

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
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
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

    return <div className="h-80"><Pie data={chartData} options={options} /></div>;
  };
  

  const renderBarChart = (data: any, title: string, color: string) => {
    if (!data || Object.keys(data).length === 0) {
      return <p className="text-white">No data available for {title}</p>;
    }

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

  const renderReceiptBreakdown = () => {
    if (!categorySummary.data || categorySummary.data.length === 0 || !categorySummary.data[0].receipts.breakdown) {
      return (
        <tr>
          <td colSpan={2} className="border px-4 py-2 text-center">No receipt data available</td>
        </tr>
      );
    }

    const receiptBreakdown = categorySummary.data[0].receipts.breakdown;
    
    return Object.entries(receiptBreakdown).map(([category, amount], index) => (
      <tr key={index}>
        <td className="border px-4 py-2">{category}</td>
        <td className="border px-4 py-2">${Math.abs(amount as number).toFixed(2)}</td>
      </tr>
    ));
  };

  const renderReceiptStackedBarChart = () => {
    if (!categorySummary.data || categorySummary.data.length === 0 || !categorySummary.data[0].expenses.breakdown) {
      return <p className="text-white">No expense data available</p>;
    }

    const expenseBreakdown = categorySummary.data[0].expenses.breakdown;
    let categories = Object.keys(expenseBreakdown);
    let amounts = Object.values(expenseBreakdown).map(amount => Math.abs(amount as number));

    // Filter out "Huslån" if checkbox is unchecked
    if (!showHuslan) {
      const huslanIndex = categories.indexOf("Huslån");
      if (huslanIndex !== -1) {
        categories = categories.filter(cat => cat !== "Huslån");
        amounts = amounts.filter((_, index) => index !== huslanIndex);
      }
    }

    // Sort the data
    const sortedData = categories.map((category, index) => ({ category, amount: amounts[index] }));
    sortedData.sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' ? a.category.localeCompare(b.category) : b.category.localeCompare(a.category);
      } else {
        return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
    });

    const sortedCategories = sortedData.map(item => item.category);
    const sortedAmounts = sortedData.map(item => item.amount);

    const data = {
      labels: ['Expenses'],
      datasets: sortedCategories.map((category, index) => ({
        label: category,
        data: [sortedAmounts[index]],
        backgroundColor: `hsl(${index * (360 / sortedCategories.length)}, 70%, 50%)`,
      })),
    };

    const options = {
      responsive: true,
      scales: {
        x: { stacked: true, ticks: { color: 'white' } },
        y: { stacked: true, ticks: { color: 'white' } },
      },
      plugins: {
        legend: { display: true, position: 'right' as const, labels: { color: 'white' } },
        title: {
          display: true,
          text: 'Expense Breakdown Summary',
          color: 'white',
          font: { size: 16 },
        },
      },
    };

    return (
      <div>
        <div className="flex items-center mb-2 space-x-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showHuslan"
              checked={showHuslan}
              onChange={(e) => setShowHuslan(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="showHuslan" className="text-white">Show Huslån</label>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSortBy('name')}
              className={`px-2 py-1 rounded ${sortBy === 'name' ? 'bg-blue-600' : 'bg-blue-400'} text-white`}
            >
              Sort by Name
            </button>
            <button
              onClick={() => setSortBy('amount')}
              className={`px-2 py-1 rounded ${sortBy === 'amount' ? 'bg-blue-600' : 'bg-blue-400'} text-white`}
            >
              Sort by Amount
            </button>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-1 rounded bg-blue-400 text-white"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="showHuslan"
            checked={showHuslan}
            onChange={(e) => setShowHuslan(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="showHuslan" className="text-white">Show Huslån</label>
        </div>
        <Bar data={data} options={options} />
      </div>
    );
  };

  if (status === 'loading') {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <div className="space-y-4 h-full">
      <h1 className="text-2xl font-bold text-white mb-4">Economy & Budget</h1>
      
      {/* View mode toggle */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => handleViewChange('monthly')}
          className={`px-4 py-2 rounded ${viewMode === 'monthly' ? 'bg-blue-600' : 'bg-blue-400'} text-white`}
        >
          Monthly
        </button>
        <button
          onClick={() => handleViewChange('yearly')}
          className={`px-4 py-2 rounded ${viewMode === 'yearly' ? 'bg-blue-600' : 'bg-blue-400'} text-white`}
        >
          Yearly
        </button>
      </div>

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
      
      {/* Current Summary */}
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">{viewMode === 'yearly' ? 'Yearly Summary' : 'Current Month Summary'}</h2>
          <div>
            {viewMode === 'yearly' ? (
              <>
                <button onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear() - 1, 0))} className="bg-blue-500 text-white px-2 py-1 rounded mr-2">Previous Year</button>
                <span className="text-white">{selectedMonth.getFullYear()}</span>
                <button onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear() + 1, 0))} className="bg-blue-500 text-white px-2 py-1 rounded ml-2">Next Year</button>
              </>
            ) : (
              <>
                <button onClick={handlePreviousMonth} className="bg-blue-500 text-white px-2 py-1 rounded mr-2">Previous Month</button>
                <span className="text-white">{selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                <button onClick={handleNextMonth} className="bg-blue-500 text-white px-2 py-1 rounded ml-2">Next Month</button>
              </>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <div>
            <p className="text-white">Starting Balance: ${currentMonthBalance?.startingBalance?.toFixed(2) || '0.00'}</p>
            <p className="text-white">Remaining Balance: ${currentMonthBalance?.remainingBalance?.toFixed(2) || '0.00'}</p>
          </div>
          <p className={`text-white text-xl font-bold ${
            categorySummary.data?.[0]?.balance >= 0 ? 'text-green-500' : 
            categorySummary.data?.[0]?.balance > -1000 ? 'text-red-500' : 
            'text-red-700'
          }`}>
            Overall Balance: ${categorySummary.data?.[0]?.balance?.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* Financial Summary Section */}
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md">
        <h2 className="text-lg font-semibold text-white mb-4">Financial Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>{renderPieChart(categorySummary.data?.[0]?.incomes?.breakdown || {}, 'Income Breakdown')}</div>
          <div>{renderPieChart(categorySummary.data?.[0]?.expenses?.breakdown || {}, 'Expense Breakdown')}</div>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>{renderBarChart(categorySummary.data?.[0]?.incomes?.breakdown || {}, 'Income Breakdown', '#4CAF50')}</div>
          <div>{renderBarChart(categorySummary.data?.[0]?.expenses?.breakdown || {}, 'Expense Breakdown', '#F44336')}</div>
        </div>
      </div>

      {/* Receipt Breakdown */}
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md">
        <h3 className="text-lg font-semibold text-white mb-2">Expense Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="overflow-x-auto">
            <table className="min-w-full text-white">
              <thead>
                <tr>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {renderReceiptBreakdown()}
              </tbody>
            </table>
          </div>
          <div className="h-80">
            {renderReceiptStackedBarChart()}
          </div>
        </div>
      </div>
      
      {/* Daily Balance Chart */}
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Daily Balance</h2>
          <div>
            {viewMode === 'yearly' ? (
              <>
                <button onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear() - 1, 0))} className="bg-blue-500 text-white px-2 py-1 rounded mr-2">Previous Year</button>
                <span className="text-white">{selectedMonth.getFullYear()}</span>
                <button onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear() + 1, 0))} className="bg-blue-500 text-white px-2 py-1 rounded ml-2">Next Year</button>
              </>
            ) : (
              <>
                <button onClick={handlePreviousMonth} className="bg-blue-500 text-white px-2 py-1 rounded mr-2">Previous Month</button>
                <span className="text-white">{selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                <button onClick={handleNextMonth} className="bg-blue-500 text-white px-2 py-1 rounded ml-2">Next Month</button>
              </>
            )}
          </div>
        </div>
        <div className="h-64">
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
