'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function Items() {
  const [items, setItems] = useState([]);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchItems();
    }
  }, [status]);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items');
      if (!res.ok) throw new Error('Failed to fetch items');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error('Failed to fetch items:', err);
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white mb-4">Items</h1>
      {items.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-lg text-white mb-4">You don't have any items yet.</p>
          <Link href="/dashboard/items/new" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
            Add New Item
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md relative">
      <h3 className="text-lg font-semibold text-white mb-1">{item.name}</h3>
      <p className="text-sm text-indigo-200 mb-1">Quantity: {item.quantity}</p>
      <p className="text-sm text-indigo-200 mb-1">
        Price: ${typeof item.price === 'number' ? item.price.toFixed(2) : 'N/A'}
      </p>
      <p className="text-sm text-indigo-200 mb-2">Inventory: {item.inventoryName}</p>
      {item.image && (
        <img
          src={`data:image/jpeg;base64,${item.image}`}
          alt={item.name}
          className="absolute top-2 right-2 w-12 h-12 object-cover rounded-full border-2 border-white"
        />
      )}
      <div className="flex justify-between items-center mt-2">
        <Link href={`/dashboard/items/${item.id}`} className="text-indigo-400 hover:text-indigo-300 text-sm">
          View Details
        </Link>
        <Link href={`/dashboard/items/edit/${item.id}`} className="text-yellow-400 hover:text-yellow-300 text-sm">
          Edit
        </Link>
      </div>
    </div>
  );
}

function NewItemCard() {
  return (
    <Link href="/dashboard/items/new" className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md flex items-center justify-center hover:bg-opacity-20 transition duration-150 ease-in-out">
      <span className="text-white text-lg">+ New Item</span>
    </Link>
  );
}