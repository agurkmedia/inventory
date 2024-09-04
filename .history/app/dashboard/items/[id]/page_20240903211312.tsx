'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function ItemDetails() {
  const [item, setItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    // Fetch item details from the API
    fetch(`/api/items/${id}`)
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch item details');
        }
        return res.json();
      })
      .then(data => setItem(data))
      .catch(err => {
        console.error('Failed to fetch item details:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return <div className="text-white">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (!item) {
    return <div className="text-white">Item not found</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">{item.name}</h1>
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-6 shadow-xl">
        <p className="text-indigo-200 mb-2">Description: {item.description}</p>
        <p className="text-indigo-200 mb-2">Quantity: {item.quantity}</p>
        <p className="text-indigo-200 mb-2">Inventory: {item.inventoryName}</p>
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-64 h-64 object-cover rounded-lg border-2 border-white"
          />
        )}
        <Link href="/dashboard/items" className="text-indigo-400 hover:text-indigo-300 mt-4 block">
          Back to Items
        </Link>
      </div>
    </div>
  );
}