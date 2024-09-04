'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';

interface ScrapedItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  price: number;
  sourceUrl: string;
  image: string;
}

export default function InventoryDetailsPage() {
  const [items, setItems] = useState<ScrapedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    // Fetch items for the selected inventory
    const fetchItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/inventories/${id}/items`);
        if (!res.ok) {
          throw new Error('Failed to fetch items');
        }
        const data = await res.json();
        setItems(data);
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

    fetchItems();
  }, [id]);

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
            Inventory Details
          </h2>
        </div>
        {loading && <div className="text-white">Loading...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl shadow-2xl">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-black border">Image</th>
                  <th className="px-4 py-2 text-black border">Name</th>
                  <th className="px-4 py-2 text-black border">Description</th>
                  <th className="px-4 py-2 text-black border">Quantity</th>
                  <th className="px-4 py-2 text-black border">Price</th>
                  <th className="px-4 py-2 text-black border">Source URL</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="border px-4 py-2 text-black">
                      <img src={item.image} alt={item.name} className="w-16 h-16 object-cover" />
                    </td>
                    <td className="border px-4 py-2 text-black">{item.name}</td>
                    <td className="border px-4 py-2 text-black">{item.description}</td>
                    <td className="border px-4 py-2 text-black">{item.quantity}</td>
                    <td className="border px-4 py-2 text-black">{item.price}</td>
                    <td className="border px-4 py-2 bg-gray-200">
                      <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                        {item.sourceUrl}
                      </a>
                    </td>
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