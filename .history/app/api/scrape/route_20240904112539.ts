import { NextResponse } from 'next/server';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export async function POST(req) {
  const { url, itemCount } = await req.json();
  const itemLinks = [];

  let page = 1;
  let newItemsFound = true;

  while (newItemsFound && itemLinks.length < itemCount) {
    const pageUrl = `${url}?pageID=${page}`;
    console.log(`Fetching page: ${pageUrl}`);
    const res = await fetch(pageUrl);
    const html = await res.text();

    // Extract item links from the HTML
    const newLinks = extractItemLinks(html);
    if (newLinks.length === 0) {
      newItemsFound = false;
    } else {
      itemLinks.push(...newLinks);
    }

    page++;
  }

  console.log(`Total item links found: ${itemLinks.length}`);

  // Fetch item details for each link
  const items = [];
  for (const itemUrl of itemLinks.slice(0, itemCount)) {
    console.log(`Scraping item URL: ${itemUrl}`);
    const itemRes = await fetch(itemUrl);
    const itemHtml = await itemRes.text();
    const itemDetails = extractItemDetails(itemHtml, itemUrl);
    items.push(itemDetails);
  }

  return NextResponse.json(items);
}

function extractItemLinks(html) {
  const $ = cheerio.load(html);
  const links = [];

  // Adjust the selector to match the structure of the website you are scraping
  $('a.item-link').each((index, element) => {
    const link = $(element).attr('href');
    if (link) {
      links.push(link);
    }
  });

  return links;
}

function extractItemDetails(html, url) {
  const $ = cheerio.load(html);
  // Adjust the selectors to match the structure of the item details page
  const name = $('h1.item-name').text().trim();
  const description = $('div.item-description').text().trim();
  const quantity = parseInt($('span.item-quantity').text().trim(), 10);
  const price = parseFloat($('span.item-price').text().trim().replace('$', ''));
  
  return {
    name,
    description,
    quantity,
    price,
    sourceUrl: url,
  };
}