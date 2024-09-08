'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Income {
  id: string;
  source: string;
  amount: number;
  date: string;
  recurrenceInterval: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null;
  recurrenceEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ManageIncomes() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchIncomes();
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

  const handleEditIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncome) return;

    try {
      const res = await fetch(`/api/income/${editingIncome.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingIncome),
      });

      if (res.ok) {
        setEditingIncome(null);
        fetchIncomes();
      } else {
        throw new Error('Failed to update income');
      }
    } catch (error) {
      console.error('Error updating income:', error);
      setError('Failed to update income. Please try again.');
    }
  };

  const handleDeleteIncome = async (id: string) => {
    if (!confirm('Are you sure you want to delete this income?')) return;

    try {
      const res = await fetch(`/api/income/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchIncomes();
      } else {
        throw new Error('Failed to delete income');
      }
    } catch (error) {
      console.error('Error deleting income:', error);
      setError('Failed to delete income. Please try again.');
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto mt-10">
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-2xl font-bold">Manage Incomes</h1>
        <Link href="/dashboard/economy" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
          Back to Economy
        </Link>
      </div>
      <Link href="/dashboard/economy/add-income" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out mb-4 inline-block">
        Add Income
      </Link>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <ul className="space-y-4">
        {incomes.map((income) => (
          <li key={income.id} className="bg-white bg-opacity-10 p-4 rounded">
            {editingIncome?.id === income.id ? (
              <form onSubmit={handleEditIncome} className="space-y-2">
                <input
                  type="text"
                  value={editingIncome.source}
                  onChange={(e) => setEditingIncome({ ...editingIncome, source: e.target.value })}
                  className="w-full p-2 border rounded text-black"
                  required
                />
                <input
                  type="number"
                  value={editingIncome.amount}
                  onChange={(e) => setEditingIncome({ ...editingIncome, amount: parseFloat(e.target.value) })}
                  className="w-full p-2 border rounded text-black"
                  required
                  step="0.01"
                />
                <input
                  type="date"
                  value={editingIncome.date.split('T')[0]}
                  onChange={(e) => setEditingIncome({ ...editingIncome, date: e.target.value })}
                  className="w-full p-2 border rounded text-black"
                  required
                />
                <select
                  value={editingIncome.recurrenceInterval || 'NONE'}
                  onChange={(e) => setEditingIncome({ ...editingIncome, recurrenceInterval: e.target.value as Income['recurrenceInterval'] })}
                  className="w-full p-2 border rounded text-black"
                >
                  <option value="NONE">None</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
                {editingIncome.recurrenceInterval && editingIncome.recurrenceInterval !== 'NONE' && (
                  <input
                    type="date"
                    value={editingIncome.recurrenceEnd?.split('T')[0] || ''}
                    onChange={(e) => setEditingIncome({ ...editingIncome, recurrenceEnd: e.target.value })}
                    className="w-full p-2 border rounded text-black"
                  />
                )}
                <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded mr-2">Save</button>
                <button onClick={() => setEditingIncome(null)} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
              </form>
            ) : (
              <>
                <p>Source: {income.source}</p>
                <p>Amount: ${income.amount.toFixed(2)}</p>
                <p>Date: {new Date(income.date).toLocaleDateString()}</p>
                <p>Recurrence: {income.recurrenceInterval || 'None'}</p>
                {income.recurrenceEnd && <p>Recurrence End: {new Date(income.recurrenceEnd).toLocaleDateString()}</p>}
                <p>Created: {new Date(income.createdAt).toLocaleString()}</p>
                <p>Updated: {new Date(income.updatedAt).toLocaleString()}</p>
                <div className="mt-2">
                  <button onClick={() => setEditingIncome(income)} className="text-blue-500 mr-2">Edit</button>
                  <button onClick={() => handleDeleteIncome(income.id)} className="text-red-500">Delete</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}