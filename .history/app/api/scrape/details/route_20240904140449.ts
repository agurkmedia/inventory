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
      take: 1, // Only take one item for debugging
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
      const description = $('div.prod-text-content').text().trim();
      const priceText = $('span.d4-price').text().trim();
      const price = parseFloat(priceText.replace('kr', '').trim());
      const availability = $('span.stock').text().trim();
      const weightText = description.match(/Vekt\s(\d+)\s?kg/i);
      const weight = weightText ? parseFloat(weightText[1]) : NaN;
      const manufacturer = $('span.d4-instant-search-preview-header2').text().trim();
      const imageUrl = $('img.rsImg').attr('src');

      // Log the extracted details
      console.log({
        name,
        description,
        price,
        availability,
        weight,
        manufacturer,
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