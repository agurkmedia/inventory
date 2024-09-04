import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { url, itemCount } = await req.json();
    console.log(`Scraping URL: ${url} for ${itemCount} items`);

    let items = [];
    let itemLinks = new Set();
    let pageID = 1;

    while (itemLinks.size < itemCount) {
      const pageUrl = `${url}?pageID=${pageID}`;
      console.log(`Fetching page: ${pageUrl}`);
      const response = await fetch(pageUrl);
      const data = await response.text();
      const $ = cheerio.load(data);

      const initialItemCount = itemLinks.size;

      $('.ProductListCellsContainer .AddProductImage a').each((index, element) => {
        const itemUrl = $(element).attr('href');
        if (itemUrl) {
          itemLinks.add(`https://www.olbrygging.no${itemUrl}`);
        }
      });

      if (itemLinks.size === initialItemCount) {
        console.log('No new items found, stopping pagination.');
        break;
      }

      if (itemLinks.size >= itemCount) {
        break;
      }

      pageID++;
    }

    console.log(`Total item links found: ${itemLinks.size}`);
    console.log('Item links:', Array.from(itemLinks)); // Log the item links

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    let successfulScrapes = 0;
    for (const itemUrl of itemLinks) {
      try {
        console.log(`Fetching details for item URL: ${itemUrl}`);
        const itemRes = await fetch(`${baseUrl}/api/scrape/item`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: itemUrl }),
        });
        if (!itemRes.ok) {
          throw new Error(`Failed to fetch item details for URL: ${itemUrl}`);
        }
        const item = await itemRes.json();
        items.push(item);
        successfulScrapes++;
      } catch (error) {
        console.error(`Error fetching item details for URL: ${itemUrl}`, error);
      }
    }

    console.log(`Total items scraped: ${successfulScrapes}`);
    return NextResponse.json({ items, totalScraped: successfulScrapes });
  } catch (error) {
    console.error('Error scraping item links:', error);
    return NextResponse.json({ error: 'Failed to scrape item links' }, { status: 500 });
  }
}