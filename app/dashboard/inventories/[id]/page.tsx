'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { formatDateTime } from '@/utils/dateFormat';

export default function InventoryDetails({ params }) {
  const [inventory, setInventory] = useState(null);
  const [error, setError] = useState('');
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchInventory();
    }
  }, [status]);

  const fetchInventory = async () => {
    try {
      const res = await fetch(`/api/inventories/${params.id}`);
      if (!res.ok) throw new Error('Failed to fetch inventory');
      const data = await res.json();
      setInventory(data);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
      setError('Failed to load inventory. Please try again.');
    }
  };

  if (status === 'loading' || !inventory) {
    return <div>Loading...</div>;
  }

  return (
    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-8 shadow-xl max-w-4xl mx-auto mt-10">
      <h2 className="text-3xl font-bold text-white mb-6">{inventory.name}</h2>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Regular Items</h3>
          <ul className="space-y-2">
            {inventory.items && inventory.items.map((item) => (
              <li key={item.id} className="text-indigo-200">
                <Link href={`/dashboard/items/${item.id}`} className="hover:text-indigo-100">
                  {item.name} - Quantity: {item.quantity}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        
        <hr className="border-t border-indigo-300 my-6" />
        
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Scraped Items</h3>
          <ul className="space-y-2">
            {inventory.itemScrapings && inventory.itemScrapings.map((item) => (
              <li key={item.id} className="text-indigo-200">
                <Link href={`/dashboard/itemscrapings/${item.id}`} className="hover:text-indigo-100">
                  {item.name} - Quantity: {item.quantity}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-8">
        <p className="text-indigo-200"><strong>Created At:</strong> {formatDateTime(inventory.createdAt)}</p>
        <p className="text-indigo-200"><strong>Last Updated:</strong> {formatDateTime(inventory.updatedAt)}</p>
      </div>
      <div className="mt-8 space-x-4">
        <Link href={`/dashboard/inventories/edit/${inventory.id}`} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
          Edit Inventory
        </Link>
        <Link href="/dashboard/inventories" className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
          Back to Inventories
        </Link>
      </div>
    </div>
  );
}