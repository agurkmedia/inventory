'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

export default function ItemDetails({ params }) {
  const [item, setItem] = useState(null);
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
    } catch (err) {
      console.error('Failed to fetch item:', err);
      setError('Failed to load item. Please try again.');
    }
  };

  const formatDateTime = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    };
    return new Date(dateString).toLocaleString(undefined, options);
  };

  if (status === 'loading' || !item) {
    return <div>Loading...</div>;
  }

  return (
    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-8 shadow-xl max-w-2xl mx-auto mt-10">
      <h2 className="text-3xl font-bold text-white mb-6">{item.name}</h2>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <div className="space-y-6">
        {item.image && (
          <div className="w-full h-64 relative rounded-lg overflow-hidden">
            <Image
              src={`data:image/jpeg;base64,${item.image}`}
              alt={item.name}
              layout="fill"
              objectFit="cover"
            />
          </div>
        )}
        <p className="text-indigo-200"><strong>Description:</strong> {item.description || 'N/A'}</p>
        <p className="text-indigo-200"><strong>Quantity:</strong> {item.quantity}</p>
        <p className="text-indigo-200"><strong>Price:</strong> ${item.price.toFixed(2)}</p>
        <p className="text-indigo-200"><strong>Inventory:</strong> {item.inventory?.name || 'N/A'}</p>
        <p className="text-indigo-200"><strong>Created At:</strong> {formatDateTime(item.createdAt)}</p>
        <p className="text-indigo-200"><strong>Last Updated:</strong> {formatDateTime(item.updatedAt)}</p>
      </div>
      <div className="mt-8 space-x-4">
        <Link href={`/dashboard/items/edit/${item.id}`} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
          Edit
        </Link>
        <Link href="/dashboard/items" className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
          Back to Items
        </Link>
      </div>
    </div>
  );
}