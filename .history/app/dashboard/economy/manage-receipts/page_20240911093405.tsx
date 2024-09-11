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
  parseFunction: (csvText: string) => ParsedTransaction[];
}

const DNBModel: CSVModel = {
  name: 'DNB',
  parseFunction: (csvText: string) => {
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      relaxColumnCount: true,
      delimiter: [',', ';', '\t'],
    });

    return records.map((record: any) => ({
      date: record['Dato'] || record['Date'] || '',
      description: record['Forklaring'] || record['Description'] || '',
      amount: parseFloat(record['Beløp'] || record['Amount'] || '0'),
    }));
  },
};

export default function ManageReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [error, setError] = useState('');
  const router = useRouter();
  const { data: session, status } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedModel, setSelectedModel] = useState<CSVModel>(DNBModel);

  const csvModels: CSVModel[] = [DNBModel];

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
      const parsed = selectedModel.parseFunction(text);

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
        <button
          onClick={handleUploadClick}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
        >
          Upload File
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept=".csv,.txt"
        />
        <select
          value={selectedModel.name}
          onChange={(e) => setSelectedModel(csvModels.find(model => model.name === e.target.value) || DNBModel)}
          className="bg-gray-800 text-white px-4 py-2 rounded"
        >
          {csvModels.map(model => (
            <option key={model.name} value={model.name}>{model.name}</option>
          ))}
        </select>
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

      {receipts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Receipts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {receipts.map(receipt => (
              <div key={receipt.id} className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md relative">
                <h3 className="text-lg font-semibold text-white mb-1">{receipt.storeName}</h3>
                <p className="text-sm text-indigo-200 mb-1">Total Amount: ${receipt.totalAmount.toFixed(2)}</p>
                <p className="text-sm text-indigo-200 mb-2">Date: {receipt.date}</p>
                <div className="flex justify-between items-center mt-2">
                  <Link href={`/dashboard/economy/receipts/${receipt.id}`} className="text-indigo-400 hover:text-indigo-300 text-sm">
                    View Details
                  </Link>
                  <Link href={`/dashboard/economy/receipts/edit/${receipt.id}`} className="text-yellow-400 hover:text-yellow-300 text-sm">
                    Edit
                  </Link>
                  <button onClick={() => handleDeleteReceipt(receipt.id)} className="text-red-400 hover:text-red-300 text-sm">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}