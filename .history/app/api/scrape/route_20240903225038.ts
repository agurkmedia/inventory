import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { url, itemCount } = await req.json();
    console.log(`Scraping URL: ${url} for ${itemCount} items`);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    let items = [];
    let itemLinks = new Set();
    let pageID = 1;

    while (itemLinks.size < itemCount) {
      const content = await page.content();
      const $ = cheerio.load(content);

      $('.ProductListCellsContainer .AddProductImage a').each((index, element) => {
        const itemUrl = $(element).attr('href');
        if (itemUrl) {
          itemLinks.add(`https://www.olbrygging.no${itemUrl}`);
        }
      });

      if (itemLinks.size >= itemCount) {
        break;
      }

      pageID++;
      const nextPageUrl = `${url}?pageID=${pageID}`;
      console.log(`Navigating to next page: ${nextPageUrl}`);
      await page.goto(nextPageUrl, { waitUntil: 'networkidle2' });
      await page.waitFor(1000); // Wait for new items to load
    }

    await browser.close();

    console.log(`Total item links found: ${itemLinks.size}`);
    console.log('Item links:', Array.from(itemLinks)); // Log the item links

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
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
      } catch (error) {
        console.error(`Error fetching item details for URL: ${itemUrl}`, error);
      }
    }

    console.log(`Total items scraped: ${items.length}`);
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error scraping item links:', error);
    return NextResponse.json({ error: 'Failed to scrape item links' }, { status: 500 });
  }
}