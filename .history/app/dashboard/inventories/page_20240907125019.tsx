'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function Inventories() {
  const [inventories, setInventories] = useState([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [editingInventory, setEditingInventory] = useState(null);
  const [newName, setNewName] = useState('');
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
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

  const handleEditClick = (inventory) => {
    setEditingInventory(inventory);
    setNewName(inventory.name);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log("Submitting edit for inventory:", editingInventory.id);
      const res = await fetch(`/api/inventories/${editingInventory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      console.log("Response status:", res.status);
      const data = await res.json();
      console.log("Response data:", data);
      
      if (!res.ok) throw new Error(data.error || 'Failed to update inventory');
      fetchInventories(); // Refresh the list
      setEditingInventory(null);
    } catch (err) {
      console.error('Failed to update inventory:', err);
      // You might want to set an error state here to display to the user
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white mb-4">Inventories</h1>
      {inventories.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-lg text-white mb-4">You don't have any inventories yet.</p>
          <Link href="/dashboard/inventories/new" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
            Create New Inventory
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {inventories.map(inventory => (
            <InventoryCard 
              key={inventory.id} 
              inventory={inventory} 
              onDeleteClick={handleDeleteClick}
              onEditClick={handleEditClick}
              isEditing={editingInventory?.id === inventory.id}
              onEditSubmit={handleEditSubmit}
              newName={newName}
              setNewName={setNewName}
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

function InventoryCard({ inventory, onDeleteClick, onEditClick, isEditing, onEditSubmit, newName, setNewName, isConfirmingDelete, onDeleteConfirm, onDeleteCancel }) {
  return (
    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md">
      {isEditing ? (
        <form onSubmit={onEditSubmit} className="space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New Inventory Name"
            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-black bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
          />
          <div className="flex justify-between">
            <button type="submit" className="text-green-400 hover:text-green-300 text-sm">Save</button>
            <button onClick={() => onEditClick(null)} className="text-red-400 hover:text-red-300 text-sm">Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <h3 className="text-lg font-semibold text-white mb-2">{inventory.name}</h3>
          <p className="text-sm text-indigo-200 mb-3">Items: {inventory.itemCount}</p>
          <div className="flex flex-col space-y-2">
            <Link href={`/dashboard/inventories/${inventory.id}`} className="text-indigo-400 hover:text-indigo-300 text-sm">
              View Details
            </Link>
            <Link href={`/dashboard/items/new?inventoryId=${inventory.id}`} className="text-green-400 hover:text-green-300 text-sm">
              Add Regular Item
            </Link>
            <Link href={`/dashboard/itemscrapings/new?inventoryId=${inventory.id}`} className="text-green-400 hover:text-green-300 text-sm">
              Add Scraped Item
            </Link>
            <button onClick={() => onEditClick(inventory)} className="text-yellow-400 hover:text-yellow-300 text-sm text-left">
              Edit
            </button>
            {!isConfirmingDelete ? (
              <button onClick={() => onDeleteClick(inventory.id)} className="text-red-400 hover:text-red-300 text-sm">
                Delete
              </button>
            ) : (
              <div className="flex space-x-2">
                <button onClick={onDeleteConfirm} className="text-red-400 hover:text-red-300 text-sm">Confirm</button>
                <button onClick={onDeleteCancel} className="text-indigo-400 hover:text-indigo-300 text-sm">Cancel</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function NewInventoryCard() {
  return (
    <Link href="/dashboard/inventories/new" className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md flex items-center justify-center hover:bg-opacity-20 transition duration-150 ease-in-out">
      <span className="text-white text-lg">+ New Inventory</span>
    </Link>
  );
}