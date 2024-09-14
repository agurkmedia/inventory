'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Papa from 'papaparse';

interface Receipt {
  id: string;
  storeName: string;
  totalAmount: number;
  date: string;
  receiptItems?: ReceiptItem[];
}

interface ReceiptItem {
  id: string;
  quantity: number;
  totalPrice: number;
  item: Item;
  category: ExpenseCategory;
  date: string;
}

interface Item {
  id: string;
  name: string;
  inventoryId: string;
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

interface Inventory {
  id: string;
  name: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
}

const DNBModel: CSVModel = {
  name: 'DNB',
  parseFunction: (results: Papa.ParseResult<any>) => {
    return results.data.map((record: any) => {
      const rawDate = record['Dato'];
      const parsedDate = rawDate ? rawDate.split('.').reverse().join('-') : null;

      return {
        date: parsedDate,
        description: record['Forklaring'],
        amount: -(parseFloat(record['Ut fra konto'] || '0') - parseFloat(record['Inn på konto'] || '0')),
      };
    });
  },
};

const groupTransactionsByKeyword = (
  transactions: ParsedTransaction[],
  keywordMap: { [key: string]: string }
) => {
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
  const [successMessage, setSuccessMessage] = useState(''); // Success message state
  const router = useRouter();
  const { data: session, status } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [keywordMappings, setKeywordMappings] = useState<KeywordMapping[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingMapping, setEditingMapping] = useState<KeywordMapping | null>(null);
  const [showKeywordMappings, setShowKeywordMappings] = useState(true);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<{ [key: string]: string }>({});
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [receiptsInventoryId, setReceiptsInventoryId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchReceipts();
      fetchKeywordMappings();
      fetchInventories();
      fetchExpenseCategories();
      ensureReceiptsInventory();
    }
  }, [status]);

  const keywordMap = useMemo(() => {
    return keywordMappings.reduce((acc, mapping) => {
      acc[mapping.keyword.toLowerCase()] = mapping.description;
      return acc;
    }, {} as { [key: string]: string });
  }, [keywordMappings]);

  useEffect(() => {
    if (parsedTransactions.length > 0) {
      const grouped = groupTransactionsByKeyword(parsedTransactions, keywordMap);
      setGroupedTransactions(grouped);
    }
  }, [parsedTransactions, keywordMap]);

  // Fetch functions (unchanged)
  // ...

  // File Upload Handlers

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    let allParsedTransactions: ParsedTransaction[] = [];

    Array.from(files).forEach((file) => {
      Papa.parse(file, {
        complete: (results) => {
          try {
            const parsed = DNBModel.parseFunction(results);
            allParsedTransactions = allParsedTransactions.concat(parsed);
          } catch (err) {
            console.error('Error parsing file:', err);
            setError('Failed to parse file. Please check the console for more details.');
          }

          // Set the combined parsed transactions
          setParsedTransactions(allParsedTransactions);
          setError('');
        },
        header: true,
        skipEmptyLines: true,
        delimiter: ';',
        error: (error) => {
          console.error('Error parsing CSV:', error);
          setError('Failed to parse CSV. Please check the file format.');
        },
      });
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Save Grouping Handler
  const handleSaveGrouping = async (groupKey: string) => {
    try {
      const group = groupedTransactions[groupKey];
      const categoryId = selectedCategories[groupKey];

      if (!categoryId) {
        throw new Error('Please select a category before saving.');
      }

      // Ensure we have a Receipts inventory
      if (!receiptsInventoryId) {
        await ensureReceiptsInventory();
      }

      // Collect unique item descriptions
      const descriptions = [
        ...new Set(group.transactions.map((t: ParsedTransaction) => t.description.trim())),
      ];

      // Fetch or create items in bulk
      const items = await fetchOrCreateItems(descriptions, receiptsInventoryId || '');

      // Map items for quick access
      const itemsMap = new Map(items.map((item: Item) => [item.name, item]));

      // Prepare receipt data
      const receiptData = {
        storeName: groupKey,
        totalAmount: Math.abs(group.totalAmount),
        date: new Date().toISOString(), // Use current date for the receipt
        items: group.transactions.map((transaction: ParsedTransaction) => {
          const itemName = transaction.description.trim();
          const item = itemsMap.get(itemName);

          return {
            name: itemName,
            inventoryId: receiptsInventoryId,
            quantity: 1,
            totalPrice: Math.abs(transaction.amount),
            categoryId: categoryId,
            date: transaction.date, // Include the date from the transaction
          };
        }),
      };

      // Send the receipt data to the backend
      const receiptRes = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receiptData),
      });

      if (!receiptRes.ok) {
        const errorText = await receiptRes.text();
        throw new Error(`Failed to create receipt: ${errorText}`);
      }

      const receiptResponse = await receiptRes.json();
      const backendMessage = receiptResponse.message || "Receipt processed successfully.";
      const itemsAdded = receiptData.items.length;

      // Remove the saved grouping from the state
      setGroupedTransactions((prev) => {
        const updated = { ...prev };
        delete updated[groupKey];
        return updated;
      });

      fetchReceipts();
      setError('');
      setSuccessMessage(`Grouping "${groupKey}": ${backendMessage}. Items added: ${itemsAdded}.`);
    } catch (err: any) {
      console.error('Failed to save grouping:', err);
      setError(`Failed to save grouping "${groupKey}" as a receipt. ${err.message}`);
      setSuccessMessage(''); // Clear success message on error
    }
  };

  // JSX (HTML) Structure
  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white mb-4">Manage Receipts</h1>

      <div className="flex space-x-4">
        <Link
          href="/dashboard/economy/add-receipt"
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
        >
          Add New Receipt
        </Link>
        <button
          onClick={handleUploadClick}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
        >
          Upload Files
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept=".csv,.txt"
          multiple // Allow multiple file selection
        />
      </div>

      {successMessage && <p className="text-green-500 mt-4">{successMessage}</p>}
      {error && <p className="text-red-500 mt-4">{error}</p>}

      {/* The rest of your JSX structure remains unchanged */}
      {/* Displaying grouped transactions, receipt list, etc. */}

      {Object.keys(groupedTransactions).length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Grouped Transactions</h2>
          {Object.keys(groupedTransactions).map((groupKey) => (
            <div key={groupKey} className="bg-white bg-opacity-10 p-4 rounded-lg mb-4">
              <h3 className="text-lg font-bold text-white">{groupedTransactions[groupKey].description}</h3>
              <p className="text-gray-300 mb-2">
                Total Amount: {groupedTransactions[groupKey].totalAmount.toFixed(2)} NOK
              </p>

              <div className="mb-4 flex items-center justify-between">
                <div className="flex-grow mr-4">
                  <label
                    htmlFor={`category-${groupKey}`}
                    className="block text-sm font-medium text-gray-300"
                  >
                    Expense Category
                  </label>
                  <select
                    id={`category-${groupKey}`}
                    value={selectedCategories[groupKey] || ''}
                    onChange={(e) => handleCategoryChange(groupKey, e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-black bg-white"
                  >
                    <option value="">Select a category</option>
                    {expenseCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                    <option value="new">+ Create new category</option>
                  </select>
                </div>
                <button
                  onClick={() => handleSaveGrouping(groupKey)}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
                >
                  Save as Receipt
                </button>
              </div>

              <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Description</th>
                    <th className="px-4 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedTransactions[groupKey].transactions.map(
                    (transaction: ParsedTransaction, index: number) => (
                      <tr key={index} className="text-white">
                        <td className="border px-4 py-2">{transaction.date}</td>
                        <td className="border px-4 py-2">{transaction.description}</td>
                        <td className="border px-4 py-2">
                          {transaction.amount.toFixed(2)} NOK
                        </td>
                      </tr>
                    )
                  )}
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
                <p className="text-sm text-gray-300">
                  Date: {new Date(receipt.date).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-300">
                  Total: {receipt.totalAmount.toFixed(2)} NOK
                </p>
                <div className="mt-2">
                  <Link
                    href={`/dashboard/economy/receipts/${receipt.id}`}
                    className="text-blue-400 hover:text-blue-300 mr-4"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => handleDeleteReceipt(receipt.id)}
                    className="text-red-400 hover:text-red-300"
                  >
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
