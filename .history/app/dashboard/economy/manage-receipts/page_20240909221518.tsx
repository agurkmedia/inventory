'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation'; // Add this import
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white mb-4">Manage Receipts</h1>
      
      <Link href="/dashboard/economy/add-receipt" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
        Add New Receipt
      </Link>

      <ReceiptCSVUploader />

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-white mb-4">Your Receipts</h2>
        {receipts.length === 0 ? (
          <p className="text-white">No receipts found.</p>
        ) : (
          <ul className="space-y-4">
            {receipts.map((receipt) => (
              <li key={receipt.id} className="bg-white bg-opacity-10 p-4 rounded-lg">
                <p className="text-lg font-semibold text-white">{receipt.storeName}</p>
                <p className="text-sm text-gray-300">Date: {new Date(receipt.date).toLocaleDateString()}</p>
                <p className="text-sm text-gray-300">Total: ${receipt.totalAmount.toFixed(2)}</p>
                <div className="mt-2">
                  <Link href={`/dashboard/economy/receipts/${receipt.id}`} className="text-blue-400 hover:text-blue-300 mr-4">
                    View Details
                  </Link>
                  <button onClick={() => handleDeleteReceipt(receipt.id)} className="text-red-400 hover:text-red-300">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}