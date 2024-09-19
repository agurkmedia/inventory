'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { v4 as uuidv4 } from 'uuid';

// Set the workerSrc property to use the correct version
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.3.122/pdf.worker.min.js`;

interface Transaction {
  date: string;
  description: string;
  out: string;
  in: string;
}

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
}

interface KeywordMapping {
  id: string;
  keyword: string;
  description: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  inventoryId: string;
}

export default function ImportPDF() {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState('');
  const [method, setMethod] = useState<'pdf' | 'ocr'>('ocr'); // Set OCR as default
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [groupedTransactions, setGroupedTransactions] = useState<any>({});
  const [keywordMappings, setKeywordMappings] = useState<KeywordMapping[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<{ [key: string]: boolean }>({});

  // State variables for managing keyword mappings
  const [newKeyword, setNewKeyword] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingMapping, setEditingMapping] = useState<KeywordMapping | null>(null);
  const [showKeywordMappings, setShowKeywordMappings] = useState(true);

  const [selectedCategories, setSelectedCategories] = useState<{ [key: string]: string }>({});
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [receiptsInventoryId, setReceiptsInventoryId] = useState<string | null>(null);
  const [processedGroups, setProcessedGroups] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (files.length === 0) return;
    setLoading(true);

    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`file${index}`, file);
    });
    formData.append('method', method);

    try {
      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process PDFs');
      }

      const result = await response.json();
      setParsedTransactions(result.parsedTransactions);
      const grouped = groupTransactionsByKeyword(result.parsedTransactions, keywordMap);
      setGroupedTransactions(grouped);
    } catch (error) {
      console.error('Error processing PDFs:', error);
      // Handle error (e.g., show error message to user)
    } finally {
      setLoading(false);
    }
  };

  // Create a keyword map from keywordMappings
  const keywordMap = useMemo(() => {
    return keywordMappings.reduce((acc, mapping) => {
      acc[mapping.keyword.toLowerCase()] = mapping.description;
      return acc;
    }, {} as { [key: string]: string });
  }, [keywordMappings]);

  // Update grouped transactions when parsedTransactions or keywordMap changes
  useEffect(() => {
    if (parsedTransactions.length > 0) {
      const grouped = groupTransactionsByKeyword(parsedTransactions, keywordMap);
      setGroupedTransactions(grouped);
    }
  }, [parsedTransactions, keywordMap]);

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

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
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
      console.error('Failed to add keyword mapping. Please try again.');
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
      console.error('Failed to update keyword mapping. Please try again.');
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
      console.error('Failed to delete keyword mapping. Please try again.');
    }
  };

  const toggleKeywordMappings = () => {
    setShowKeywordMappings(!showKeywordMappings);
  };

  useEffect(() => {
    fetchKeywordMappings();
    fetchExpenseCategories();
    ensureReceiptsInventory();
  }, []);

  const fetchKeywordMappings = async () => {
    try {
      const res = await fetch('/api/keyword-mappings');
      if (!res.ok) throw new Error('Failed to fetch keyword mappings');
      const data = await res.json();
      setKeywordMappings(data);
    } catch (err) {
      console.error('Failed to fetch keyword mappings:', err);
      console.error('Failed to load keyword mappings. Please try again.');
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
    }
  };

  const ensureReceiptsInventory = async () => {
    try {
      const res = await fetch('/api/inventories/receipts', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to ensure Receipts inventory');
      const data = await res.json();
      setReceiptsInventoryId(data.id);
    } catch (err) {
      console.error('Failed to ensure Receipts inventory:', err);
    }
  };

  const handleSaveGrouping = async (groupKey: string) => {
    try {
      const group = groupedTransactions[groupKey];
      const categoryId = selectedCategories[groupKey];
  
      if (!categoryId) {
        throw new Error('Please select a category before saving.');
      }
  
      if (!receiptsInventoryId) {
        throw new Error('Receipts inventory not found');
      }
  
      const descriptions = Array.from(new Set(group.transactions.map((t: ParsedTransaction) => t.description.trim())));
      const items = await fetchOrCreateItems(descriptions, receiptsInventoryId);
  
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
  
      console.log(`Grouping "${groupKey}": ${backendMessage}. Items added: ${itemsAdded}.`);
    } catch (err: any) {
      console.error('Failed to save grouping:', err);
      console.error(`Failed to save grouping "${groupKey}" as a receipt. ${err.message}`);
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

  // Sort grouped transactions by date
  const sortedGroupedTransactions = useMemo(() => {
    const sorted = Object.entries(groupedTransactions).sort(([, a], [, b]) => {
      const dateA = new Date(a.transactions[0].date);
      const dateB = new Date(b.transactions[0].date);
      return dateB.getTime() - dateA.getTime();
    });
    return Object.fromEntries(sorted);
  }, [groupedTransactions]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Import PDFs</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="mb-4">
          <label htmlFor="file" className="block text-sm font-medium text-gray-700">
            Select PDF files
          </label>
          <input
            type="file"
            id="file"
            accept=".pdf"
            onChange={handleFileChange}
            multiple
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
                value="ocr"
                checked={method === 'ocr'}
                onChange={() => setMethod('ocr')}
                className="form-radio"
              />
              <span className="ml-2">OCR Processing (Norwegian)</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="pdf"
                checked={method === 'pdf'}
                onChange={() => setMethod('pdf')}
                className="form-radio"
              />
              <span className="ml-2">PDF Parsing</span>
            </label>
          </div>
        </div>
        <button
          type="submit"
          disabled={!file || loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {loading ? 'Processing...' : 'Extract Text'}
        </button>
      </form>
      {loading && <p>Processing... This may take a while for OCR.</p>}

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

        <form onSubmit={editingMapping ? handleUpdateKeywordMapping : handleAddKeywordMapping} className="mb-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="Keyword"
              className="flex-1 p-2 rounded text-black bg-white"
              required
            />
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description"
              className="flex-1 p-2 rounded text-black bg-white"
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

        {showKeywordMappings && (
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
        )}
      </div>

      {/* Grouped Transactions Section */}
      {Object.keys(sortedGroupedTransactions).length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Grouped Transactions</h2>
          {Object.keys(sortedGroupedTransactions).map((groupKey) => (
            <div key={groupKey} className="bg-white bg-opacity-10 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-white">
                  {sortedGroupedTransactions[groupKey].description}
                </h3>
                <button
                  onClick={() => toggleGroupCollapse(groupKey)}
                  className="text-white hover:text-gray-300"
                >
                  {collapsedGroups[groupKey] ? 'Expand' : 'Collapse'}
                </button>
              </div>
              <p className="text-gray-300 mb-2">
                Total Amount: {sortedGroupedTransactions[groupKey].totalAmount.toFixed(2)} NOK
              </p>

              {!collapsedGroups[groupKey] && (
                <>
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
                      {sortedGroupedTransactions[groupKey].transactions.map(
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
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Parsed Transactions Section */}
      {parsedTransactions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-2">Parsed Transactions</h2>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-white">
                <th className="border border-gray-300 px-4 py-2 text-black">Date</th>
                <th className="border border-gray-300 px-4 py-2 text-black">Description</th>
                <th className="border border-gray-300 px-4 py-2 text-black">Amount</th>
              </tr>
            </thead>
            <tbody>
              {parsedTransactions.map((transaction, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-4 py-2 text-black bg-white">{transaction.date}</td>
                  <td className="border border-gray-300 px-4 py-2 text-black bg-white">{transaction.description}</td>
                  <td className="border border-gray-300 px-4 py-2 text-black bg-white">{transaction.amount.toFixed(2)} NOK</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {text && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-2">Extracted Text</h2>
          <pre className="whitespace-pre-wrap bg-white text-black p-4 rounded">{text}</pre>
        </div>
      )}
    </div>
  );
}
