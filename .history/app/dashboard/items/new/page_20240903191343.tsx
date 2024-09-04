'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function NewItem() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [inventoryId, setInventoryId] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [inventories, setInventories] = useState([]);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Fetch inventories
    fetch('/api/inventories')
      .then(res => res.json())
      .then(data => setInventories(data))
      .catch(err => console.error('Failed to fetch inventories:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('quantity', quantity.toString());
      formData.append('inventoryId', inventoryId);
      if (image) {
        formData.append('image', image);
      }

      const res = await fetch('/api/items', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        router.refresh();
        router.push('/dashboard');
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create item');
      }
    } catch (error) {
      console.error('Error creating item:', error);
      setError(error.message || 'An error occurred while creating the item');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-8 shadow-xl max-w-md w-full"
      >
        <h2 className="text-2xl font-bold text-white mb-6">Add New Item</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-indigo-200">
              Item Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black bg-white"
              placeholder="Enter item name"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-indigo-200">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black bg-white"
              placeholder="Enter item description"
            />
          </div>
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-indigo-200">
              Quantity
            </label>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              required
              min="0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black bg-white"
            />
          </div>
          <div>
            <label htmlFor="inventoryId" className="block text-sm font-medium text-indigo-200">
              Inventory
            </label>
            <select
              id="inventoryId"
              value={inventoryId}
              onChange={(e) => setInventoryId(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black bg-white"
            >
              <option value="">Select an inventory</option>
              {inventories.map((inventory) => (
                <option key={inventory.id} value={inventory.id}>
                  {inventory.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="image" className="block text-sm font-medium text-indigo-200">
              Item Image
            </label>
            <input
              type="file"
              id="image"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-indigo-50 file:text-indigo-700
                        hover:file:bg-indigo-100"
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Item
          </button>
        </form>
      </motion.div>
    </div>
  );
}