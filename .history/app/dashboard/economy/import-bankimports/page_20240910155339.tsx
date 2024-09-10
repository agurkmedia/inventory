'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Papa from 'papaparse';

export default function ImportBankImports() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleFileUpload = () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    Papa.parse(file, {
      complete: (result) => {
        setParsedData(result.data);
      },
      header: true,
      skipEmptyLines: true,
    });
  };

  const handleSaveImports = async () => {
    if (!session) {
      setError('You must be logged in to save imports.');
      return;
    }

    try {
      const response = await fetch('/api/save-bankimports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedData),
      });

      if (!response.ok) {
        throw new Error('Failed to save imports');
      }

      const result = await response.json();
      console.log(result.message);
      // You might want to add some user feedback here
    } catch (error) {
      console.error('Error saving imports:', error);
      setError('Failed to save imports. Please try again.');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Import Bank Transactions</h1>
      <div className="mb-4">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="mb-2"
        />
        <button
          onClick={handleFileUpload}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Upload and Parse CSV
        </button>
      </div>
      {error && <p className="text-red-500">{error}</p>}
      {parsedData.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-2">Parsed Data:</h2>
          <pre>{JSON.stringify(parsedData, null, 2)}</pre>
          <button
            onClick={handleSaveImports}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-4"
          >
            Save Imports
          </button>
        </div>
      )}
    </div>
  );
}