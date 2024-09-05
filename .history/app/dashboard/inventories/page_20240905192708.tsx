'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function Inventories() {
  const [inventories, setInventories] = useState([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchInventories();
    }
  }, [status]);

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

  const handleDeleteClick = (inventoryId) => {
    setDeleteConfirmation(inventoryId);
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await fetch(`/api/inventories/${deleteConfirmation}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete inventory');
      setDeleteConfirmation(null);
      fetchInventories(); // Refresh the list
      router.refresh(); // Refresh the page to update any related components
    } catch (err) {
      console.error('Failed to delete inventory:', err);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation(null);
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Inventories</h1>
      {inventories.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-xl text-white mb-4">You don't have any inventories yet.</p>
          <Link href="/dashboard/inventories/new" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
            Create New Inventory
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {inventories.map(inventory => (
            <InventoryCard 
              key={inventory.id} 
              inventory={inventory} 
              onDeleteClick={handleDeleteClick}
              isConfirmingDelete={deleteConfirmation === inventory.id}
              onDeleteConfirm={handleDeleteConfirm}
              onDeleteCancel={handleDeleteCancel}
            />
          ))}
          <NewInventoryCard />
        </div>
      )}
    </div>
  );
}

function InventoryCard({ inventory, onDeleteClick, isConfirmingDelete, onDeleteConfirm, onDeleteCancel }) {
  return (
    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-6 shadow-xl">
      <h3 className="text-xl font-semibold text-white mb-2">{inventory.name}</h3>
      <p className="text-indigo-200 mb-4">Items: {inventory.itemCount}</p>
      <div className="flex justify-between items-center">
        <Link href={`/dashboard/inventories/${inventory.id}`} className="text-indigo-400 hover:text-indigo-300">
          View Details →
        </Link>
        {!isConfirmingDelete ? (
          <button
            onClick={() => onDeleteClick(inventory.id)}
            className="text-red-500 hover:text-red-400"
          >
            Delete
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={onDeleteConfirm}
              className="text-red-500 hover:text-red-400"
            >
              Confirm
            </button>
            <button
              onClick={onDeleteCancel}
              className="text-gray-400 hover:text-gray-300"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NewInventoryCard() {
  return (
    <Link href="/dashboard/inventories/new" className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-6 shadow-xl flex items-center justify-center hover:bg-opacity-20 transition duration-150 ease-in-out">
      <span className="text-white text-lg">+ New Inventory</span>
    </Link>
  );
}