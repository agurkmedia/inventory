'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function NewInventory() {
  const [name, setName] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inventories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        router.push('/dashboard');
        router.refresh(); // This will trigger a re-render of the dashboard
      } else {
        throw new Error('Failed to create inventory');
      }
    } catch (error) {
      console.error('Error creating inventory:', error);
      // Here you could set an error state and display it to the user
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
        <h2 className="text-2xl font-bold text-white mb-6">Create New Inventory</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-indigo-200">
              Inventory Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              placeholder="Enter inventory name"
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create Inventory
          </button>
        </form>
      </motion.div>
    </div>
  );
}