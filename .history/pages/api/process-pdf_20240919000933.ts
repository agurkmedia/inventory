import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import os from 'os';
import pdf2img from 'pdf-img-convert';
./app/api/items/[id]/route.ts:52:7
Type error: Type 'Buffer' is not assignable to type 'null'.

  50 |     if (image) {
  51 |       const arrayBuffer = await image.arrayBuffer();
> 52 |       imageBuffer = Buffer.from(arrayBuffer);
     |       ^
  53 |     }
  54 |
  55 |     const updatedItem = await prisma.item.update({

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

          for (let i = 0; i < images.length; i++) {
            console.log(`Processing image ${i + 1} of ${images.length}`);
            const imageBuffer = images[i]; // imageBuffer is a Buffer containing the image data

            // Pass imageBuffer to Tesseract.js
            const { data: { text } } = await Tesseract.recognize(imageBuffer, 'nor', {
              logger: (m) => console.log('Tesseract:', m),
            });

            extractedText += text;
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
