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
      let records;

      // Try to parse as CSV
      try {
        records = parse(text, {
          columns: true,
          skip_empty_lines: true,
        });
      } catch (csvError) {
        // If CSV parsing fails, treat it as a plain text file
        records = text.split('\n').map(line => {
          const [storeName, date, totalAmount, items] = line.split(',');
          return { storeName, date, totalAmount, items };
        });
      }

      const receipts: ParsedReceipt[] = records.map((record: any) => ({
        storeName: record.storeName,
        date: record.date,
        totalAmount: parseFloat(record.totalAmount),
        items: typeof record.items === 'string' ? JSON.parse(record.items) : record.items,
      }));

      setParsedReceipts(receipts);
      setError(null);
    } catch (err) {
      console.error('Error parsing file:', err);
      setError('Failed to parse file. Please check the file format.');
    }
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">Upload Receipts File</h2>
      <input
        type="file"
        onChange={handleFileUpload}
        className="mb-4"
      />
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {parsedReceipts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Parsed Receipts</h3>
          {parsedReceipts.map((receipt, index) => (
            <div key={index} className="mb-4 p-4 bg-white bg-opacity-10 rounded-lg">
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