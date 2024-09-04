import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { url, itemCount } = await req.json();
    console.log(`Scraping URL: ${url} for ${itemCount} items`);

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

    const items = [];
    for (const itemUrl of itemLinks) {
      try {
        console.log(`Fetching details for item URL: ${itemUrl}`);
        const itemResponse = await fetch(itemUrl);
        const itemData = await itemResponse.text();
        const $ = cheerio.load(itemData);

        const name = $('h1.item-name').text().trim();
        const description = $('div.item-description').text().trim();
        const quantity = parseInt($('span.item-quantity').text().trim(), 10);
        const imageUrl = $('img.item-image').attr('src');
        const productCode = $('span.item-product-code').text().trim();
        const price = parseFloat($('span.item-price').text().replace(',-', '').trim());
        const weight = parseFloat($('span.item-weight').text().replace('kg', '').trim());
        const availability = $('span.item-availability').text().trim();
        const manufacturer = $('span.item-manufacturer').text().trim();
        const attenuation = $('span.item-attenuation').text().trim();
        const flocculation = $('span.item-flocculation').text().trim();
        const usageDirections = $('span.item-usage-directions').text().trim();
        const storageRecommendations = $('span.item-storage-recommendations').text().trim();
        const desinfisering = $('span.item-desinfisering').text().trim();
        const contactTime = $('span.item-contact-time').text().trim();
        const sourceUrl = itemUrl;

        const item = {
          name,
          description,
          quantity,
          imageUrl,
          productCode,
          price,
          weight,
          availability,
          manufacturer,
          attenuation,
          flocculation,
          usageDirections,
          storageRecommendations,
          desinfisering,
          contactTime,
          sourceUrl,
        };

        console.log(`Scraped item: ${name}`);
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