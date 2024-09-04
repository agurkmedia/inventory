'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Items() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch items from the API
    fetch('/api/items')
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch items');
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setItems(data);
        } else {
          throw new Error('Invalid data format');
        }
      })
      .catch(err => {
        console.error('Failed to fetch items:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="text-white">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Items</h1>
      {items.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-xl text-white mb-4">You don't have any items yet.</p>
          <Link href="/dashboard/items/new" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
            Add New Item
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
          <NewItemCard />
        </div>
      )}
    </div>
  );
}

function ItemCard({ item }) {
  return (
    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-6 shadow-xl relative">
      <h3 className="text-xl font-semibold text-white mb-2">{item.name}</h3>
      <p className="text-indigo-200 mb-2">Quantity: {item.quantity}</p>
      <p className="text-indigo-200 mb-4">Inventory: {item.inventoryName}</p>
      {item.imageUrl && (
        <img
          src={`/api/items/${item.id}/image`}
          alt={item.name}
          className="absolute top-2 right-2 w-16 h-16 object-cover rounded-full border-2 border-white"
        />
      )}
      <Link href={`/dashboard/items/${item.id}`} className="text-indigo-400 hover:text-indigo-300">
        View Details →
      </Link>
    </div>
  );
}

function NewItemCard() {
  return (
    <Link href="/dashboard/items/new" className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-6 shadow-xl flex items-center justify-center hover:bg-opacity-20 transition duration-150 ease-in-out">
      <span className="text-white text-lg">+ New Item</span>
    </Link>
  );
}