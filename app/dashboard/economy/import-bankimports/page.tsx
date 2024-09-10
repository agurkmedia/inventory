'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ParsedBankImport {
  date: string;
  description: string;
  amount: number;
}

export default function ImportBankImports() {
  const [parsedBankImports, setParsedBankImports] = useState<ParsedBankImport[]>([]);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/import-bankimports', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to parse CSV');
      }

      const data = await response.json();
      setParsedBankImports(data.bankImports);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      setError('Failed to parse CSV. Please try again.');
    }
  };

  const handleSaveBankImports = async () => {
    try {
      const response = await fetch('/api/save-bankimports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bankImports: parsedBankImports }),
      });

      if (!response.ok) {
        throw new Error('Failed to save bank imports');
      }

      router.push('/dashboard/economy');
    } catch (error) {
      console.error('Error saving bank imports:', error);
      setError('Failed to save bank imports. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-5">Import Bank Imports</h1>
      <div className="mb-5">
        <input 
          type="file" 
          accept=".csv" 
          onChange={handleFileChange} 
          className="mb-2 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-violet-50 file:text-violet-700
            hover:file:bg-violet-100"
        />
        <button 
          onClick={handleFileChange} 
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Upload and Parse CSV
        </button>
      </div>
      {error && <p className="text-red-500 mb-5">{error}</p>}
      {parsedBankImports.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Parsed Bank Imports</h2>
          <table className="w-full mb-5">
            <thead>
              <tr>
                <th className="text-left">Date</th>
                <th className="text-left">Description</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {parsedBankImports.map((bankImport, index) => (
                <tr key={index}>
                  <td>{bankImport.date}</td>
                  <td>{bankImport.description}</td>
                  <td className="text-right">{bankImport.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button 
            onClick={handleSaveBankImports} 
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Save Bank Imports
          </button>
        </div>
      )}
    </div>
  );
}