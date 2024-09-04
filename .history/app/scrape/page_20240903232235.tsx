'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function ScrapePage() {
  const [url, setUrl] = useState('');
  const [itemCount, setItemCount] = useState(10);
  const [scrapedData, setScrapedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleScrape = async () => {
    setLoading(true);
    setError('');
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

      // Fetch item details for each link
      const items = [];
      for (const itemUrl of itemLinks) {
        const itemRes = await fetch('/api/scrape/item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: itemUrl }),
        });
        if (!itemRes.ok) {
          throw new Error('Failed to fetch item details');
        }
        const item = await itemRes.json();
        items.push(item);
      }

      console.log(`Total items scraped: ${items.length}`);
      setScrapedData(items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/scrape/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: scrapedData }),
      });
      if (!res.ok) {
        throw new Error('Failed to save data');
      }
      alert('Data saved successfully');
      setScrapedData([]);
    } catch (err) {
      setError(err.message);
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
        className="max-w-md w-full space-y-8 bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-8 shadow-2xl"
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
            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
          />
          <input
            type="number"
            value={itemCount}
            onChange={(e) => setItemCount(parseInt(e.target.value, 10))}
            placeholder="Number of items"
            required
            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
          />
          <button
            onClick={handleScrape}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Scrape
          </button>
          {loading && <div className="text-white">Loading...</div>}
          {error && <div className="text-red-500">{error}</div>}
          {scrapedData.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Scraped Data</h3>
              <pre className="text-white bg-gray-800 p-4 rounded">{JSON.stringify(scrapedData, null, 2)}</pre>
              <button
                onClick={handleSave}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 mt-4"
              >
                Save to Database
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}