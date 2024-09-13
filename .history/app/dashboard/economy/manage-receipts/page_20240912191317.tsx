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
  const [showKeywordMappings, setShowKeywordMappings] = useState(true);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [selectedInventories, setSelectedInventories] = useState<{ [key: string]: string }>({});
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<{ [key: string]: string }>({});
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

  useEffect(() => {
    if (parsedTransactions.length > 0) {
      const keywordMap = keywordMappings.reduce((acc, mapping) => {
        acc[mapping.keyword] = mapping.description;
        return acc;
      }, {} as { [key: string]: string });
      const grouped = groupTransactionsByKeyword(parsedTransactions, keywordMap);
      setGroupedTransactions(grouped);
    }
  }, [keywordMappings, parsedTransactions]);

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
      const existingInventories = await fetch('/api/inventories').then(res => res.json());
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

  const toggleKeywordMappings = () => {
    setShowKeywordMappings(!showKeywordMappings);
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

  const handleSaveGrouping = async (groupKey: string) => {
    try {
      const group = groupedTransactions[groupKey];
      const categoryId = selectedCategories[groupKey];
  
      if (!categoryId) {
        throw new Error('Please select a category before saving.');
      }
  
      // Ensure we have a Receipts inventory
      if (!receiptsInventoryId) {
        await ensureReceiptsInventory(); // Ensure the inventory exists
      }
  
      // Ensure the item is in the inventory (if not, create it)
      const itemDescription = group.transactions[0].description; // Use the description from the first transaction
      const item = await ensureItemInInventory(itemDescription, receiptsInventoryId);
  
      // Proceed to create receipts for each transaction in the group
      for (const transaction of group.transactions) {
        // Create a receipt for each transaction
        const receipt = await createReceiptForTransaction(transaction, categoryId, groupKey);
  
        // Create a receipt item linked to the receipt and the item
        await createReceiptItem(receipt.id, item.id, Math.abs(transaction.amount), categoryId);
      }
  
      // Remove the saved grouping from the state/UI
      const updatedGroupedTransactions = { ...groupedTransactions };
      delete updatedGroupedTransactions[groupKey]; // Remove the saved group from the UI
      setGroupedTransactions(updatedGroupedTransactions);
  
      fetchReceipts(); // Refresh receipts list
      setError(`Grouping "${groupKey}" saved successfully as receipts.`);
    } catch (err) {
      console.error('Failed to save grouping:', err);
      setError(`Failed to save grouping "${groupKey}" as receipts. Please try again. ${err.message}`);
    }
  };
  

  const handleCategoryChange = async (groupKey: string, value: string) => {
    if (value === 'new') {
      const categoryName = prompt('Enter new category name:');
      if (categoryName) {
        try {
          const newCategory = await createExpenseCategory(categoryName);
          setSelectedCategories(prev => ({
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
      setSelectedCategories(prev => ({
        ...prev,
        [groupKey]: value,
      }));
    }
  };

  const handleInventoryChange = (transactionDescription: string, inventoryId: string) => {
    setSelectedInventories(prev => ({
      ...prev,
      [transactionDescription]: inventoryId || receiptsInventoryId,
    }));
  };

  const ensureItemInInventory = async (description: string, inventoryId: string) => {
    try {
      const res = await fetch(`/api/items?description=${encodeURIComponent(description)}&inventoryId=${inventoryId}`);
      
      // Check if the response is OK
      if (res.ok) {
        const existingItem = await res.json();
        
        // If the item exists, return it
        if (existingItem.length > 0) {
          return existingItem[0]; // Return the first matching item
        }
      }
  
      // If no item was found, we need to create a new one
      const newItemRes = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: description,
          inventoryId,
          price: 0, // Default price, adjust if necessary
          quantity: 1, // Default quantity is 1, adjust if necessary
        }),
      });
  
      // Ensure the item creation was successful
      if (!newItemRes.ok) throw new Error('Failed to create item');
      
      // Return the newly created item
      const newItem = await newItemRes.json();
      return newItem;
    } catch (err) {
      console.error('Error ensuring item in inventory:', err);
      throw err;
    }
  };
  

  const createReceiptForTransaction = async (transaction: ParsedTransaction, categoryId: string, storeName: string) => {
    try {
      const receiptData = {
        storeName,
        totalAmount: Math.abs(transaction.amount),
        date: new Date(transaction.date).toISOString(),
        categoryId,
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

      return await receiptRes.json();
    } catch (err) {
      console.error('Error creating receipt:', err);
      throw err;
    }
  };

  const createReceiptItem = async (receiptId: string, itemId: string, totalPrice: number, categoryId: string) => {
    try {
      const receiptItemData = {
        receiptId,
        itemId,
        quantity: 1,
        totalPrice,
        categoryId,
      };

      const receiptItemRes = await fetch('/api/receipt-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receiptItemData),
      });

      if (!receiptItemRes.ok) {
        const errorText = await receiptItemRes.text();
        throw new Error(`Failed to create receipt item: ${errorText}`);
      }

      return await receiptItemRes.json();
    } catch (err) {
      console.error('Error creating receipt item:', err);
      throw err;
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
          </>
        )}
      </div>

      {Object.keys(groupedTransactions).length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Grouped Transactions</h2>
          {Object.keys(groupedTransactions).map((groupKey) => (
            <div key={groupKey} className="bg-white bg-opacity-10 p-4 rounded-lg mb-4">
              <h3 className="text-lg font-bold text-white">{groupedTransactions[groupKey].description}</h3>
              <p className="text-gray-300 mb-2">Total Amount: ${groupedTransactions[groupKey].totalAmount.toFixed(2)}</p>

              <div className="mb-4 flex items-center justify-between">
                <div className="flex-grow mr-4">
                  <label htmlFor={`category-${groupKey}`} className="block text-sm font-medium text-gray-300">Expense Category</label>
                  <select
                    id={`category-${groupKey}`}
                    value={selectedCategories[groupKey] || ''}
                    onChange={(e) => handleCategoryChange(groupKey, e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-black bg-white"
                  >
                    <option value="">Select a category</option>
                    {expenseCategories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
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

              {selectedCategories[groupKey] === 'new' && (
                <div className="mb-4">
                  <label htmlFor={`new-category-${groupKey}`} className="block text-sm font-medium text-gray-300">New Category Name</label>
                  <input
                    type="text"
                    id={`new-category-${groupKey}`}
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black bg-white"
                  />
                </div>
              )}

              <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Description</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">Inventory</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedTransactions[groupKey].transactions.map((transaction: ParsedTransaction, index: number) => (
                    <tr key={index} className="text-white">
                      <td className="border px-4 py-2">{transaction.date}</td>
                      <td className="border px-4 py-2">{transaction.description}</td>
                      <td className="border px-4 py-2">${transaction.amount.toFixed(2)}</td>
                      <td className="border px-4 py-2">
                        <select
                          value={selectedInventories[transaction.description] || receiptsInventoryId || ''}
                          onChange={(e) => handleInventoryChange(transaction.description, e.target.value)}
                          className="bg-white text-black px-2 py-1 rounded w-full"
                        >
                          <option value="">Select Inventory</option>
                          {inventories.map((inventory) => (
                            <option key={inventory.id} value={inventory.id}>
                              {inventory.name}
                            </option>
                          ))}
                        </select>
                      </td>
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
