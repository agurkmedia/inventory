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
    date: string;
    categoryId: string;
  }[];
  highlightedItemId?: string;
}

export default function ExpenseCategories() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<ExpenseCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [allCategories, setAllCategories] = useState<ExpenseCategory[]>([]);
  const [itemCategoryChanges, setItemCategoryChanges] = useState<{[key: string]: string}>({});
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCategories();
      fetchAllCategories();
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

  const fetchAllCategories = async () => {
    try {
      const res = await fetch('/api/expense-categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      setAllCategories(data);
    } catch (err) {
      console.error('Failed to fetch all categories:', err);
      setError('Failed to load all categories. Please try again.');
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

  const handleViewCategory = async (category: ExpenseCategory, highlightedItemId?: string) => {
    try {
      const res = await fetch(`/api/expense-categories/${category.id}/details`);
      if (!res.ok) throw new Error('Failed to fetch category details');
      const details = await res.json();
      setSelectedCategory({...details, highlightedItemId});
    } catch (error) {
      console.error('Error fetching category details:', error);
      setError('Failed to fetch category details. Please try again.');
    }
  };

  const handleCategoryChange = (itemId: string, newCategoryId: string) => {
    setItemCategoryChanges(prev => ({...prev, [itemId]: newCategoryId}));
  };

  const handleSaveCategoryChange = async (itemId: string) => {
    try {
      const newCategoryId = itemCategoryChanges[itemId];
      if (!newCategoryId) return;

      const res = await fetch(`/api/receipt-items/${itemId}/change-category`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newCategoryId }),
      });

      if (!res.ok) throw new Error('Failed to update item category');

      // Refresh the category details
      if (selectedCategory) {
        await handleViewCategory(selectedCategory);
      }

      // Clear the change for this item
      setItemCategoryChanges(prev => {
        const newChanges = {...prev};
        delete newChanges[itemId];
        return newChanges;
      });

      setError('');
    } catch (err) {
      console.error('Failed to update item category:', err);
      setError('Failed to update item category. Please try again.');
    }
  };

  const highlightStyle = `
    @keyframes breathe {
      0%, 100% { background-color: rgba(0, 255, 0, 0.1); }
      50% { background-color: rgba(0, 255, 0, 0.2); }
    }
    .highlight-breathe {
      animation: breathe 2s ease-in-out infinite;
    }
  `;

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg w-11/12 max-w-6xl text-black max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">{selectedCategory.name}</h2>
            <div className="flex justify-between mb-4">
              <p>Total Items: {selectedCategory.itemCount}</p>
              <p>Total Cost: {selectedCategory.totalCost.toFixed(2)} NOK</p>
            </div>
            <h3 className="text-xl font-semibold mt-4 mb-2">Items:</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-right p-2">Quantity</th>
                    <th className="text-right p-2">Price</th>
                    <th className="text-center p-2">Category</th>
                    <th className="text-center p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCategory.items?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="p-2">{new Date(item.date).toLocaleDateString()}</td>
                      <td className="p-2">{item.name}</td>
                      <td className="text-right p-2">{item.quantity}</td>
                      <td className="text-right p-2">{item.price.toFixed(2)} NOK</td>
                      <td className="text-center p-2">
                        <select
                          value={itemCategoryChanges[item.id] || item.categoryId}
                          onChange={(e) => handleCategoryChange(item.id, e.target.value)}
                          className="border rounded p-1 text-sm w-full"
                        >
                          {allCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-center p-2">
                        {itemCategoryChanges[item.id] && (
                          <button
                            onClick={() => handleSaveCategoryChange(item.id)}
                            className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm"
                          >
                            Save
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => setSelectedCategory(null)}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}