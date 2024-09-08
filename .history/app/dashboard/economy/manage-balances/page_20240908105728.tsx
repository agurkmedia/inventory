'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Balance {
  id: string;
  month: number;
  year: number;
  startingBalance: number;
  remainingBalance: number | null;
  createdAt: string;
  updatedAt: string;
}

export default function ManageBalances() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [editingBalance, setEditingBalance] = useState<Balance | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchBalances();
    }
  }, [status]);

  const fetchBalances = async () => {
    try {
      const res = await fetch('/api/balances');
      if (!res.ok) throw new Error('Failed to fetch balances');
      const data = await res.json();
      setBalances(data);
    } catch (err) {
      console.error('Failed to fetch balances:', err);
      setError('Failed to load balances. Please try again.');
    }
  };

  const handleEditBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBalance) return;

    try {
      const res = await fetch(`/api/balances/${editingBalance.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingBalance),
      });

      if (res.ok) {
        setEditingBalance(null);
        fetchBalances();
      } else {
        throw new Error('Failed to update balance');
      }
    } catch (error) {
      console.error('Error updating balance:', error);
      setError('Failed to update balance. Please try again.');
    }
  };

  const handleDeleteBalance = async (id: string) => {
    if (!confirm('Are you sure you want to delete this balance?')) return;

    try {
      const res = await fetch(`/api/balances/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchBalances();
      } else {
        throw new Error('Failed to delete balance');
      }
    } catch (error) {
      console.error('Error deleting balance:', error);
      setError('Failed to delete balance. Please try again.');
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto mt-10">
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-2xl font-bold">Manage Balances</h1>
        <Link href="/dashboard/economy" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
          Back to Economy
        </Link>
      </div>
      <Link href="/dashboard/economy/add-balance" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out mb-4 inline-block">
        Add Balance
      </Link>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <ul className="space-y-4">
        {balances.map((balance) => (
          <li key={balance.id} className="bg-white bg-opacity-10 p-4 rounded">
            {editingBalance?.id === balance.id ? (
              <form onSubmit={handleEditBalance} className="space-y-2">
                <div>
                  <label htmlFor="month" className="block text-sm font-medium text-gray-700">Month</label>
                  <input
                    type="number"
                    id="month"
                    value={editingBalance.month}
                    onChange={(e) => setEditingBalance({ ...editingBalance, month: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded text-black"
                    required
                    min="1"
                    max="12"
                  />
                </div>
                <div>
                  <label htmlFor="year" className="block text-sm font-medium text-gray-700">Year</label>
                  <input
                    type="number"
                    id="year"
                    value={editingBalance.year}
                    onChange={(e) => setEditingBalance({ ...editingBalance, year: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded text-black"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="startingBalance" className="block text-sm font-medium text-gray-700">Starting Balance</label>
                  <input
                    type="number"
                    id="startingBalance"
                    value={editingBalance.startingBalance}
                    onChange={(e) => setEditingBalance({ ...editingBalance, startingBalance: parseFloat(e.target.value) })}
                    className="w-full p-2 border rounded text-black"
                    required
                    step="0.01"
                  />
                </div>
                <div>
                  <label htmlFor="remainingBalance" className="block text-sm font-medium text-gray-700">Remaining Balance</label>
                  <input
                    type="number"
                    id="remainingBalance"
                    value={editingBalance.remainingBalance || ''}
                <input
                  type="number"
                  value={editingBalance.month}
                  onChange={(e) => setEditingBalance({ ...editingBalance, month: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded text-black"
                  required
                  min="1"
                  max="12"
                />
                <input
                  type="number"
                  value={editingBalance.year}
                  onChange={(e) => setEditingBalance({ ...editingBalance, year: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded text-black"
                  required
                />
                <input
                  type="number"
                  value={editingBalance.startingBalance}
                  onChange={(e) => setEditingBalance({ ...editingBalance, startingBalance: parseFloat(e.target.value) })}
                  className="w-full p-2 border rounded text-black"
                  required
                  step="0.01"
                />
                <input
                  type="number"
                  value={editingBalance.remainingBalance || ''}
                  onChange={(e) => setEditingBalance({ ...editingBalance, remainingBalance: parseFloat(e.target.value) })}
                  className="w-full p-2 border rounded text-black"
                  step="0.01"
                />
                <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded mr-2">Save</button>
                <button onClick={() => setEditingBalance(null)} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
              </form>
            ) : (
              <>
                <p>Month: {balance.month}</p>
                <p>Year: {balance.year}</p>
                <p>Starting Balance: ${balance.startingBalance.toFixed(2)}</p>
                <p>Remaining Balance: ${balance.remainingBalance?.toFixed(2) || 'N/A'}</p>
                <p>Created: {new Date(balance.createdAt).toLocaleString()}</p>
                <p>Updated: {new Date(balance.updatedAt).toLocaleString()}</p>
                <div className="mt-2">
                  <button onClick={() => setEditingBalance(balance)} className="text-blue-500 mr-2">Edit</button>
                  <button onClick={() => handleDeleteBalance(balance.id)} className="text-red-500">Delete</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}