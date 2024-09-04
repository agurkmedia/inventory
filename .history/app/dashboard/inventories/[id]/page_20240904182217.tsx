'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

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