'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface ReceiptItem {
  id: string;
  itemName: string;
  quantity: number;
  totalPrice: number;
  categoryId: string;
  categoryName: string;
  inventoryId?: string;
  inventoryName?: string;
}

interface Receipt {
  id: string;
  storeName: string;
  totalAmount: number;
  date: string;
  items: ReceiptItem[];
}

interface ExpenseCategory {
  id: string;
  name: string;
}

export default function ReceiptDetails({ params }: { params: { id: string } }) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editedQuantity, setEditedQuantity] = useState<number>(0);
  const [editedTotalPrice, setEditedTotalPrice] = useState<number>(0);
  const [editedCategoryId, setEditedCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [editItemName, setEditItemName] = useState('');
  const [editInventoryId, setEditInventoryId] = useState('');
  const [inventories, setInventories] = useState<{ id: string; name: string }[]>([]);

  const fetchReceipt = useCallback(async () => {
    try {
      const res = await fetch(`/api/receipts/${params.id}`);
      if (!res.ok) throw new Error('Failed to fetch receipt');
      const data = await res.json();
      
      // Calculate total amount if there are items
      if (data.items && data.items.length > 0) {
        data.totalAmount = calculateTotalAmount(data.items);
      }
      
      // Ensure each item has inventoryName
      const itemsWithInventory = data.items.map((item: ReceiptItem) => ({
        ...item,
        inventoryName: item.inventoryName || 'Not assigned'
      }));

      setReceipt({ ...data, items: itemsWithInventory });
    } catch (err) {
      console.error('Failed to fetch receipt:', err);
      setError('Failed to load receipt. Please try again.');
    }
  }, [params.id]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchReceipt();
      fetchCategories();
      fetchInventories();
    }
  }, [status, fetchReceipt]);

  const calculateTotalAmount = (items: ReceiptItem[]): number => {
    return items.reduce((total, item) => total + item.totalPrice, 0);
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

  const handleEditItem = (itemId: string) => {
    const item = receipt?.items.find(i => i.id === itemId);
    if (item) {
      setEditingItem(itemId);
      setEditedQuantity(item.quantity);
      setEditedTotalPrice(item.totalPrice);
      setEditedCategoryId(item.categoryId);
      setEditItemName(item.itemName);
      setEditInventoryId(item.inventoryId || '');
    }
  };

  const handleSaveEdit = async (itemId: string) => {
    try {
      const res = await fetch(`/api/receipt-items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: editedQuantity,
          totalPrice: editedTotalPrice,
          categoryId: editedCategoryId,
          itemName: editItemName,
          inventoryId: editInventoryId || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to update item');
      
      await fetchReceipt(); // Refresh the receipt data
      setEditingItem(null);
    } catch (err) {
      console.error('Failed to update item:', err);
      setError('Failed to update item. Please try again.');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this item from the receipt?')) return;

    try {
      const res = await fetch(`/api/receipts/${params.id}/items/${itemId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to remove item from receipt');
      
      await fetchReceipt(); // Refresh the receipt data
    } catch (err) {
      console.error('Failed to remove item from receipt:', err);
      setError('Failed to remove item from receipt. Please try again.');
    }
  };

  if (status === 'loading' || !receipt) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-5">Receipt Details</h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-6 shadow-md">
        <p><strong>Store:</strong> {receipt.storeName}</p>
        <p><strong>Date:</strong> {new Date(receipt.date).toLocaleDateString()}</p>
        <p><strong>Total Amount:</strong> ${receipt.totalAmount.toFixed(2)}</p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">Items</h2>
        {receipt.items.length > 0 ? (
          <ul className="space-y-2">
            {receipt.items.map((item) => (
              <li key={item.id} className="bg-white bg-opacity-5 p-3 rounded">
                {editingItem === item.id ? (
                  <div className="space-y-2">
                    <div>
                      <label htmlFor="editItemName" className="block text-sm font-medium text-gray-300">Item Name</label>
                      <input
                        id="editItemName"
                        type="text"
                        value={editItemName}
                        onChange={(e) => setEditItemName(e.target.value)}
                        className="w-full mr-2 p-1 text-black"
                      />
                    </div>
                    <div>
                      <label htmlFor="editInventory" className="block text-sm font-medium text-gray-300">Inventory</label>
                      <select
                        id="editInventory"
                        value={editInventoryId}
                        onChange={(e) => setEditInventoryId(e.target.value)}
                        className="w-full mr-2 p-1 text-black"
                      >
                        <option value="">Select an inventory</option>
                        {inventories.map((inventory) => (
                          <option key={inventory.id} value={inventory.id}>{inventory.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="editQuantity" className="block text-sm font-medium text-gray-300">Quantity</label>
                      <input
                        id="editQuantity"
                        type="number"
                        value={editedQuantity}
                        onChange={(e) => setEditedQuantity(Number(e.target.value))}
                        className="w-full mr-2 p-1 text-black"
                      />
                    </div>
                    <div>
                      <label htmlFor="editTotalPrice" className="block text-sm font-medium text-gray-300">Total Price</label>
                      <input
                        id="editTotalPrice"
                        type="number"
                        value={editedTotalPrice}
                        onChange={(e) => setEditedTotalPrice(Number(e.target.value))}
                        className="w-full mr-2 p-1 text-black"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label htmlFor="editCategory" className="block text-sm font-medium text-gray-300">Category</label>
                      <select
                        id="editCategory"
                        value={editedCategoryId}
                        onChange={(e) => setEditedCategoryId(e.target.value)}
                        className="w-full mr-2 p-1 text-black"
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => handleSaveEdit(item.id)} className="bg-green-500 text-white px-2 py-1 rounded">Save</button>
                      <button onClick={() => setEditingItem(null)} className="bg-gray-500 text-white px-2 py-1 rounded">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p><strong>{item.itemName}</strong> - Quantity: {item.quantity}</p>
                    <p>Price: ${item.totalPrice.toFixed(2)} - Category: {item.categoryName}</p>
                    <p>Inventory: {item.inventoryName || 'Not assigned'}</p>
                    <button onClick={() => handleEditItem(item.id)} className="text-blue-500 mr-2">Edit</button>
                    <button onClick={() => handleDeleteItem(item.id)} className="text-red-500">Delete</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No items in this receipt.</p>
        )}
        
        <div className="mt-6">
          <Link href={`/dashboard/economy/receipts/${receipt.id}/add-item`} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2">
            Add Item
          </Link>
          <Link href="/dashboard/economy/manage-receipts" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Back to Receipts
          </Link>
        </div>
      </div>
    </div>
  );
}