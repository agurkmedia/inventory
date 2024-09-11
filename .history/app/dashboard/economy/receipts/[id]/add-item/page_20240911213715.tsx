'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Item {
  id: string;
  name: string;
  price: number;
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
  const [isNewItem, setIsNewItem] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editItemName, setEditItemName] = useState('');
  const [editInventoryId, setEditInventoryId] = useState('');
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
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      setError('Failed to fetch items. Please try again.');
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
    setIsSubmitting(true);
    setError('');

    try {
      const itemData = isNewItem
        ? { name: newItemName, inventoryId: selectedInventoryId }
        : isEditing
        ? { id: selectedItemId, name: editItemName, inventoryId: editInventoryId }
        : { id: selectedItemId };

      const response = await fetch('/api/receipt-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptId: params.id,
          ...itemData,
          quantity,
          totalPrice,
          categoryId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add receipt item');
      }

      setIsSuccess(true);
      router.push(`/dashboard/economy/receipts/${params.id}`);
    } catch (error) {
      console.error('Error adding receipt item:', error);
      setError('Failed to add receipt item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Add Receipt Item</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {isSuccess && <p className="text-green-500 mb-4">Item added successfully!</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="itemSelect" className="block text-sm font-medium text-gray-700">Select Item</label>
          <select
            id="itemSelect"
            value={selectedItemId}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedItemId(value);
              setIsNewItem(value === 'new');
              setIsEditing(value !== '' && value !== 'new');
              if (value !== 'new' && value !== '') {
                const selectedItem = items.find(item => item.id === value);
                if (selectedItem) {
                  setTotalPrice(selectedItem.price * quantity);
                  setEditItemName(selectedItem.name);
                  setEditInventoryId(selectedItem.inventoryId);
                }
              }
            }}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-gray-900"
            required
          >
            <option value="">Select an item</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
            <option value="new">Add New Item</option>
          </select>
        </div>

        {isNewItem && (
          <>
            <div>
              <label htmlFor="newItemName" className="block text-sm font-medium text-gray-700">New Item Name</label>
              <input
                type="text"
                id="newItemName"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-gray-900"
                required
              />
            </div>
            <div>
              <label htmlFor="inventory" className="block text-sm font-medium text-gray-700">Inventory</label>
              <select
                id="inventory"
                value={selectedInventoryId}
                onChange={(e) => setSelectedInventoryId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-gray-900"
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
            onChange={(e) => {
              const newQuantity = parseInt(e.target.value);
              setQuantity(newQuantity);
              if (!isNewItem && selectedItemId) {
                const selectedItem = items.find(item => item.id === selectedItemId);
                if (selectedItem) {
                  setTotalPrice(selectedItem.price * newQuantity);
                }
              }
            }}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-gray-900"
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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-gray-900"
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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-gray-900"
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
        </button>
      </form>
      <Link href={`/dashboard/economy/receipts/${params.id}`} className="mt-4 inline-block text-indigo-600 hover:text-indigo-500">
        Back to Receipt
      </Link>
    </div>
  );
}