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
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, itemCount }),
      });
      if (!res.ok) {
        throw new Error('Failed to scrape data');
      }
      const data = await res.json();
      setScrapedData(data);
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
 