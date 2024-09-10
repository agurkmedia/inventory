import React, { useState } from 'react';
import { parse } from 'csv-parse/sync';

interface ParsedReceipt {
  storeName: string;
  date: string;
  totalAmount: number;
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
}

const ReceiptCSVUploader: React.FC = () => {
  const [parsedReceipts, setParsedReceipts] = useState<ParsedReceipt[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const records = parse(text, {
        columns: true,
        skip_empty_lines: true,
      });

      const receipts: ParsedReceipt[] = records.map((record: any) => ({
        storeName: record.storeName,
        date: record.date,
        totalAmount: parseFloat(record.totalAmount),
        items: JSON.parse(record.items),
      }));

      setParsedReceipts(receipts);
      setError(null);
    } catch (err) {
      console.error('Error parsing CSV:', err);
      setError('Failed to parse CSV. Please check the file format.');
    }
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4 text-white">Upload Receipts CSV</h2>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="mb-4 text-white"
      />
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {parsedReceipts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2 text-white">Parsed Receipts</h3>
          {parsedReceipts.map((receipt, index) => (
            <div key={index} className="mb-4 p-4 bg-white bg-opacity-10 rounded-lg text-white">
              <p><strong>Store:</strong> {receipt.storeName}</p>
              <p><strong>Date:</strong> {receipt.date}</p>
              <p><strong>Total Amount:</strong> ${receipt.totalAmount.toFixed(2)}</p>
              <h4 className="font-semibold mt-2">Items:</h4>
              <ul>
                {receipt.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    {item.name} - Quantity: {item.quantity}, Price: ${item.price.toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReceiptCSVUploader;