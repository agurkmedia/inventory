'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Item {
  id: string;
  name: string;
  description: string;
  quantity: number;
  inventoryName: string;
  image: string | null;
  productCode?: string;
  price?: number;
  sourceUrl?: string;
}

export default function ItemDetails() {
  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { id } = useParams();

  useEffect(() => {
    const fetchItemDetails = async () => {
      try {
        console.log('Fetching item details for ID:', id);
        const res = await fetch(`/api/items/${id}`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(`Failed to fetch item details: ${errorData.error || res.statusText}`);
        }
        const data = await res.json();
        console.log('Received item data:', data);
        setItem(data);
      } catch (err) {
        console.error('Failed to fetch item details:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchItemDetails();
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
        {item.image && (
          <img
            src={`data:image/jpeg;base64,${item.image}`}
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