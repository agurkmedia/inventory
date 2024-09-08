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
            {inventory.items.map((item) => (
              <li key={item.id} className="text-indigo-200">
                <Link href={`/dashboard/items/${item.id}`} className="hover:text-indigo-100">
                  {item.name} - Quantity: {item.quantity}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Scraped Items</h3>
          <ul className="space-y-2">
            {inventory.itemScrapings.map((item) => (
              <li key={item.id} className="text-indigo-200">
                <Link href={`/dashboard/itemscrapings/${item.id}`} className="hover:text-indigo-100">
                  {item.name} - Quantity: {item.quantity}
                </Link>
              </li>
            ))}
interface Item {
  id: string;
  name: string;
  description: string;
  quantity: number;
  image: string | null;
  productCode?: string;
  price?: number;
  sourceUrl?: string;
}

export default function InventoryDetails() {
  const [inventory, setInventory] = useState<{ name: string, items: Item[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    const fetchInventoryDetails = async () => {
      try {
        console.log('Fetching inventory details for ID:', id);
        const res = await fetch(`/api/inventories/${id}`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(`Failed to fetch inventory details: ${errorData.error || res.statusText}`);
        }
        const data = await res.json();
        console.log('Received inventory data:', data);
        setInventory(data);
      } catch (err) {
        console.error('Failed to fetch inventory details:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventoryDetails();
  }, [id]);

  if (isLoading) {
    return <div className="text-white">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (!inventory) {
    return <div className="text-white">Inventory not found</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-high-contrast">{inventory.name}</h1>
      <div className="bg-card rounded-xl p-6 shadow-xl">
        <h2 className="text-2xl font-semibold text-high-contrast mb-4">Items in this Inventory</h2>
        {inventory.items.length === 0 ? (
          <p className="text-secondary">No items in this inventory yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inventory.items.map(item => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
        <Link href="/dashboard/inventories" className="link-highlight mt-4 inline-block">
          ← Back to Inventories
        </Link>
      </div>
    </div>
  );
}

function ItemCard({ item }: { item: Item }) {
  return (
    <div className="bg-card rounded-xl p-6 shadow-xl relative">
      <h3 className="text-xl font-semibold text-high-contrast mb-2">{item.name}</h3>
      <p className="text-secondary mb-2">Quantity: {item.quantity}</p>
      <p className="text-secondary mb-4">{item.description}</p>
      {item.image && (
        <img
          src={`data:image/jpeg;base64,${item.image}`}
          alt={item.name}
          className="absolute top-2 right-2 w-16 h-16 object-cover rounded-full border-2 border-white"
        />
      )}
      <Link href={`/dashboard/items/${item.id}`} className="link-highlight">
        View Details →
      </Link>
    </div>
  );
}