'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

interface ItemScraping {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price: number | null;
  image: string | null;
  productCode: string | null;
  weight: number | null;
  availability: string | null;
  manufacturer: string | null;
  attenuation: string | null;
  flocculation: string | null;
  usageDirections: string | null;
  storageRecommendations: string | null;
  desinfisering: string | null;
  contactTime: string | null;
  sourceUrl: string | null;
}

export default function ItemScrapingDetails({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<ItemScraping | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchItemScraping();
    }
  }, [status]);

  const fetchItemScraping = async () => {
    try {
      const res = await fetch(`/api/itemscrapings/${params.id}`);
      if (!res.ok) throw new Error('Failed to fetch item scraping');
      const data = await res.json();
      setItem(data);
    } catch (err) {
      console.error('Failed to fetch item scraping:', err);
      setError('Failed to load item scraping. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        const res = await fetch(`/api/itemscrapings/${params.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete item scraping');
        router.push('/dashboard/inventories');
      } catch (err) {
        console.error('Failed to delete item scraping:', err);
        setError('Failed to delete item scraping. Please try again.');
      }
    }
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
      <div className="space-y-4">
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
        <p className="text-indigo-200"><strong>Price:</strong> ${item.price?.toFixed(2) || 'N/A'}</p>
        <p className="text-indigo-200"><strong>Product Code:</strong> {item.productCode || 'N/A'}</p>
        <p className="text-indigo-200"><strong>Weight:</strong> {item.weight || 'N/A'}</p>
        <p className="text-indigo-200"><strong>Availability:</strong> {item.availability || 'N/A'}</p>
        <p className="text-indigo-200"><strong>Manufacturer:</strong> {item.manufacturer || 'N/A'}</p>
        <p className="text-indigo-200"><strong>Attenuation:</strong> {item.attenuation || 'N/A'}</p>
        <p className="text-indigo-200"><strong>Flocculation:</strong> {item.flocculation || 'N/A'}</p>
        <p className="text-indigo-200"><strong>Usage Directions:</strong> {item.usageDirections || 'N/A'}</p>
        <p className="text-indigo-200"><strong>Storage Recommendations:</strong> {item.storageRecommendations || 'N/A'}</p>
        <p className="text-indigo-200"><strong>Desinfisering:</strong> {item.desinfisering || 'N/A'}</p>
        <p className="text-indigo-200"><strong>Contact Time:</strong> {item.contactTime || 'N/A'}</p>
        <p className="text-indigo-200"><strong>Source URL:</strong> {item.sourceUrl || 'N/A'}</p>
      </div>
      <div className="mt-8 space-x-4">
        <Link href={`/dashboard/itemscrapings/edit/${item.id}`} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
          Edit
        </Link>
        <button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
          Delete
        </button>
        <Link href="/dashboard/inventories" className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
          Back to Inventories
        </Link>
      </div>
    </div>
  );
}