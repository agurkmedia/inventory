 'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

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
  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const res = await fetch(`/api/expense-categories/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchCategories();
      } else {
        throw new Error('Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      setError('Failed to delete category. Please try again.');
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-5">Expense Categories</h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <form onSubmit={handleCreateCategory} className="mb-8">
        <div className="flex items-center">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New Category Name"
            className="flex-grow mr-2 p-2 border rounded text-black"
            required
          />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
            Add Category
          </button>
        </div>
      </form>
      <ul className="space-y-4">
        {categories.map((category) => (
          <li key={category.id} className="flex items-center justify-between bg-white bg-opacity-10 p-4 rounded">
            {editingCategory?.id === category.id ? (
              <form onSubmit={handleEditCategory} className="flex-grow flex items-center">
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="flex-grow mr-2 p-2 border rounded text-black"
                  required
                />
                <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded mr-2">
                  Save
                </button>
                <button onClick={() => setEditingCategory(null)} className="bg-gray-500 text-white px-4 py-2 rounded">
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <span>{category.name}</span>
                <div>
                  <button onClick={() => setEditingCategory(category)} className="text-blue-500 mr-2">
                    Edit
                  </button>
                  <button onClick={() => handleDeleteCategory(category.id)} className="text-red-500">
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}