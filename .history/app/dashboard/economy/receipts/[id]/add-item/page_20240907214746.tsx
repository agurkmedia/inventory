'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Item {
  id: string;
  name: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
}

interface Inventory {
  id: string;
  name: string;
}

export default function AddReceiptItem({ params }: { params: { id: string } }) {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchItems();
      fetchCategories();
      fetchInventories();
    }
  }, [status]);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items');
      if (!res.ok) throw new Error('Failed to fetch items');
      const data = await res.json();
      // Ensure that data.items is an array before setting the state
      if (Array.isArray(data.items)) {
        setItems(data.items);
      } else {
        console.error('Fetched items data is not an array:', data);
        setError('Invalid items data received');
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
      setError('Failed to load items. Please try again.');
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

  const fetchInventories = async () => {
    try {
      const res = await fetch('/api/inventories');
      if (!res.ok) throw new Error('Failed to fetch inventories');
      const data = await res.json();
      setInventories(data);
    } catch (err) {
      console.error('Failed to fetch inventories:', err);
      setError('Failed to load inventories. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const itemId = selectedItemId || (await createNewItem());
      const res = await fetch('/api/receipt-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptId: params.id,
          itemId,
          quantity,
          totalPrice,
          categoryId,
        }),
      });

      if (res.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push(`/dashboard/economy/receipts/${params.id}`);
        }, 2000);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add receipt item');
      }
    } catch (error) {
      console.error('Error adding receipt item:', error);
      setError(error.message || 'An error occurred while adding receipt item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const createNewItem = async (): Promise<string> => {
    if (!selectedInventoryId) {
      throw new Error('Please select an inventory for the new item');
    }
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: newItemName,
        inventoryId: selectedInventoryId,
        quantity: 1, // Default quantity
        price: 0 // Default price
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to create new item');
    }

    const newItem = await res.json();
    return newItem.id;
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-5">Add Receipt Item</h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      {isSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">Item added successfully! Redirecting...</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="item" className="block text-sm font-medium text-gray-700">Item</label>
          <select
            id="item"
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black bg-white"
          >
            <option value="">Select an item or add new</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>
        {selectedItemId === '' && (
          <>
            <div>
              <label htmlFor="newItemName" className="block text-sm font-medium text-gray-700">New Item Name</label>
              <input
                type="text"
                id="newItemName"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black bg-white"
                required
              />
            </div>
            <div>
              <label htmlFor="inventory" className="block text-sm font-medium text-gray-700">Inventory</label>
              <select
                id="inventory"
                value={selectedInventoryId}
                onChange={(e) => setSelectedInventoryId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black bg-white"
                required
              >
                <option value="">Select an inventory</option>
                {inventories.map((inventory) => (
                  <option key={inventory.id} value={inventory.id}>{inventory.name}</option>
                ))}
              </select>
            </div>
          </>
        )}
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantity</label>
          <input
            type="number"
            id="quantity"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black bg-white"
            required
            min="1"
          />
        </div>
        <div>
          <label htmlFor="totalPrice" className="block text-sm font-medium text-gray-700">Total Price</label>
          <input
            type="number"
            id="totalPrice"
            value={totalPrice}
            onChange={(e) => setTotalPrice(parseFloat(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black bg-white"
            required
            step="0.01"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black bg-white"
            required
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Adding...' : 'Add Receipt Item'}
          Add Receipt Item
        </button>
      </form>
      <Link href={`/dashboard/economy/receipts/${params.id}`} className="mt-4 inline-block text-indigo-600 hover:text-indigo-500">
        Back to Receipt
      </Link>
    </div>
  );
}