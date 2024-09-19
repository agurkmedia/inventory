import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import os from 'os';

export const config = {
  api: {
    bodyParser: false, // Disables built-in body parser for file uploads
  },
};

export default async function processPDF(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { fields, files } = await parseForm(req);

      const filesArray = Array.isArray(files.file) ? files.file : [files.file];
      const method = fields.method as string;

      let allParsedTransactions: ParsedTransaction[] = [];

      for (const file of filesArray) {
        const filePath = file.filepath;
        const dataBuffer = fs.readFileSync(filePath);

        let extractedText = '';

        if (method === 'pdf') {
          // Use pdf-parse to extract text
          const data = await pdfParse(dataBuffer);
          extractedText = data.text;
        } else if (method === 'ocr') {
          // Use Tesseract.js for OCR
          const { data: { text } } = await Tesseract.recognize(dataBuffer, 'nor', {
            logger: (m) => console.log(m),
          });
          extractedText = text;
        }

        // Parse the extracted text to extract transactions
        const parsedTransactions = parseText(extractedText);
        allParsedTransactions = allParsedTransactions.concat(parsedTransactions);

        // Delete the temporary file
        fs.unlinkSync(filePath);
      }

      return res.status(200).json({ transactions: allParsedTransactions });
    } catch (error) {
      console.error('Error processing PDF:', error);
      return res.status(500).json({ error: 'Error processing PDF' });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}

// Helper function to parse the form data using formidable
function parseForm(req: NextApiRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      uploadDir: os.tmpdir(),
      keepExtensions: true,
      multiples: true, // Allow multiple file uploads
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('Error parsing form data:', err);
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });
}

// Define the ParsedTransaction interface
interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
}

// Function to parse the extracted text
function parseText(text: string): ParsedTransaction[] {
  const lines = text.split('\n');
  const transactions: ParsedTransaction[] = [];

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
      const amount =
        (parseFloat(inAmount.replace(',', '.')) || 0) -
        (parseFloat(outAmount.replace(',', '.')) || 0);

      transactions.push({
        date,
        description,
        amount,
      });
    } else {
      i++;
    }
  }
  return transactions;
}
