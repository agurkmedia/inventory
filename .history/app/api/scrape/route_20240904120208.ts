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
  return NextResponse.json(itemLinks.slice(0, itemCount));
}

function extractItemLinks(html) {
  const $ = cheerio.load(html);
  const links = [];

  // Extract links within the ProdListContainer div
  $('div.ProdListContainer a[href]').each((index, element) => {
    const link = $(element).attr('href');
    if (link && link.startsWith('/')) {
      links.push(`https://www.olbrygging.no${link}`);
    }
  });

  // Log the extracted links to debug
  console.log('Extracted links:', links);

  return links;
}