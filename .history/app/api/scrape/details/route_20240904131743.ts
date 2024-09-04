import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';

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

      // Extract item details
      const name = $('h1.product-title').text().trim();
      const description = $('div.product-description').text().trim();
      const price = parseFloat($('span.product-price').text().trim().replace('$', ''));

      const updatedItem = await prisma.itemScraping.update({
        where: { id: item.id },
        data: {
          name,
          description,
          price,
          quantity: item.quantity, // Keep the existing quantity
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