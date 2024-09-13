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

  const ensureItemInInventory = async (description: string, inventoryId: string) => {
    try {
      const res = await fetch(`/api/items?description=${encodeURIComponent(description)}&inventoryId=${inventoryId}`);
      if (res.ok) {
        const existingItem = await res.json();
        if (existingItem.length > 0) {
          return existingItem[0];
        }
      }
      const newItemRes = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: description,
          inventoryId,
          price: 0,
          quantity: 1,
        }),
      });

      if (!newItemRes.ok) throw new Error('Failed to create item');
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

      const itemDescription = group.transactions[0].description;
      const item = await ensureItemInInventory(itemDescription, receiptsInventoryId);

      for (const transaction of group.transactions) {
        const receipt = await createReceiptForTransaction(transaction, categoryId, groupKey);

        await createReceiptItem(receipt.id, item.id, Math.abs(transaction.amount), categoryId);
      }

      const updatedGroupedTransactions = { ...groupedTransactions };
      delete updatedGroupedTransactions[groupKey];
      setGroupedTransactions(updatedGroupedTransactions);

      fetchReceipts();
      setError(`Grouping "${groupKey}" saved successfully as receipts.`);
    } catch (err) {
      console.error('Failed to save grouping:', err);
      setError(`Failed to save grouping "${groupKey}" as receipts. Please try again. ${err.message}`);
    }
  };

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

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Your UI components remain unchanged */}
    </div>
  );
}
