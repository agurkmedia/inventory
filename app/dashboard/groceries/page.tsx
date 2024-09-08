'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function Groceries() {
  const [groceries, setGroceries] = useState([]);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchGroceries();
    }
  }, [status]);

  const fetchGroceries = async () => {
    try {
      const res = await fetch('/api/groceries');
      if (!res.ok) throw new Error('Failed to fetch groceries');
      const data = await res.json();
      setGroceries(data);
    } catch (err) {
      console.error('Failed to fetch groceries:', err);
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Groceries</h1>
      {groceries.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-xl text-white mb-4">You don't have any groceries yet.</p>
          <Link href="/dashboard/groceries/new" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
            Add Groceries
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groceries.map(grocery => (
            <GroceryCard key={grocery.id} grocery={grocery} />
          ))}
          <NewGroceryCard />
        </div>
      )}
    </div>
  );
}

function GroceryCard({ grocery }) {
  return (
    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-6 shadow-xl relative">
      <h3 className="text-xl font-semibold text-white mb-2">{grocery.name}</h3>
      <p className="text-indigo-200 mb-2">Quantity: {grocery.quantity}</p>
      <Link href={`/dashboard/groceries/${grocery.id}`} className="text-indigo-400 hover:text-indigo-300">
        View Details →
      </Link>
    </div>
  );
}

function NewGroceryCard() {
  return (
    <Link href="/dashboard/groceries/new" className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-6 shadow-xl flex items-center justify-center hover:bg-opacity-20 transition duration-150 ease-in-out">
      <span className="text-white text-lg">+ New Grocery Item</span>
    </Link>
  );
}