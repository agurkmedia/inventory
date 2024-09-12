'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Papa from 'papaparse';

interface Receipt {
  id: string;
  storeName: string;
  totalAmount: number;
  date: string;
}

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
}

interface CSVModel {
  name: string;
  parseFunction: (results: Papa.ParseResult<any>) => ParsedTransaction[];
}

interface KeywordMapping {
  id: string;
  keyword: string;
  description: string;
}

const DNBModel: CSVModel = {
  name: 'DNB',
  parseFunction: (results: Papa.ParseResult<any>) => {
    return results.data.map((record: any) => ({
      date: record['Dato'],
      description: record['Forklaring'],
      amount: -(parseFloat(record['Ut fra konto'] || '0') - parseFloat(record['Inn på konto'] || '0')),
    }));
  },
};

const groupTransactionsByKeyword = (transactions: ParsedTransaction[], keywordMap: { [key: string]: string }) => {
  return transactions.reduce((groups: any, transaction) => {
    let groupKey = 'Other';
    for (const keyword in keywordMap) {
      if (transaction.description.toLowerCase().includes(keyword.toLowerCase())) {
        groupKey = keywordMap[keyword];
        break;
      }
    }

    if (!groups[groupKey]) {
      groups[groupKey] = {
        description: groupKey,
        totalAmount: 0,
        transactions: [],
      };
    }

    groups[groupKey].transactions.push(transaction);
    groups[groupKey].totalAmount += transaction.amount;

    return groups;
  }, {});
};

const csvModels: CSVModel[] = [DNBModel];

export default function ManageReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [groupedTransactions, setGroupedTransactions] = useState<any>({});
  const [error, setError] = useState('');
  const router = useRouter();
  const { data: session, status } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [keywordMappings, setKeywordMappings] = useState<KeywordMapping[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingMapping, setEditingMapping] = useState<KeywordMapping | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchReceipts();
      fetchKeywordMappings();
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

  const fetchKeywordMappings = async () => {
    try {
      const res = await fetch('/api/keyword-mappings');
      if (!res.ok) throw new Error('Failed to fetch keyword mappings');
      const data = await res.json();
      setKeywordMappings(data);
    } catch (err) {
      console.error('Failed to fetch keyword mappings:', err);
      setError('Failed to load keyword mappings. Please try again.');
    }
  };

  const handleAddKeywordMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/keyword-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: newKeyword, description: newDescription }),
      });
      if (!res.ok) throw new Error('Failed to add keyword mapping');
      fetchKeywordMappings();
      setNewKeyword('');
      setNewDescription('');
    } catch (err) {
      console.error('Failed to add keyword mapping:', err);
      setError('Failed to add keyword mapping. Please try again.');
    }
  };

  const handleEditKeywordMapping = (mapping: KeywordMapping) => {
    setEditingMapping(mapping);
    setNewKeyword(mapping.keyword);
    setNewDescription(mapping.description);
  };

  const handleUpdateKeywordMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMapping) return;

    try {
      const res = await fetch(`/api/keyword-mappings/${editingMapping.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: newKeyword, description: newDescription }),
      });
      if (!res.ok) throw new Error('Failed to update keyword mapping');
      const updatedMapping = await res.json();
      fetchKeywordMappings();
      setEditingMapping(null);
      setNewKeyword('');
      setNewDescription('');
    } catch (err) {
      console.error('Failed to update keyword mapping:', err);
      setError('Failed to update keyword mapping. Please try again.');
    }
  };

  const handleDeleteKeywordMapping = async (id: string) => {
    if (!confirm('Are you sure you want to delete this keyword mapping?')) return;

    try {
      const res = await fetch(`/api/keyword-mappings/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete keyword mapping');
      fetchKeywordMappings();
    } catch (err) {
      console.error('Failed to delete keyword mapping:', err);
      setError('Failed to delete keyword mapping. Please try again.');
    }
  };

  const handleAddOrUpdateKeywordMapping = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (editingMapping) {
      handleUpdateKeywordMapping(e);
    } else {
      handleAddKeywordMapping(e);
    }
  }, [editingMapping, newKeyword, newDescription]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        try {
          const parsed = DNBModel.parseFunction(results);
          console.log('Parsed transactions:', parsed);
          const keywordMap = keywordMappings.reduce((acc, mapping) => {
            acc[mapping.keyword] = mapping.description;
            return acc;
          }, {} as { [key: string]: string });
          const grouped = groupTransactionsByKeyword(parsed, keywordMap);
          setParsedTransactions(parsed);
          setGroupedTransactions(grouped);
          setError('');
        } catch (err) {
          console.error('Error parsing file:', err);
          setError('Failed to parse file. Please check the console for more details.');
        }
      },
      header: true,
      skipEmptyLines: true,
      delimiter: ';',
      error: (error) => {
        console.error('Error parsing CSV:', error);
        setError('Failed to parse CSV. Please check the file format.');
      }
    });
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
      </div>

      {error && <p className="text-red-500 mt-4">{error}</p>}

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-white mb-4">Keyword Mappings</h2>
        {keywordMappings.length === 0 ? (
          <p className="text-white">No keyword mappings found.</p>
        ) : (
          <ul className="space-y-2">
            {keywordMappings.map((mapping) => (
              <li key={mapping.id} className="text-white flex items-center justify-between">
                <span>{mapping.keyword}: {mapping.description}</span>
                <div>
                  <button
                    onClick={() => handleEditKeywordMapping(mapping)}
                    className="text-blue-400 hover:text-blue-300 mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteKeywordMapping(mapping.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAddOrUpdateKeywordMapping} className="mt-4 space-y-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="New keyword"
            className="bg-gray-700 text-white px-3 py-2 rounded"
          />
          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description"
            className="bg-gray-700 text-white px-3 py-2 rounded ml-2"
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded ml-2">
            {editingMapping ? 'Update Mapping' : 'Add Mapping'}
          </button>
          {editingMapping && (
            <button
              type="button"
              onClick={() => {
                setEditingMapping(null);
                setNewKeyword('');
                setNewDescription('');
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded ml-2"
            >
              Cancel
            </button>
          )}
        </form>
      </div>

      {Object.keys(groupedTransactions).length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Grouped Transactions</h2>
          {Object.keys(groupedTransactions).map((groupKey) => (
            <div key={groupKey} className="bg-white bg-opacity-10 p-4 rounded-lg mb-4">
              <h3 className="text-lg font-bold text-white">{groupedTransactions[groupKey].description}</h3>
              <p className="text-gray-300 mb-2">Total Amount: ${groupedTransactions[groupKey].totalAmount.toFixed(2)}</p>

              <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Description</th>
                    <th className="px-4 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedTransactions[groupKey].transactions.map((transaction: ParsedTransaction, index: number) => (
                    <tr key={index} className="text-white">
                      <td className="border px-4 py-2">{transaction.date}</td>
                      <td className="border px-4 py-2">{transaction.description}</td>
                      <td className="border px-4 py-2">${transaction.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
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
