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

export default function ImportPDF() {
  const [file, setFile] = useState<File | null>(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const extractTextFromPDF = async (file: File) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = async () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const loadingTask = getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let extractedText = '';
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        extractedText += strings.join(' ') + '\n';
      }
      setText(extractedText);
      parseText(extractedText);
    };
  };

  const extractTextUsingOCR = async (file: File) => {
    setLoading(true);
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = async () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const loadingTask = getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      let extractedText = '';
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context!,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        const dataURL = canvas.toDataURL('image/png');

        const { data } = await Tesseract.recognize(dataURL, 'nor', { // Set Norwegian language
          logger: (m) => console.log(m),
        });

        extractedText += data.text + '\n';
      }
      setText(extractedText);
      parseText(extractedText);
      setLoading(false);
    };
  };

  const parseText = (text: string) => {
    const lines = text.split('\n');
    const transactions: Transaction[] = [];

    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      const dateMatch = line.match(/^\d{2}\.\d{2}(?:\.\d{2,4})?/); // Matches dates like 29.08 or 29.08.14
      if (dateMatch) {
        let date = dateMatch[0];
        let description = line.substring(date.length).trim();
        i++;
        while (
          i < lines.length &&
          !lines[i].trim().match(/^\d{2}\.\d{2}(?:\.\d{2,4})?/) &&
          !lines[i].trim().match(/^\d+,\d{2}$/)
        ) {
          description += ' ' + lines[i].trim();
          i++;
        }
        let outAmount = '';
        let inAmount = '';
        if (i < lines.length) {
          const amountLine = lines[i].trim();
          const amounts = amountLine.match(/(\d+,\d{2})/g);
          if (amounts) {
            if (amounts.length === 1) {
              outAmount = amounts[0];
            } else if (amounts.length >= 2) {
              outAmount = amounts[0];
              inAmount = amounts[1];
            }
            i++;
          }
        }
        transactions.push({
          date,
          description,
          out: outAmount,
          in: inAmount,
        });
      } else {
        i++;
      }
    }

    setTransactions(transactions);

    const parsed: ParsedTransaction[] = transactions.map((t) => ({
      date: t.date,
      description: t.description,
      amount:
        (parseFloat(t.in.replace(',', '.')) || 0) - (parseFloat(t.out.replace(',', '.')) || 0),
    }));

    setParsedTransactions(parsed);
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;
    if (method === 'pdf') {
      extractTextFromPDF(file);
    } else if (method === 'ocr') {
      extractTextUsingOCR(file);
    }
  };

  useEffect(() => {
    fetchKeywordMappings();
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

        {showKeywordMappings && (
          <>
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
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-white">
                  {groupedTransactions[groupKey].description}
                </h3>
                <button
                  onClick={() => toggleGroupCollapse(groupKey)}
                  className="text-white hover:text-gray-300"
                >
                  {collapsedGroups[groupKey] ? 'Expand' : 'Collapse'}
                </button>
              </div>
              <p className="text-gray-300 mb-2">
                Total Amount: {groupedTransactions[groupKey].totalAmount.toFixed(2)} NOK
              </p>

              {!collapsedGroups[groupKey] && (
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
