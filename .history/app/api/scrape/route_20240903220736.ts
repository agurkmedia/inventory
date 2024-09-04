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
    $('a.item-link').each((index, element) => {
      if (index >= itemCount) return false; // Limit the number of items
      const itemUrl = $(element).attr('href');
      if (itemUrl) {
        itemLinks.push(itemUrl);
      }
    });

    console.log(`Total item links found: ${itemLinks.length}`);
    return NextResponse.json(itemLinks);
  } catch (error) {
    console.error('Error scraping item links:', error);
    return NextResponse.json({ error: 'Failed to scrape item links' }, { status: 500 });
  }
}