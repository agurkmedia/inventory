'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function EditItem({ params }) {
  const [item, setItem] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [price, setPrice] = useState(0);
  const [error, setError] = useState('');
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchItem();
    }
  }, [status]);

  const fetchItem = async () => {
    try {
      const res = await fetch(`/api/items/${params.id}`);
      if (!res.ok) throw new Error('Failed to fetch item');
      const data = await res.json();
      setItem(data);
      setName(data.name);
      setDescription(data.description);
      setQuantity(data.quantity);
      setPrice(data.price);
    } catch (err) {
      console.error('Failed to fetch item:', err);
      setError('Failed to load item. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`/api/items/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, quantity, price }),
      });

      if (res.ok) {
        router.push('/dashboard/items');
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      setError(error.message || 'An error occurred while updating the item');
    }
  };

  if (status === 'loading' || !item) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-8 shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold text-white mb-6">Edit Item</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Add form fields for name, description, quantity, and price */}
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Update Item
          </button>
        </form>
      </div>
    </div>
  );
}