'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface ExpenseCategory {
  id: string;
  name: string;
  itemCount: number;
  totalCost: number;
  items?: {
    id: string;
    name: string;
    quantity: number;
    price: number;
  }[];
}

export default function ExpenseCategories() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<ExpenseCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCategories();
    }
  }, [status]);

  useEffect(() => {
    const filtered = categories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCategories(filtered);
  }, [searchTerm, categories]);

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

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/expense-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName }),
      });

      if (res.ok) {
        setNewCategoryName('');
        fetchCategories();
      } else {
        throw new Error('Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      setError('Failed to create category. Please try again.');
    }
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    try {
      const res = await fetch(`/api/expense-categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingCategory.name }),
      });

      if (res.ok) {
        setEditingCategory(null);
        fetchCategories();
      } else {
        throw new Error('Failed to update category');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      setError('Failed to update category. Please try again.');
    }
  };

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleViewCategory = async (category: ExpenseCategory) => {
    try {
      const res = await fetch(`/api/expense-categories/${category.id}/details`);
      if (!res.ok) throw new Error('Failed to fetch category details');
      const details = await res.json();
      setSelectedCategory({ ...category, details });
    } catch (error) {
      console.error('Error fetching category details:', error);
      setError('Failed to fetch category details. Please try again.');
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto mt-10">
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-2xl font-bold">Manage Expense Categories</h1>
        <Link href="/dashboard/economy" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
          Back to Economy
        </Link>
      </div>
      
      {/* Search input */}
      <input
        type="text"
        placeholder="Search categories"
        value={searchTerm}
        onChange={handleSearchChange}
        className="w-full p-2 mb-4 border rounded text-black"
      />

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
        {filteredCategories.map((category) => (
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
                <div>
                  <span className="font-bold">{category.name}</span>
                  <p className="text-sm text-gray-300">
                    Items: {category.itemCount ?? 'N/A'} | 
                    Total Cost: {category.totalCost ? `${category.totalCost.toFixed(2)} NOK` : 'N/A'}
                  </p>
                </div>
                <div>
                  <button onClick={() => handleViewCategory(category)} className="text-blue-500 mr-2">
                    View
                  </button>
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

      {/* Category Details Modal */}
      {selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full">
            <h2 className="text-2xl font-bold mb-4">{selectedCategory.name}</h2>
            <p>Total Items: {selectedCategory.itemCount}</p>
            <p>Total Cost: {selectedCategory.totalCost.toFixed(2)} NOK</p>
            <h3 className="text-xl font-semibold mt-4 mb-2">Items:</h3>
            <ul>
              {selectedCategory.details?.items.map((item: any) => (
                <li key={item.id} className="mb-2">
                  <p>{item.name}</p>
                  <p className="text-sm text-gray-600">Quantity: {item.quantity} | Price: {item.price.toFixed(2)} NOK</p>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setSelectedCategory(null)}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}