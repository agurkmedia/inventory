'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function AddBalance() {
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [startingBalance, setStartingBalance] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { data: session, status } = useSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: parseInt(month),
          year: parseInt(year),
          startingBalance: parseFloat(startingBalance),
        }),
      });

      if (res.ok) {
        router.push('/dashboard/economy/manage-balances');
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add balance');
      }
    } catch (error) {
      console.error('Error adding balance:', error);
      setError(error.message || 'An error occurred while adding balance');
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-5">Add Balance</h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="month" className="block text-sm font-medium text-gray-700">Month</label>
          <input
            type="number"
            id="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            required
            min="1"
            max="12"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black bg-white"
          />
        </div>
        <div>
          <label htmlFor="year" className="block text-sm font-medium text-gray-700">Year</label>
          <input
            type="number"
            id="year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            required
            min="2000"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black bg-white"
          />
        </div>
        <div>
          <label htmlFor="startingBalance" className="block text-sm font-medium text-gray-700">Starting Balance</label>
          <input
            type="number"
            id="startingBalance"
            value={startingBalance}
            onChange={(e) => setStartingBalance(e.target.value)}
            required
            step="0.01"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black bg-white"
          />
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Add Balance
        </button>
      </form>
    </div>
  );
}