'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface ItemScraping {
  id: string;
  name: string;
  quantity: number;
  price: number;
  inventoryName: string;
  inventoryId: string;
  image: string | null;
}

interface Inventory {
  id: string;
  name: string;
}

function ItemScrapingCard({ item, onDelete }: { item: ItemScraping, onDelete: (id: string) => void }) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleDelete = () => {
    setShowConfirmDelete(true);
  };

  const confirmDelete = () => {
    onDelete(item.id);
    setShowConfirmDelete(false);
  };

  return (
    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md relative">
      <h3 className="text-lg font-semibold text-white mb-1">{item.name}</h3>
      <p className="text-sm text-indigo-200 mb-1">Quantity: {item.quantity}</p>
      <p className="text-sm text-indigo-200 mb-1">Price: ${item.price.toFixed(2)}</p>
      <p className="text-sm text-indigo-200 mb-2">Inventory: {item.inventoryName}</p>
      {item.image && (
        <img
          src={`data:image/jpeg;base64,${item.image}`}
          alt={item.name}
          className="absolute top-2 right-2 w-12 h-12 object-cover rounded-full border-2 border-white"
        />
      )}
      <div className="flex justify-between items-center mt-2">
        <Link href={`/dashboard/itemscrapings/${item.id}`} className="text-indigo-400 hover:text-indigo-300 text-sm">
          View Details
        </Link>
        <Link href={`/dashboard/itemscrapings/edit/${item.id}`} className="text-yellow-400 hover:text-yellow-300 text-sm">
          Edit
        </Link>
        <button onClick={handleDelete} className="text-red-400 hover:text-red-300 text-sm">
          Delete
        </button>
      </div>
      {showConfirmDelete && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
          <div className="bg-white p-4 rounded-lg">
            <p className="text-black mb-2">Are you sure you want to delete this item?</p>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowConfirmDelete(false)} className="px-2 py-1 bg-gray-200 rounded">Cancel</button>
              <button onClick={confirmDelete} className="px-2 py-1 bg-red-500 text-white rounded">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ItemScrapings() {
  const [itemScrapings, setItemScrapings] = useState<ItemScraping[]>([]);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [selectedInventories, setSelectedInventories] = useState<string[]>([]);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchItemScrapings();
      fetchInventories();
    }
  }, [status]);

  const fetchItemScrapings = async () => {
    try {
      const res = await fetch('/api/itemscrapings');
      if (!res.ok) throw new Error('Failed to fetch item scrapings');
      const data = await res.json();
      setItemScrapings(data.itemScrapings);
    } catch (err) {
      console.error('Failed to fetch item scrapings:', err);
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
    }
  };

  const handleInventoryToggle = (inventoryId: string) => {
    setSelectedInventories(prev =>
      prev.includes(inventoryId)
        ? prev.filter(id => id !== inventoryId)
        : [...prev, inventoryId]
    );
  };

  const filteredItemScrapings = selectedInventories.length > 0
    ? itemScrapings.filter(item => selectedInventories.includes(item.inventoryId))
    : itemScrapings;

  const handleDeleteItemScraping = async (itemId: string) => {
    try {
      const res = await fetch(`/api/itemscrapings/${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item scraping');
      fetchItemScrapings(); // Refresh the item scrapings list
    } catch (err) {
      console.error('Failed to delete item scraping:', err);
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white mb-4">Item Scrapings</h1>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {inventories.map(inventory => (
          <label key={inventory.id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedInventories.includes(inventory.id)}
              onChange={() => handleInventoryToggle(inventory.id)}
              className="form-checkbox text-indigo-600"
            />
            <span className="text-white">{inventory.name}</span>
          </label>
        ))}
      </div>
      
      {selectedInventories.map(inventoryId => {
        const inventoryScrapings = filteredItemScrapings.filter(item => item.inventoryId === inventoryId);
        const inventoryName = inventories.find(inv => inv.id === inventoryId)?.name;

        return (
          <div key={inventoryId} className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">{inventoryName}</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {inventoryScrapings.map(item => (
                <ItemScrapingCard key={item.id} item={item} onDelete={handleDeleteItemScraping} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}