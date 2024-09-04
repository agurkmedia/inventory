import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { inventoryId } = await req.json();
    const items = await prisma.itemScraping.findMany({
      where: { inventoryId },
    });

    const updatedItems = [];

    for (const item of items) {
      console.log(`Scraping item URL: ${item.sourceUrl}`);
      const response = await fetch(item.sourceUrl);
      const data = await response.text();
      const $ = cheerio.load(data);

      // Save the HTML content to a file
      const filePath = path.join(process.cwd(), 'scraped-content.html');
      fs.writeFileSync(filePath, $.html(), 'utf8');
      console.log(`HTML content saved to ${filePath}`);

      // Extract item details
      const name = $('h1').text().trim();
      const description = $('div.prod-text-content p')
        .map((i, el) => $(el).text().trim())
        .get()
        .join(' ');

      // Extract price, manufacturer, and productCode from dataLayer script
      const scriptContent = $('script').filter((i, el) => $(el).html().includes('dataLayer.push')).html();
      let price = NaN;
      let manufacturer = '';
      let productCode = '';
      if (scriptContent) {
        const priceMatch = scriptContent.match(/'RetailPrice':\s*'([\d.]+)'/);
        if (priceMatch) {
          price = parseFloat(priceMatch[1]);
        }
        const manufacturerMatch = scriptContent.match(/'Brand':\s*'([^']+)'/);
        if (manufacturerMatch) {
          manufacturer = manufacturerMatch[1];
        }
        const productCodeMatch = scriptContent.match(/'ProductID':\s*'([^']+)'/);
        if (productCodeMatch) {
          productCode = productCodeMatch[1];
        }
      }

      // Extract availability
      const availability = $('div.DynamicStockTooltipContainer span').first().text().trim();

      // Extract weight from the description
      const weightText = description.match(/Vekt\s(\d+)\s?kg/i);
      const weight = weightText ? parseFloat(weightText[1]) : NaN;

      // Extract image URL
      const imageUrl = $('img.d4-prod-thumb').attr('src');

      // Log the extracted details
      console.log({
        name,
        description,
        price,
        availability,
        weight,
        manufacturer,
        productCode,
        imageUrl,
      });

      const updatedItem = await prisma.itemScraping.update({
        where: { id: item.id },
        data: {
          name,
          description,
          price: isNaN(price) ? 0 : price,
          availability,
          weight: isNaN(weight) ? 0 : weight,
          manufacturer,
          productCode,
          image: imageUrl ? Buffer.from(imageUrl) : null, // Convert image URL to buffer
          quantity: item.quantity, // Keep the existing quantity
          sourceUrl: item.sourceUrl,
        },
      });

      updatedItems.push(updatedItem);
    }

    return NextResponse.json(updatedItems);
  } catch (error) {
    console.error('Error scraping item details:', error);
    return NextResponse.json({ error: 'Failed to scrape item details' }, { status: 500 });
  }
}