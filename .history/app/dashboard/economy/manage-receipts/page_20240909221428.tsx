'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import ReceiptCSVUploader from '@/app/components/ReceiptCSVUploader';

interface Receipt {
  id: string;
  storeName: string;
  totalAmount: number;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export default function ManageReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchReceipts();
    }
  }, [status]);

  const fetchReceipts = async () => {
    try {
      const res = await fetch('/api/receipts');
      if (!res.ok) throw new Error('Failed to fetch receipts');
      const data = await res.json();
      setReceipts(data);
    } catch (err) {
      console.error('Failed to fetch receipts:', err);
      setError('Failed to load receipts. Please try again.');
    }
  };

  const handleEditReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReceipt) return;

    try {
      const res = await fetch(`/api/receipts/${editingReceipt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingReceipt),
      });

      if (res.ok) {
        setEditingReceipt(null);
        fetchReceipts();
      } else {
        throw new Error('Failed to update receipt');
      }
    } catch (error) {
      console.error('Error updating receipt:', error);
      setError('Failed to update receipt. Please try again.');
    }
  };

  const handleDeleteReceipt = async (id: string) => {
    if (!confirm('Are you sure you want to delete this receipt?')) return;

    try {
      const res = await fetch(`/api/receipts/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchReceipts();
      } else {
        throw new Error('Failed to delete receipt');
      }
    } catch (error) {
      console.error('Error deleting receipt:', error);
      setError('Failed to delete receipt. Please try again.');
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto mt-10">
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-2xl font-bold">Manage Receipts</h1>
        <Link href="/dashboard/economy" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
          Back to Economy
        </Link>
      </div>
      <Link href="/dashboard/economy/add-receipt" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out mb-4 inline-block">
        Add Receipt
      </Link>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <ul className="space-y-4">
        {receipts.map((receipt) => (
          <li key={receipt.id} className="bg-white bg-opacity-10 p-4 rounded">
            {editingReceipt?.id === receipt.id ? (
              <form onSubmit={handleEditReceipt} className="space-y-2">
                <input
                  type="text"
                  value={editingReceipt.storeName}
                  onChange={(e) => setEditingReceipt({ ...editingReceipt, storeName: e.target.value })}
                  className="w-full p-2 border rounded text-black"
                  required
                />
                <input
                  type="number"
                  value={editingReceipt.totalAmount}
                  onChange={(e) => setEditingReceipt({ ...editingReceipt, totalAmount: parseFloat(e.target.value) })}
                  className="w-full p-2 border rounded text-black"
                  required
                  step="0.01"
                />
                <input
                  type="date"
                  value={editingReceipt.date.split('T')[0]}
                  onChange={(e) => setEditingReceipt({ ...editingReceipt, date: e.target.value })}
                  className="w-full p-2 border rounded text-black"
                  required
                />
                <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded mr-2">Save</button>
                <button onClick={() => setEditingReceipt(null)} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
              </form>
            ) : (
              <>
                <p>Store: {receipt.storeName}</p>
                <p>Total Amount: ${receipt.totalAmount.toFixed(2)}</p>
                <p>Date: {new Date(receipt.date).toLocaleDateString()}</p>
                <p>Created: {new Date(receipt.createdAt).toLocaleString()}</p>
                <p>Updated: {new Date(receipt.updatedAt).toLocaleString()}</p>
                <div className="mt-2">
                  <Link href={`/dashboard/economy/receipts/${receipt.id}`} className="text-blue-500 mr-2">
                    View Details
                  </Link>
                  <button onClick={() => setEditingReceipt(receipt)} className="text-yellow-500 mr-2">Edit</button>
                  <button onClick={() => handleDeleteReceipt(receipt.id)} className="text-red-500">Delete</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}