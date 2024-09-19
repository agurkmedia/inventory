'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function ImportPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [importMethod, setImportMethod] = useState<'pdf' | 'ocr'>('pdf');
  const { data: session } = useSession();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setMessage('Please select a file');
      return;
    }

    setUploading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('method', importMethod);

    try {
      const response = await fetch('/api/import-pdf', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message);
        setFile(null);
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setMessage('An error occurred while importing the PDF');
    } finally {
      setUploading(false);
    }
  };

  if (!session) {
    return <div>Please sign in to access this page.</div>;
  }

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
                checked={importMethod === 'pdf'}
                onChange={() => setImportMethod('pdf')}
                className="form-radio"
              />
              <span className="ml-2">PDF Parsing</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="ocr"
                checked={importMethod === 'ocr'}
                onChange={() => setImportMethod('ocr')}
                className="form-radio"
              />
              <span className="ml-2">OCR Processing</span>
            </label>
          </div>
        </div>
        <button
          type="submit"
          disabled={uploading || !file}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {uploading ? 'Importing...' : 'Import PDF'}
        </button>
      </form>
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  );
}