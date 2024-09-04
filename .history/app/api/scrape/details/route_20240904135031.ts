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
      const name = $('h1').text().trim();
      const description = $('div.product-description').text().trim();
      const priceText = $('span.price').text().trim();
      const price = parseFloat(priceText.replace('kr', '').trim());
      const availability = $('span.availability').text().trim();
      const weightText = $('span.weight').text().trim();
      const weight = parseFloat(weightText.replace('Vekt', '').replace('kg', '').trim());
      const manufacturer = $('span.manufacturer').text().trim();
      const imageUrl = $('img.product-image').attr('src');

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