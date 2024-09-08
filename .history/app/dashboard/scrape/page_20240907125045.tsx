'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ScrapedItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  price: number;
  sourceUrl: string;
}

interface Inventory {
  id: string;
  name: string;
  itemScrapings: ScrapedItem[];
}

export default function ScrapePage() {
  const [url, setUrl] = useState('');
  const [itemCount, setItemCount] = useState(10);
  const [scrapedData, setScrapedData] = useState<ScrapedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [selectedInventory, setSelectedInventory] = useState<string>('');
  const [newInventoryName, setNewInventoryName] = useState('');
  const [selectedInventoryData, setSelectedInventoryData] = useState<ScrapedItem[]>([]);

  useEffect(() => {
    // Fetch inventories with items in the ItemScraping field
    const fetchInventories = async () => {
      const res = await fetch('/api/inventories?withItems=true');
      const data = await res.json();
      setInventories(data);
      if (data.length > 0) {
        setSelectedInventory(data[0].id);
        setSelectedInventoryData(data[0].itemScrapings || []);
      }
    };

    fetchInventories();
  }, []);

  const handleScrape = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch item links
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, itemCount }),
      });
      if (!res.ok) {
        throw new Error('Failed to fetch item links');
      }
      const itemLinks = await res.json();

      // Set scraped data with item links only
      const items: ScrapedItem[] = itemLinks.map((link: string) => ({
        id: '',
        name: '',
        description: '',
        quantity: 0,
        price: 0,
        sourceUrl: link,
      }));

      console.log(`Total items scraped: ${items.length}`);
      setScrapedData(items);
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

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/scrape/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: scrapedData, inventoryId: selectedInventory }),
      });
      if (!res.ok) {
        throw new Error('Failed to save data');
      }
      alert('Data saved successfully');
      setScrapedData([]);
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

  const handleDeselect = (index: number) => {
    setScrapedData(scrapedData.filter((_, i) => i !== index));
  };

  const handleAddInventory = async () => {
    if (!newInventoryName) {
      alert('Inventory name is required');
      return;
    }

    try {
      const res = await fetch('/api/inventories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newInventoryName }),
      });
      if (!res.ok) {
        throw new Error('Failed to create inventory');
      }
      const newInventory = await res.json();
      setInventories([...inventories, newInventory]);
      setSelectedInventory(newInventory.id);
      setNewInventoryName('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  };

  const handleInventorySelect = (inventoryId: string) => {
    setSelectedInventory(inventoryId);
    const selectedInventory = inventories.find((inv) => inv.id === inventoryId);
    if (selectedInventory) {
      setSelectedInventoryData(selectedInventory.itemScrapings || []);
    }
  };

  const handleScrapeDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/scrape/details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventoryId: selectedInventory }),
      });
      if (!res.ok) {
        throw new Error('Failed to scrape details');
      }
      const updatedData = await res.json();
      setSelectedInventoryData(updatedData);
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
            Scrape Items
          </h2>
        </div>
        <div className="space-y-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL"
            required
            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-black bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
          />
          <input
            type="number"
            value={itemCount}
            onChange={(e) => setItemCount(parseInt(e.target.value, 10))}
            placeholder="Number of items"
            required
            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-black bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
          />
          <select
            value={selectedInventory}
            onChange={(e) => handleInventorySelect(e.target.value)}
            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
          >
            {inventories.map((inventory) => (
              <option key={inventory.id} value={inventory.id}>
                {inventory.name}
              </option>
            ))}
          </select>
          <div className="flex space-x-2">
            <input
              type="text"
              value={newInventoryName}
              onChange={(e) => setNewInventoryName(e.target.value)}
              placeholder="New Inventory Name"
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
            />
            <button
              onClick={handleAddInventory}
              className="group relative flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Add Inventory
            </button>
          </div>
          <button
            onClick={handleScrape}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Scrape
          </button>
          <button
            onClick={handleScrapeDetails}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Scrape Details
          </button>
          {loading && <div className="text-white">Loading...</div>}
          {error && <div className="text-red-500">{error}</div>}
          {scrapedData.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Scraped Data</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl shadow-2xl">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-black border">Name</th>
                      <th className="px-4 py-2 text-black border">Description</th>
                      <th className="px-4 py-2 text-black border">Quantity</th>
                      <th className="px-4 py-2 text-black border">Price</th>
                      <th className="px-4 py-2 text-black border">Source URL</th>
                      <th className="px-4 py-2 text-black border">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scrapedData.map((item, index) => (
                      <tr key={index}>
                        <td className="border px-4 py-2 text-black">{item.name}</td>
                        <td className="border px-4 py-2 text-black">{item.description}</td>
                        <td className="border px-4 py-2 text-black">{item.quantity}</td>
                        <td className="border px-4 py-2 text-black">{item.price}</td>
                        <td className="border px-4 py-2 bg-gray-200">
                          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                            {item.sourceUrl}
                          </a>
                        </td>
                        <td className="border px-4 py-2 text-black">
                          <button
                            onClick={() => handleDeselect(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Deselect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-white mt-4">Total items scraped: {scrapedData.length}</p>
              <button
                onClick={handleSave}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 mt-4"
              >
                Save to Database
              </button>
            </div>
          )}
          {selectedInventoryData && selectedInventoryData.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Inventory Data</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl shadow-2xl">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-black border">Name</th>
                      <th className="px-4 py-2 text-black border">Description</th>
                      <th className="px-4 py-2 text-black border">Quantity</th>
                      <th className="px-4 py-2 text-black border">Price</th>
                      <th className="px-4 py-2 text-black border">Source URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInventoryData.map((item, index) => (
                      <tr key={index}>
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
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}