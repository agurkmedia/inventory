'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
  description: string;
  notes: string | null;
  date: string;
  isRecurring: boolean;
  recurrenceInterval: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null;
  recurrenceEnd: string | null;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
}

export default function ManageExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchExpenses();
      fetchCategories();
    }
  }, [status]);

  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/expenses');
      if (!res.ok) throw new Error('Failed to fetch expenses');
      const data = await res.json();
      setExpenses(data);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
      setError('Failed to load expenses. Please try again.');
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/expense-categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setError('Failed to load categories. Please try again.');
    }
  };

  const handleEditExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;

    try {
      const res = await fetch(`/api/expenses/${editingExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingExpense),
      });

      if (res.ok) {
        setEditingExpense(null);
        fetchExpenses();
      } else {
        throw new Error('Failed to update expense');
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      setError('Failed to update expense. Please try again.');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchExpenses();
      } else {
        throw new Error('Failed to delete expense');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      setError('Failed to delete expense. Please try again.');
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-5">Manage Expenses</h1>
      <Link href="/dashboard/economy/add-expense" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out mb-4 inline-block">
        Add Expense
      </Link>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <ul className="space-y-4">
        {expenses.map((expense) => (
          <li key={expense.id} className="bg-white bg-opacity-10 p-4 rounded">
            {editingExpense?.id === expense.id ? (
              <form onSubmit={handleEditExpense} className="space-y-2">
                <input
                  type="number"
                  value={editingExpense.amount}
                  onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) })}
                  className="w-full p-2 border rounded text-black"
                  required
                  step="0.01"
                />
                <select
                  value={editingExpense.categoryId}
                  onChange={(e) => setEditingExpense({ ...editingExpense, categoryId: e.target.value })}
                  className="w-full p-2 border rounded text-black"
                  required
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={editingExpense.description}
                  onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                  className="w-full p-2 border rounded text-black"
                  required
                />
                <textarea
                  value={editingExpense.notes || ''}
                  onChange={(e) => setEditingExpense({ ...editingExpense, notes: e.target.value })}
                  className="w-full p-2 border rounded text-black"
                />
                <input
                  type="date"
                  value={editingExpense.date.split('T')[0]}
                  onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
                  className="w-full p-2 border rounded text-black"
                  required
                />
                <div>
                  <label>
                    <input
                      type="checkbox"
                      checked={editingExpense.isRecurring}
                      onChange={(e) => setEditingExpense({ ...editingExpense, isRecurring: e.target.checked })}
                    /> Is Recurring
                  </label>
                </div>
                {editingExpense.isRecurring && (
                  <>
                    <select
                      value={editingExpense.recurrenceInterval || ''}
                      onChange={(e) => setEditingExpense({ ...editingExpense, recurrenceInterval: e.target.value as Expense['recurrenceInterval'] })}
                      className="w-full p-2 border rounded text-black"
                    >
                      <option value="">Select Interval</option>
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                    <input
                      type="date"
                      value={editingExpense.recurrenceEnd?.split('T')[0] || ''}
                      onChange={(e) => setEditingExpense({ ...editingExpense, recurrenceEnd: e.target.value })}
                      className="w-full p-2 border rounded text-black"
                    />
                  </>
                )}
                <select
                  value={editingExpense.status}
                  onChange={(e) => setEditingExpense({ ...editingExpense, status: e.target.value as Expense['status'] })}
                  className="w-full p-2 border rounded text-black"
                >
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded mr-2">Save</button>
                <button onClick={() => setEditingExpense(null)} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
              </form>
            ) : (
              <>
                <p>Amount: ${expense.amount.toFixed(2)}</p>
                <p>Category: {expense.category.name}</p>
                <p>Description: {expense.description}</p>
                <p>Notes: {expense.notes || 'N/A'}</p>
                <p>Date: {new Date(expense.date).toLocaleDateString()}</p>
                <p>Is Recurring: {expense.isRecurring ? 'Yes' : 'No'}</p>
                {expense.isRecurring && (
                  <>
                    <p>Recurrence Interval: {expense.recurrenceInterval}</p>
                    <p>Recurrence End: {expense.recurrenceEnd ? new Date(expense.recurrenceEnd).toLocaleDateString() : 'N/A'}</p>
                  </>
                )}
                <p>Status: {expense.status}</p>
                <p>Created: {new Date(expense.createdAt).toLocaleString()}</p>
                <p>Updated: {new Date(expense.updatedAt).toLocaleString()}</p>
                <div className="mt-2">
                  <button onClick={() => setEditingExpense(expense)} className="text-blue-500 mr-2">Edit</button>
                  <button onClick={() => handleDeleteExpense(expense.id)} className="text-red-500">Delete</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}