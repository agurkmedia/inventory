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
  id: string;
  name: string;
  isDefault: boolean;
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

const DNBModel = {
  name: 'DNB',
  parseFunction: (results: Papa.ParseResult<any>) => {
    return results.data.map((record: any) => {
      const rawDate = record['Dato'];
      const parsedDate = rawDate ? rawDate.split('.').reverse().join('-') : null;
      const outAmount = parseFloat(record['Ut fra konto']?.replace(',', '.') || '0');
      const inAmount = parseFloat(record['Inn på konto']?.replace(',', '.') || '0');
      const amount = inAmount - outAmount;

      return {
        date: parsedDate,
        description: record['Forklaring'],
        amount: amount,
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

export default function ManageReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [groupedTransactions, setGroupedTransactions] = useState<any>({});
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchReceipts();
      fetchKeywordMappings();
      fetchInventories();
      fetchExpenseCategories();
      ensureReceiptsInventory();
      fetchExistingReceiptItems();
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

  const [existingReceiptItems, setExistingReceiptItems] = useState<ReceiptItem[]>([]);
  const [showExistingItems, setShowExistingItems] = useState(false);

  const fetchExistingReceiptItems = async () => {
    try {
      const res = await fetch('/api/receipts/items');
      if (!res.ok) throw new Error('Failed to fetch existing receipt items');
      const data = await res.json();
      console.log('Fetched existing receipt items:', data);
      setExistingReceiptItems(data);
    } catch (err) {
      console.error('Failed to fetch existing receipt items:', err);
      setError('Failed to load existing receipt items. Please try again.');
    }
  };

  const fetchInventories = async () => {
    try {
      const res = await fetch('/api/inventories');
      if (!res.ok) throw new Error('Failed to fetch inventories');
      const data = await res.json();
      setInventories(data);
    } catch (err) {
      console.error('Failed to fetch inventories:', err);
      setError('Failed to load inventories. Please try again.');
    }
  };

  const fetchExpenseCategories = async () => {
    try {
      const res = await fetch('/api/expense-categories');
      if (!res.ok) throw new Error('Failed to fetch expense categories');
      const data = await res.json();
      setExpenseCategories(data);
    } catch (err) {
      console.error('Failed to fetch expense categories:', err);
      setError('Failed to load expense categories. Please try again.');
    }
  };

  const ensureReceiptsInventory = async () => {
    try {
      const existingInventories = await fetch('/api/inventories').then((res) => res.json());
      const receiptsInventory = existingInventories.find((inv: Inventory) => inv.name === 'Receipts');

      if (receiptsInventory) {
        setReceiptsInventoryId(receiptsInventory.id);
      } else {
        const res = await fetch('/api/inventories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Receipts' }),
        });
        if (!res.ok) throw new Error('Failed to create Receipts inventory');
        const newInventory = await res.json();
        setReceiptsInventoryId(newInventory.id);
      }
    } catch (err) {
      console.error('Failed to ensure Receipts inventory:', err);
      setError('Failed to ensure Receipts inventory. Please try again.');
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
      await fetchKeywordMappings();
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
      const res = await fetch(`/api/keyword-mappings?id=${editingMapping.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: newKeyword, description: newDescription }),
      });
      if (!res.ok) throw new Error('Failed to update keyword mapping');
      await fetchKeywordMappings();
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
      const res = await fetch(`/api/keyword-mappings?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete keyword mapping');
      await fetchKeywordMappings();
    } catch (err) {
      console.error('Failed to delete keyword mapping:', err);
      setError('Failed to delete keyword mapping. Please try again.');
    }
  };

  const handleAddOrUpdateKeywordMapping = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (editingMapping) {
        handleUpdateKeywordMapping(e);
      } else {
        handleAddKeywordMapping(e);
      }
    },
    [editingMapping, newKeyword, newDescription]
  );

  const [processedGroups, setProcessedGroups] = useState<string[]>([]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
  
    let allParsedTransactions: ParsedTransaction[] = [];
  
    Array.from(files).forEach((file) => {
      Papa.parse(file, {
        complete: async (results) => {
          try {
            const parsed = DNBModel.parseFunction(results);
  
            console.log('Parsed transactions:', parsed);
  
            const response = await fetch('/api/receipts/filter', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ transactions: parsed }),
            });
  
            if (!response.ok) {
              throw new Error('Failed to filter transactions on the server');
            }
  
            const filteredTransactions = await response.json();
            
            console.log('Filtered transactions from server:', filteredTransactions);
  
            allParsedTransactions = allParsedTransactions.concat(filteredTransactions);
          } catch (err) {
            console.error('Error processing file:', err);
            setError('Failed to process the file. Please check the console for more details.');
          }
  
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
  
  const handleToggleShowExistingItems = () => {
    setShowExistingItems(!showExistingItems);
  };
   
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSaveGrouping = async (groupKey: string) => {
    try {
      const group = groupedTransactions[groupKey];
      const categoryId = selectedCategories[groupKey];
  
      if (!categoryId) {
        throw new Error('Please select a category before saving.');
      }
  
      if (!receiptsInventoryId) {
        await ensureReceiptsInventory();
      }
  
      const descriptions = Array.from(new Set(group.transactions.map((t: ParsedTransaction) => t.description.trim())));
      const items = await fetchOrCreateItems(descriptions as string[], receiptsInventoryId || '');
  
      const itemsMap = new Map(items.map((item: Item) => [item.name, item]));
      const receiptData = {
        storeName: groupKey,
        totalAmount: group.transactions.reduce((acc, transaction) => acc + transaction.amount, 0),
        date: new Date().toISOString(),
        items: group.transactions.map((transaction: ParsedTransaction) => {
          const itemName = transaction.description.trim();
          const item = itemsMap.get(itemName);
  
          return {
            name: itemName,
            inventoryId: receiptsInventoryId,
            quantity: 1,
            totalPrice: transaction.amount,
            categoryId: categoryId,
            date: transaction.date,
          };
        }),
      };
  
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
      const backendMessage = receiptResponse.message || 'Receipt processed successfully.';
      const itemsAdded = receiptData.items.length;
  
      setProcessedGroups((prev) => [...prev, groupKey]);
  
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
      setSuccessMessage('');
    }
  };
  
  const fetchOrCreateItems = async (names: string[], inventoryId: string) => {
    try {
      const res = await fetch('/api/items/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names, inventoryId }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch or create items: ${errorText}`);
      }

      return await res.json();
    } catch (err) {
      console.error('Error fetching or creating items:', err);
      throw err;
    }
  };

  const handleCategoryChange = async (groupKey: string, value: string) => {
    if (value === 'new') {
      const categoryName = prompt('Enter new category name:');
      if (categoryName) {
        try {
          const newCategory = await createExpenseCategory(categoryName);
          setSelectedCategories((prev) => ({
            ...prev,
            [groupKey]: newCategory.id,
          }));
          setExpenseCategories([...expenseCategories, newCategory]);
        } catch (error) {
          console.error('Failed to create new category:', error);
          setError('Failed to create new category. Please try again.');
        }
      }
    } else {
      setSelectedCategories((prev) => ({
        ...prev,
        [groupKey]: value,
      }));
    }
  };

  const createExpenseCategory = async (name: string): Promise<ExpenseCategory> => {
    const res = await fetch('/api/expense-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) throw new Error('Failed to create expense category');
    const newCategory = await res.json();
    setExpenseCategories([...expenseCategories, newCategory]);
    return newCategory;
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

  const toggleKeywordMappings = () => {
    setShowKeywordMappings(!showKeywordMappings);
  };

  useEffect(() => {
    const filtered = receipts.filter(receipt =>
      receipt.storeName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredReceipts(filtered);
  }, [searchTerm, receipts]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }



return (
  const fetchCSVModels = async () => {
    try {
      const res = await fetch('/api/csv-models');
      if (!res.ok) throw new Error('Failed to fetch CSV models');
      const data = await res.json();
      setCsvModels(data);
      // Set the default model
      const defaultModel = data.find((model: CSVModel) => model.isDefault);
      if (defaultModel) setSelectedModel(defaultModel.id);
    } catch (err) {
      console.error('Failed to fetch CSV models:', err);
      setError('Failed to load CSV models. Please try again.');
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(e.target.value);
  };

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
        multiple
      />
    </div>

    {successMessage && <p className="text-green-500 mt-4">{successMessage}</p>}
    {error && <p className="text-red-500 mt-4">{error}</p>}

    {/* Toggle Button for Showing/Hiding Existing Items */}
    <div className="mt-4">
      <button
        onClick={handleToggleShowExistingItems}
        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
      >
        {showExistingItems ? 'Hide Existing Items' : 'Show Existing Items'}
      </button>
    </div>

    {/* CSV Model Selection */}
    <div className="mt-4">
      <label htmlFor="csvModel" className="block text-sm font-medium text-white">
        Select CSV Model
      </label>
      <select
        id="csvModel"
        value={selectedModel}
        onChange={handleModelChange}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
      >
        {csvModels.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
    </div>

    {/* Keyword Mappings Section */}
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Keyword Mappings</h2>
        <button
          onClick={toggleKeywordMappings}
          className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
        >
          {showKeywordMappings ? 'Hide' : 'Show'} Keyword Mappings
        </button>
      </div>

      {showKeywordMappings && (
        <>
          <form onSubmit={editingMapping ? handleUpdateKeywordMapping : handleAddKeywordMapping} className="mb-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Keyword"
                className="flex-1 p-2 rounded text-black"
                required
              />
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description"
                className="flex-1 p-2 rounded text-black"
                required
              />
              <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
                {editingMapping ? 'Update' : 'Add'} Mapping
              </button>
              {editingMapping && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingMapping(null);
                    setNewKeyword('');
                    setNewDescription('');
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <ul className="space-y-2">
            {keywordMappings.map((mapping) => (
              <li key={mapping.id} className="flex justify-between items-center bg-white bg-opacity-10 p-2 rounded">
                <span className="text-white">{mapping.keyword} → {mapping.description}</span>
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
        </>
      )}
    </div>

    {/* Grouped Transactions Section */}
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
              {groupedTransactions[groupKey].transactions
  .filter((transaction) => {
    // Show all items if toggled to show existing items
    if (showExistingItems) return true;

    // Otherwise, filter out items that exist in the database
    return !existingReceiptItems.some((item) => {
      const transactionDate = new Date(transaction.date).toISOString().split('T')[0];
      const itemDate = new Date(item.date).toISOString().split('T')[0];

      return (
        item.item.name === transaction.description.trim() &&
        itemDate === transactionDate &&
        item.totalPrice === Math.abs(transaction.amount)
      );
    });
  })
  .map((transaction: ParsedTransaction, index: number) => (
    <tr key={index} className="text-white">
      <td className="border px-4 py-2">{transaction.date}</td>
      <td className="border px-4 py-2">{transaction.description}</td>
      <td className="border px-4 py-2">{transaction.amount.toFixed(2)} NOK</td>
    </tr>
  ))}


              </tbody>
            </table>
          </div>
        ))}
      </div>
    )}

    {/* Your Receipts Section */}
    <div className="mt-8">
      <h2 className="text-xl font-semibold text-white mb-4">Your Receipts</h2>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search receipts by store name"
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full px-3 py-2 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filteredReceipts.length === 0 ? (
        <p className="text-white">No receipts found.</p>
      ) : (
        <ul className="space-y-4">
          {filteredReceipts.map((receipt) => (
            <li key={receipt.id} className="bg-white bg-opacity-10 p-4 rounded-lg">
              <p className="text-lg font-semibold text-white">{receipt.storeName}</p>
              <p className="text-sm text-gray-300">Date: {new Date(receipt.date).toLocaleDateString()}</p>
              <p className="text-sm text-gray-300">Total: {receipt.totalAmount.toFixed(2)} NOK</p>
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
