'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

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

export default function EconomyAndBudget() {
  const [dailyBalances, setDailyBalances] = useState<DailyBalance[]>([]);
  const [currentMonthBalance, setCurrentMonthBalance] = useState<Balance | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [error, setError] = useState('');
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchMonthData(selectedMonth);
    }
  }, [status, selectedMonth]);

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
        type: 'time',
        time: {
          unit: 'day',
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
          label: (context) => `Balance: $${context.parsed.y.toFixed(2)}`
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
  const fetchMonthData = async (date: Date) => {
    try {
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      // Fetch starting balance for the selected month
      const balanceRes = await fetch(`/api/balances?month=${month}&year=${year}`);
      if (!balanceRes.ok) throw new Error('Failed to fetch balance');
      const balanceData = await balanceRes.json();
      setCurrentMonthBalance(balanceData[0] || null);

      // Fetch incomes for the selected month
      const incomesRes = await fetch(`/api/income?month=${month}&year=${year}`);
      if (!incomesRes.ok) throw new Error('Failed to fetch incomes');
      const incomesData = await incomesRes.json();
      setIncomes(incomesData);

      // Fetch expenses for the selected month
      const expensesRes = await fetch(`/api/expenses?month=${month}&year=${year}`);
      if (!expensesRes.ok) throw new Error('Failed to fetch expenses');
      const expensesData = await expensesRes.json();
      setExpenses(expensesData);

      // Calculate daily balances
      const dailyBalances = calculateDailyBalances(balanceData[0]?.startingBalance || 0, incomesData, expensesData, year, month);
      setDailyBalances(dailyBalances);

    } catch (err) {
      console.error('Failed to fetch month data:', err);
      setError('Failed to load month data. Please try again.');
    }
  };

  const calculateDailyBalances = (startingBalance: number, incomes: Income[], expenses: Expense[], year: number, month: number): DailyBalance[] => {
    const daysInMonth = new Date(year, month, 0).getDate();
    let currentBalance = startingBalance;
    const dailyBalances: DailyBalance[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateString = date.toISOString().split('T')[0];
      
      const dayIncomes = incomes.filter(income => income.date.startsWith(dateString));
      const dayExpenses = expenses.filter(expense => expense.date.startsWith(dateString));

      dayIncomes.forEach(income => currentBalance += income.amount);
      dayExpenses.forEach(expense => currentBalance -= expense.amount);

      dailyBalances.push({
        date: dateString,
        balance: currentBalance,
        expenses: dayExpenses
      });
    }

    return dailyBalances;
  };

  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const startingBalance = currentMonthBalance?.startingBalance || 0;
  const availableBalance = startingBalance + totalIncome - totalExpenses;

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

  const projectionChartData = generateProjectionChartData(dailyBalances);

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
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md">
        <h2 className="text-lg font-semibold text-white mb-2">Current Month Summary</h2>
        <p className="text-white">Starting Balance: ${startingBalance.toFixed(2)}</p>
        <p className="text-white">Total Income: ${totalIncome.toFixed(2)}</p>
        <p className="text-white">Total Expenses: ${totalExpenses.toFixed(2)}</p>
        <p className="text-white font-bold">Available Balance: ${availableBalance.toFixed(2)}</p>
      </div>
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Daily Balance</h2>
          <div>
            <button onClick={handlePreviousMonth} className="bg-blue-500 text-white px-2 py-1 rounded mr-2">Previous Month</button>
            <span className="text-white">{selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
            <button onClick={handleNextMonth} className="bg-blue-500 text-white px-2 py-1 rounded ml-2">Next Month</button>
          </div>
        </div>
        <div className="aspect-w-16 aspect-h-9 h-64">
          <Line 
            data={{
              labels: dailyBalances.map(db => db.date),
              datasets: [{
                label: 'Balance',
                data: dailyBalances.map(db => db.balance),
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
                    unit: 'day',
                    displayFormats: {
                      day: 'MMM d'
                    }
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
                          projectionPeriod === 'quarterly' ? 'quarter' : 'year',
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
              }
            }}
          />
        </div>
      </div>
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md">
        <h2 className="text-lg font-semibold text-white mb-2">Daily Balance Table</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-white">
            <thead>
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Balance</th>
                <th className="px-4 py-2">Expenses</th>
              </tr>
            </thead>
            <tbody>
              {dailyBalances.map((day) => (
                <tr key={day.date}>
                  <td className="border px-4 py-2">{new Date(day.date).toLocaleDateString()}</td>
                  <td className="border px-4 py-2">${day.balance.toFixed(2)}</td>
                  <td className="border px-4 py-2">
                    {day.expenses.map((expense) => (
                      <div key={expense.id}>
                        {expense.description}: ${expense.amount.toFixed(2)}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-2">
        <Link href="/dashboard/economy/manage-incomes" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-center text-sm">
          Manage Incomes
        </Link>
        <Link href="/dashboard/economy/manage-expenses" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-center text-sm">
          Manage Expenses
        </Link>
        <Link href="/dashboard/economy/manage-receipts" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-center text-sm">
          Manage Receipts
        </Link>
        <Link href="/dashboard/economy/manage-balances" className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-center text-sm">
          Manage Balances
        </Link>
        <Link href="/dashboard/economy/expense-categories" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-center text-sm">
          Manage Categories
        </Link>
      </div>
    </div>
  );
}

function generateProjectionChartData(dailyBalances: DailyBalance[]) {
  const dailyData = dailyBalances.map(db => ({
    date: db.date,
    balance: db.balance
  }));

  const weeklyData = aggregateData(dailyData, 7);
  const monthlyData = aggregateData(dailyData, 30);
  const quarterlyData = aggregateData(dailyData, 91);
  const yearlyData = aggregateData(dailyData, 365);

  return {
    daily: { labels: dailyData.map(d => d.date), data: dailyData.map(d => d.balance) },
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

function aggregateData(dailyData: { date: string; balance: number }[], days: number) {
  const aggregatedData: { [key: string]: number } = {};
  let currentSum = 0;
  let count = 0;

  Object.entries(dailyData).forEach(([date, value], index) => {
    currentSum = value.balance;
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