'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface DNBTransaction {
  date: string;
  amount: number;
  text: string;
  category: string;
}

export default function ImportPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [importMethod, setImportMethod] = useState<'pdf' | 'ocr'>('pdf');
  const [transactions, setTransactions] = useState<DNBTransaction[]>([]);
  const { data: session } = useSession();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/import-pdf');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setMessage('Please select a file');
      return;
    }

    setUploading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('method', importMethod);

    try {
      const response = await fetch('/api/import-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setMessage(`${result.message} (${result.transactionsCount} transactions imported)`);
      setFile(null);
      fetchTransactions();
    } catch (error) {
      console.error('Error importing PDF:', error);
      setMessage(`Error importing PDF: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setUploading(false);
    }
  };

  if (!session) {
    return <div>Please sign in to access this page.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Import PDF</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="mb-4">
          <label htmlFor="file" className="block text-sm font-medium text-gray-700">
            Select PDF file
          </label>
          <input
            type="file"
            id="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-violet-50 file:text-violet-700
                      hover:file:bg-violet-100"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Import Method</label>
          <div>
            <label className="inline-flex items-center mr-4">
              <input
                type="radio"
                value="pdf"
                checked={importMethod === 'pdf'}
                onChange={() => setImportMethod('pdf')}
                className="form-radio"
              />
              <span className="ml-2">PDF Parsing</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="ocr"
                checked={importMethod === 'ocr'}
                onChange={() => setImportMethod('ocr')}
                className="form-radio"
              />
              <span className="ml-2">OCR Processing</span>
            </label>
          </div>
        </div>
        <button
          type="submit"
          disabled={uploading || !file}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {uploading ? 'Importing...' : 'Import PDF'}
        </button>
      </form>
      {message && <p className="text-sm text-gray-600 mb-4">{message}</p>}
      
      <h2 className="text-xl font-bold mb-2">Imported Transactions</h2>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-4 py-2">Date</th>
            <th className="border border-gray-300 px-4 py-2">Amount</th>
            <th className="border border-gray-300 px-4 py-2">Description</th>
            <th className="border border-gray-300 px-4 py-2">Category</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction, index) => (
            <tr key={index}>
              <td className="border border-gray-300 px-4 py-2">{new Date(transaction.date).toLocaleDateString()}</td>
              <td className="border border-gray-300 px-4 py-2">{transaction.amount.toFixed(2)}</td>
              <td className="border border-gray-300 px-4 py-2">{transaction.text}</td>
              <td className="border border-gray-300 px-4 py-2">{transaction.category}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}