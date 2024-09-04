import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { url, itemCount } = await req.json();
    console.log(`Scraping URL: ${url} for ${itemCount} items`);

    const response = await fetch(url);
    const data = await response.text();
    console.log('Fetched HTML content:', data.substring(0, 500)); // Log the first 500 characters of the HTML content

    const $ = cheerio.load(data);

    const itemLinks = [];
    $('.ProductListCellsContainer .AddProductImage a').each((index, element) => {
      if (index >= itemCount) return false; // Limit the number of items
      const itemUrl = $(element).attr('href');
      if (itemUrl) {
        itemLinks.push(`https://www.olbrygging.no${itemUrl}`);
      }
    });

    console.log(`Total item links found: ${itemLinks.length}`);

    const items = [];
    for (const itemUrl of itemLinks) {
      const itemRes = await fetch('/api/scrape/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: itemUrl }),
      });
      if (!itemRes.ok) {
        console.error(`Failed to fetch item details for URL: ${itemUrl}`);
        continue;
      }
      const item = await itemRes.json();
      items.push(item);
    }

    console.log(`Total items scraped: ${items.length}`);
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error scraping item links:', error);
    return NextResponse.json({ error: 'Failed to scrape item links' }, { status: 500 });
  }
}