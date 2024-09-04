'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Inventory {
  id: string;
  name: string;
  itemCount: number;
}

export default function InventoriesPage() {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch all inventories from the database
    const fetchInventories = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/inventories');
        const data = await res.json();
        const inventoriesWithItemCount = data.map((inventory: any) => ({
          id: inventory.id,
          name: inventory.name,
          itemCount: inventory._count.itemScrapings,
        }));
        setInventories(inventoriesWithItemCount);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchInventories();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -300, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="max-w-6xl w-full space-y-8 bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-8 shadow-2xl"
      >
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Inventories
          </h2>
        </div>
        {loading && <div className="text-white">Loading...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {inventories.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl shadow-2xl">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-black border">Inventory Name</th>
                  <th className="px-4 py-2 text-black border">Item Count</th>
                </tr>
              </thead>
              <tbody>
                {inventories.map((inventory) => (
                  <tr key={inventory.id}>
                    <td className="border px-4 py-2 text-black">{inventory.name}</td>
                    <td className="border px-4 py-2 text-black">{inventory.itemCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}