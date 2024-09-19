'use client';

import React, { useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Set the workerSrc property to use the correct version
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.3.122/pdf.worker.min.js`;

interface Transaction {
  date: string;
  description: string;
  out: string;
  in: string;
}

export default function ImportPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [method, setMethod] = useState<'pdf' | 'ocr'>('pdf');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

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

        const { data } = await Tesseract.recognize(dataURL, 'eng');

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
                value="pdf"
                checked={method === 'pdf'}
                onChange={() => setMethod('pdf')}
                className="form-radio"
              />
              <span className="ml-2">PDF Parsing</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="ocr"
                checked={method === 'ocr'}
                onChange={() => setMethod('ocr')}
                className="form-radio"
              />
              <span className="ml-2">OCR Processing</span>
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
      {loading && <p>Processing...</p>}
      {text && (
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">Extracted Text</h2>
          <pre className="whitespace-pre-wrap">{text}</pre>
        </div>
      )}
      {transactions.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-2">Extracted Transactions</h2>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">Date</th>
                <th className="border border-gray-300 px-4 py-2">Description</th>
                <th className="border border-gray-300 px-4 py-2">Ut av konto</th>
                <th className="border border-gray-300 px-4 py-2">Inn på konto</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-4 py-2">{transaction.date}</td>
                  <td className="border border-gray-300 px-4 py-2">{transaction.description}</td>
                  <td className="border border-gray-300 px-4 py-2">{transaction.out}</td>
                  <td className="border border-gray-300 px-4 py-2">{transaction.in}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
