'use client';

import { useState } from 'react';
import { parse } from 'csv-parse/sync';

export default function ManageReceipts() {
  const [csvData, setCsvData] = useState<any[]>([]);
  const [error, setError] = useState('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const records = parse(text, {
        columns: true,
        skip_empty_lines: true,
      });

      setCsvData(records);
      setError('');
    } catch (err) {
      console.error('Error parsing CSV:', err);
      setError('Failed to parse CSV. Please check the file format.');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white mb-4">Manage Receipts</h1>
      
      <div>
        <input
          type="file"
          onChange={handleFileUpload}
          accept=".csv,.txt"
          className="text-white"
        />
      </div>

      {error && <p className="text-red-500 mt-4">{error}</p>}

      {csvData.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">CSV Data</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white bg-opacity-10 rounded-lg overflow-hidden">
              <thead className="bg-gray-800 text-white">
                <tr>
                  {Object.keys(csvData[0]).map((header) => (
                    <th key={header} className="px-4 py-2">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvData.map((row, index) => (
                  <tr key={index} className="text-white">
                    {Object.values(row).map((value: any, cellIndex) => (
                      <td key={cellIndex} className="border px-4 py-2">{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}