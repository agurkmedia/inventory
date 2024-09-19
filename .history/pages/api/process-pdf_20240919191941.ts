import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import os from 'os';
import pdf2img from 'pdf-img-convert';
import { cpus } from 'os';
import path from 'path';

export const config = {
  api: {
    bodyParser: false, // Disable built-in body parser for file uploads
  },
};

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

export default async function processPDF(req: NextApiRequest, res: NextApiResponse) {
  console.log('Received request:', req.method);

  if (req.method !== 'POST') {
    console.log('Invalid request method. Only POST is allowed.');
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    console.log('Parsing form data...');
    const { fields, files } = await parseForm(req);
    console.log('Form data parsed.');
    console.log('Fields:', fields);
    console.log('Files:', files);

    const filesArray = Array.isArray(files.file) ? files.file : [files.file];
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
        try {
          const data = await pdfParse(dataBuffer);
          extractedText = data.text;
        } catch (error) {
          console.error('Error during pdf-parse:', error);
          throw new Error('Failed to parse PDF using pdf-parse.');
        }
      } else if (method === 'ocr') {
        console.log('Using Tesseract.js for OCR.');
        console.log('Converting PDF to images...');
        let images: Buffer[];
        try {
          images = await pdf2img.convert(dataBuffer);
          console.log(`Converted PDF to ${images.length} images.`);
        } catch (error) {
          console.error('Error converting PDF to images:', error);
          throw new Error('Failed to convert PDF to images.');
        }

        // Reduce the number of workers to prevent overloading the server
        const numCPUs = cpus().length;
        const maxWorkers = Math.min(2, images.length);
        console.log(`Using ${maxWorkers} workers for OCR processing.`);

        // Prepare Tesseract workers
        const workers = [];
        for (let i = 0; i < maxWorkers; i++) {
          try {
            const worker = await createWorker({
              logger: (m) => console.log(`Worker ${i}:`, m), // Set logger here
              langPath: path.resolve('./tessdata'), // Use local language data if available
            });
            await worker.loadLanguage('eng');
            await worker.initialize('eng');
            workers.push(worker);
            console.log(`Worker ${i} initialized.`);
          } catch (error) {
            console.error(`Error initializing worker ${i}:`, error);
            throw new Error(`Failed to initialize Tesseract worker ${i}.`);
          }
        }

        // Process images with workers
        const ocrPromises = images.map((imageBuffer, index) => {
          const workerIndex = index % maxWorkers;
          return processImageWithWorker(imageBuffer, workerIndex, workers);
        });

        try {
          const ocrResults = await Promise.all(ocrPromises);
          extractedText = ocrResults.join('\n');
          console.log('OCR processing completed.');
        } catch (error) {
          console.error('Error during OCR processing:', error);
          throw new Error('Failed during OCR processing.');
        } finally {
          // Terminate workers
          for (let i = 0; i < workers.length; i++) {
            try {
              await workers[i].terminate();
              console.log(`Worker ${i} terminated.`);
            } catch (error) {
              console.error(`Error terminating worker ${i}:`, error);
            }
          }
        }
      } else {
        throw new Error('Invalid method specified.');
      }

      console.log('Extracted Text:', extractedText.substring(0, 500)); // Log first 500 characters

      // Parse the extracted text to extract transactions
      let parsedTransactions: ParsedTransaction[];
      try {
        parsedTransactions = parseText(extractedText);
        console.log('Parsed Transactions:', parsedTransactions);
      } catch (error) {
        console.error('Error parsing text:', error);
        throw new Error('Failed to parse transactions from extracted text.');
      }

      allParsedTransactions = allParsedTransactions.concat(parsedTransactions);

      // Delete the temporary file
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted temporary file: ${filePath}`);
      } catch (error) {
        console.error('Error deleting temporary file:', error);
      }
    }

    console.log('All files processed. Sending response...');
    return res.status(200).json({ transactions: allParsedTransactions });
  } catch (error: any) {
    console.error('Error processing PDF:', error);
    return res.status(500).json({ error: `Error processing PDF: ${error.message}` });
  }
}

// Helper function to parse the form data using formidable
function parseForm(
  req: NextApiRequest
): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  return new Promise((resolve, reject) => {
    const uploadDir = path.join(process.cwd(), 'temp_uploads');

    // Ensure the directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir: uploadDir,
      keepExtensions: true,
      multiples: true, // Allow multiple file uploads
      maxFileSize: 50 * 1024 * 1024, // Set maximum file size to 50MB
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

// Function to process a single image with a worker
async function processImageWithWorker(
  imageBuffer: Buffer,
  workerIndex: number,
  workers: any[]
): Promise<string> {
  try {
    const worker = workers[workerIndex];
    console.log(`Worker ${workerIndex} started processing an image.`);
    // Remove logger from recognize options
    const {
      data: { text },
    } = await worker.recognize(imageBuffer);
    console.log(`Worker ${workerIndex} finished processing an image.`);
    return text;
  } catch (error) {
    console.error(`Error in worker ${workerIndex}:`, error);
    throw error;
  }
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