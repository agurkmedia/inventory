'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { parse } from 'csv-parse/sync';

interface Receipt {
  id: string;
  storeName: string;
  totalAmount: number;
  date: string;
}

interface ParsedReceipt {
  storeName: string;
  date: string;
  totalAmount: number;
  items: { name: string; quantity: number; price: number }[];
}

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
}

interface CSVModel {
  name: string;
  parseFunction: (text: string) => ParsedTransaction[];
}

const DNBModel: CSVModel = {
  name: 'DNB',
  parseFunction: (text: string) => {
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ';',
    });

    return records.map((record: any) => ({
      date: record['Dato'],
      description: record['Forklaring'],
      amount: -(parseFloat(record['Ut fra konto'] || '0') - parseFloat(record['Inn på konto'] || '0')),
    }));
  },
};

const csvModels: CSVModel[] = [DNBModel];

export default function ManageReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [error, setError] = useState('');
  const router = useRouter();
  const { data: session, status } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchReceipts();
    }
  }, [status]);

  const fetchReceipts = async () => {
    try {
      const res = await fetch('/api/receipts');
      if (!res.ok) throw new Error('Failed to fetch receipts');
      const data = await res.json();
      setReceipts(data);
    } catch (err) {
      console.error('Failed to fetch receipts:', err);
      setError('Failed to load receipts. Please try again.');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        relaxColumnCount: true,
        delimiter: [',', ';', '\t'], // Accept multiple delimiters
      });

      const parsed = records.map((record: any) => ({
        date: record['Dato'] || record['Date'] || '',
        description: record['Forklaring'] || record['Description'] || '',
        amount: parseFloat(record['Beløp'] || record['Amount'] || '0'),
      }));

      console.log('Parsed transactions:', parsed);
      setParsedTransactions(parsed);
      setError('');
    } catch (err) {
      console.error('Error parsing file:', err);
      setError('Failed to parse file. Please check the console for more details.');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteReceipt = async (id: string) => {
    if (!confirm('Are you sure you want to delete this receipt?')) return;

    try {
      const res = await fetch(`/api/receipts/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchReceipts();
      } else {
        throw new Error('Failed to delete receipt');
      }
    } catch (error) {
      console.error('Error deleting receipt:', error);
      setError('Failed to delete receipt. Please try again.');
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white mb-4">Manage Receipts</h1>
      
      <div className="flex space-x-4">
        <Link href="/dashboard/economy/add-receipt" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
          Add New Receipt
        </Link>
        <label className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out cursor-pointer">
          Upload File
          <input type="file" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {error && <p className="text-red-500 mt-4">{error}</p>}

      {parsedTransactions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Parsed Transactions</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white bg-opacity-10 rounded-lg overflow-hidden">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {parsedTransactions.map((transaction, index) => (
                  <tr key={index} className="text-white">
                    <td className="border px-4 py-2">{transaction.date}</td>
                    <td className="border px-4 py-2">{transaction.description}</td>
                    <td className="border px-4 py-2">${transaction.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-white mb-4">Your Receipts</h2>
        {receipts.length === 0 ? (
          <p className="text-white">No receipts found.</p>
        ) : (
          <ul className="space-y-4">
            {receipts.map((receipt) => (
              <li key={receipt.id} className="bg-white bg-opacity-10 p-4 rounded-lg">
                <p className="text-lg font-semibold text-white">{receipt.storeName}</p>
                <p className="text-sm text-gray-300">Date: {new Date(receipt.date).toLocaleDateString()}</p>
                <p className="text-sm text-gray-300">Total: ${receipt.totalAmount.toFixed(2)}</p>
                <div className="mt-2">
                  <Link href={`/dashboard/economy/receipts/${receipt.id}`} className="text-blue-400 hover:text-blue-300 mr-4">
                    View Details
                  </Link>
                  <button onClick={() => handleDeleteReceipt(receipt.id)} className="text-red-400 hover:text-red-300">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}