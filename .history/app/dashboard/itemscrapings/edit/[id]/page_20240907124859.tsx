'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface ItemScraping {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price: number | null;
  inventoryId: string;
}

export default function EditItemScraping({ params }: { params: { id: string } }) {
  const [itemScraping, setItemScraping] = useState<ItemScraping | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [price, setPrice] = useState(0);
  const [inventoryId, setInventoryId] = useState('');
  const [inventories, setInventories] = useState([]);
  const [error, setError] = useState('');
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchItemScraping();
      fetchInventories();
    }
  }, [status]);

  const fetchItemScraping = async () => {
    try {
      const res = await fetch(`/api/itemscrapings/${params.id}`);
      if (!res.ok) throw new Error('Failed to fetch item scraping');
      const data = await res.json();
      setItemScraping(data);
      setName(data.name);
      setDescription(data.description || '');
      setQuantity(data.quantity);
      setPrice(data.price || 0);
      setInventoryId(data.inventoryId);
    } catch (err) {
      console.error('Failed to fetch item scraping:', err);
      setError('Failed to load item scraping. Please try again.');
    }
  };

  const fetchInventories = async () => {
    try {
      const res = await fetch('/api/inventories');
      if (!res.ok) throw new Error('Failed to fetch inventories');
      const data = await res.json();
      setInventories(data);
    } catch (err) {
      console.error('Failed to fetch inventories:', err);
      setError('Failed to load inventories. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/itemscrapings/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          quantity,
          price,
          inventoryId,
        }),
      });

      if (!res.ok) throw new Error('Failed to update item scraping');

      router.push(`/dashboard/itemscrapings/${params.id}`);
    } catch (err) {
      console.error('Failed to update item scraping:', err);
      setError('Failed to update item scraping. Please try again.');
    }
  };

  if (status === 'loading' || !itemScraping) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-5">Edit Item Scraping</h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantity</label>
          <input
            type="number"
            id="quantity"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price</label>
          <input
            type="number"
            id="price"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            step="0.01"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label htmlFor="inventoryId" className="block text-sm font-medium text-gray-700">Inventory</label>
          <select
            id="inventoryId"
            value={inventoryId}
            onChange={(e) => setInventoryId(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            <option value="">Select an inventory</option>
            {inventories.map((inventory: any) => (
              <option key={inventory.id} value={inventory.id}>{inventory.name}</option>
            ))}
          </select>
        </div>
        <div>
          <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Update Item Scraping
          </button>
        </div>
      </form>
    </div>
  );
}