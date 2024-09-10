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
  date: string;
  isRecurring: boolean;
  recurrenceInterval: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | null;
  recurrenceEnd: string | null;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchExpenses();
      fetchCategories();
    }
  }, [status, currentPage, searchTerm]);

  const fetchExpenses = async () => {
    try {
      const res = await fetch(`/api/expenses?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}`);
      if (!res.ok) throw new Error('Failed to fetch expenses');
      const data = await res.json();
      setExpenses(data.expenses);
      setTotalPages(Math.ceil(data.total / itemsPerPage));
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

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto mt-10 px-4">
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-2xl font-bold">Manage Expenses</h1>
        <Link href="/dashboard/economy" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
          Back to Economy
        </Link>
      </div>
      <div className="flex justify-between items-center mb-5">
        <Link href="/dashboard/economy/add-expense" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
          Add Expense
        </Link>
        <input
          type="text"
          placeholder="Search expenses..."
          value={searchTerm}
          onChange={handleSearch}
          className="p-2 border rounded text-black"
        />
      </div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {expenses.map((expense) => (
          <div key={expense.id} className="bg-white bg-opacity-10 p-4 rounded">
            <p className="font-bold">${expense.amount.toFixed(2)}</p>
            <p>{expense.category.name}</p>
            <p>{expense.description}</p>
            <p>{new Date(expense.date).toLocaleDateString()}</p>
            {expense.isRecurring && (
              <p>Recurring: {expense.recurrenceInterval}</p>
            )}
            <div className="mt-2">
              <button onClick={() => setEditingExpense(expense)} className="text-blue-500 mr-2">Edit</button>
              <button onClick={() => handleDeleteExpense(expense.id)} className="text-red-500">Delete</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-center">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`mx-1 px-3 py-1 rounded ${currentPage === page ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}
          >
            {page}
          </button>
        ))}
      </div>
      {editingExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-4 rounded max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Edit Expense</h2>
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
                    <option value="QUARTERLY">Quarterly</option>
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
              <div className="flex justify-end space-x-2">
                <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">Save</button>
                <button onClick={() => setEditingExpense(null)} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}