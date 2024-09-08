'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
}

export default function ImportTransactions() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/import-transactions', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const result = await response.json();
      setParsedTransactions(result.transactions);
    } catch (err) {
      setError('Failed to upload and parse file');
      console.error(err);
    }
  };

  const handleSaveTransactions = async () => {
    try {
      const response = await fetch('/api/save-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactions: parsedTransactions }),
      });

      if (!response.ok) {
        throw new Error('Failed to save transactions');
      }

      router.push('/dashboard/economy');
    } catch (err) {
      setError('Failed to save transactions');
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-5">Import Transactions</h1>
      <div className="mb-5">
        <input type="file" accept=".csv" onChange={handleFileChange} className="mb-2" />
        <button onClick={handleUpload} className="bg-blue-500 text-white px-4 py-2 rounded">
          Upload and Parse
        </button>
      </div>
      {error && <p className="text-red-500 mb-5">{error}</p>}
      {parsedTransactions.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Parsed Transactions</h2>
          <table className="w-full mb-5">
            <thead>
              <tr>
                <th className="text-left">Date</th>
                <th className="text-left">Description</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {parsedTransactions.map((transaction, index) => (
                <tr key={index}>
                  <td>{transaction.date}</td>
                  <td>{transaction.description}</td>
                  <td className="text-right">{transaction.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleSaveTransactions} className="bg-green-500 text-white px-4 py-2 rounded">
            Save Transactions
          </button>
        </div>
      )}
      <Link href="/dashboard/economy" className="block mt-5 text-blue-500">
        Back to Economy
      </Link>
    </div>
  );
}