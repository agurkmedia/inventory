import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js'; // Import remains the same
import os from 'os';
import pdf2img from 'pdf-img-convert';
import { cpus } from 'os';

export const config = {
  api: {
    bodyParser: false, // Disables built-in body parser for file uploads
  },
};

export default async function processPDF(req: NextApiRequest, res: NextApiResponse) {
  console.log('Received request:', req.method);

  if (req.method === 'POST') {
    try {
      console.log('Parsing form data...');
      const { fields, files } = await parseForm(req);
      console.log('Form data parsed.');

      console.log('Fields:', fields);
      console.log('Files:', files);

      const filesArray = Array.isArray(files.file) ? files.file : [files.file];

      // Extract method as string
      const methodField = fields.method;
      const method = Array.isArray(methodField) ? methodField[0] : methodField;

      console.log('Processing method:', method);
      console.log('Number of files:', filesArray.length);

      let allParsedTransactions: ParsedTransaction[] = [];

      for (const file of filesArray) {
        console.log(`Processing file: ${file.originalFilename}`);
        const filePath = file.filepath;
        const dataBuffer = fs.readFileSync(filePath);

        let extractedText = '';

        if (method === 'pdf') {
          console.log('Using pdf-parse to extract text.');
          const data = await pdfParse(dataBuffer);
          extractedText = data.text;
        } else if (method === 'ocr') {
          console.log('Using Tesseract.js for OCR.');

          // Convert PDF pages to images using pdf-img-convert
          console.log('Converting PDF to images...');
          const images = await pdf2img.convert(dataBuffer);
          console.log(`Converted PDF to ${images.length} images.`);

          // Determine the number of workers to use
          const numCPUs = cpus().length;
          const maxWorkers = Math.min(numCPUs, images.length); // Adjust as needed
          console.log(`Using ${maxWorkers} workers for OCR processing.`);

          // Create an array of workers
          const workers = [];
          for (let i = 0; i < maxWorkers; i++) {
            const worker = createWorker(); // Changed worker creation
            await worker.load();
            await worker.loadLanguage('nor');
            await worker.initialize('nor');
            workers.push(worker);
          }

          // Function to process a single image with a worker
          const processImageWithWorker = async (imageBuffer: Buffer, workerIndex: number) => {
            const worker = workers[workerIndex];
            const { data: { text } } = await worker.recognize(imageBuffer);
            return text;
          };

          // Process images in parallel
          const ocrPromises = images.map((imageBuffer, index) => {
            // Assign a worker based on index
            const workerIndex = index % maxWorkers;
            return processImageWithWorker(imageBuffer, workerIndex);
          });

          // Collect the OCR results
          const ocrResults = await Promise.all(ocrPromises);

          // Combine the extracted text
          extractedText = ocrResults.join('\n');

          // Terminate the workers
          for (const worker of workers) {
            await worker.terminate();
          }
        } else {
          throw new Error('Invalid method specified.');
        }

        console.log('Extracted Text:', extractedText.substring(0, 500)); // Log first 500 characters

        // Parse the extracted text to extract transactions
        const parsedTransactions = parseText(extractedText);
        console.log('Parsed Transactions:', parsedTransactions);

        allParsedTransactions = allParsedTransactions.concat(parsedTransactions);

        // Delete the temporary file
        fs.unlinkSync(filePath);
        console.log(`Deleted temporary file: ${filePath}`);
      }

      console.log('All files processed. Sending response...');
      return res.status(200).json({ transactions: allParsedTransactions });
    } catch (error) {
      console.error('Error processing PDF:', error);
      return res.status(500).json({ error: 'Error processing PDF' });
    }
  } else {
    console.log('Invalid request method. Only POST is allowed.');
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
