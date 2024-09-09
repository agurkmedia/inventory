'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Item {
  id: string;
  name: string;
  quantity: number;
  price: number;
  inventoryName: string;
  inventoryId: string;
  image: string | null;
}

interface ItemScraping {
  id: string;
  name: string;
  quantity: number;
  price: number;
  inventoryName: string;
  inventoryId: string;
  image: string | null;
  productCode?: string;
  weight?: number;
  availability?: string;
  manufacturer?: string;
  sourceUrl?: string;
}

interface Inventory {
  id: string;
  name: string;
}

function ItemCard({ item, onDelete }: { item: Item | ItemScraping, onDelete: (id: string) => void }) {
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
        <Link href={`/dashboard/items/${item.id}`} className="text-indigo-400 hover:text-indigo-300 text-sm">
          View Details
        </Link>
        <Link href={`/dashboard/items/edit/${item.id}`} className="text-yellow-400 hover:text-yellow-300 text-sm">
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

function NewItemCard() {
  return (
    <Link href="/dashboard/items/new" className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md flex items-center justify-center hover:bg-opacity-20 transition duration-150 ease-in-out">
      <span className="text-white text-lg">+ New Item</span>
    </Link>
  );
}

export default function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [itemScrapings, setItemScrapings] = useState<ItemScraping[]>([]);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [displayMode, setDisplayMode] = useState<'all' | 'items' | 'scrapings'>('all');
  const [selectedInventories, setSelectedInventories] = useState<string[]>([]);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchItems();
      fetchItemScrapings();
      fetchInventories();
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

  const fetchItemScrapings = async () => {
    try {
      const res = await fetch('/api/itemscrapings');
      if (!res.ok) throw new Error('Failed to fetch item scrapings');
      const data = await res.json();
      setItemScrapings(data);
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

  const handleSelectAll = () => {
    setSelectedInventories(inventories.map(inv => inv.id));
  };

  const handleDeselectAll = () => {
    setSelectedInventories([]);
  };

  const filteredItems = selectedInventories.length > 0
    ? items.filter(item => selectedInventories.includes(item.inventoryId))
    : items;

  const filteredItemScrapings = selectedInventories.length > 0
    ? itemScrapings.filter(item => selectedInventories.includes(item.inventoryId))
    : itemScrapings;

  const handleDeleteItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item');
      fetchItems();
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const handleDeleteItemScraping = async (itemId: string) => {
    try {
      const res = await fetch(`/api/itemscrapings/${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item scraping');
      fetchItemScrapings();
    } catch (err) {
      console.error('Failed to delete item scraping:', err);
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white mb-4">Items</h1>
      
      <div className="flex flex-wrap space-x-4 mb-4">
        <button
          onClick={() => setDisplayMode('items')}
          className={`px-4 py-2 rounded mb-2 ${displayMode === 'items' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-200'}`}
        >
          Show Items Only
        </button>
        <button
          onClick={() => setDisplayMode('scrapings')}
          className={`px-4 py-2 rounded mb-2 ${displayMode === 'scrapings' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-200'}`}
        >
          Show ItemScrapings Only
        </button>
        <button
          onClick={() => setDisplayMode('all')}
          className={`px-4 py-2 rounded mb-2 ${displayMode === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-200'}`}
        >
          Show Both
        </button>
        <button
          onClick={handleSelectAll}
          className="px-4 py-2 rounded mb-2 bg-green-600 text-white"
        >
          Select All Inventories
        </button>
        <button
          onClick={handleDeselectAll}
          className="px-4 py-2 rounded mb-2 bg-red-600 text-white"
        >
          Deselect All Inventories
        </button>
      </div>

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
        const inventoryItems = filteredItems.filter(item => item.inventoryId === inventoryId);
        const inventoryName = inventories.find(inv => inv.id === inventoryId)?.name;

        return (
          <div key={inventoryId} className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">{inventoryName}</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {inventoryItems.map(item => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  onDelete={item.isItemScraping ? handleDeleteItemScraping : handleDeleteItem} 
                />
              ))}
            </div>
          </div>
        );
      })}

      <NewItemCard />
    </div>
  );
}