import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import axios from 'axios'; // Make sure to import axios

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    console.log(`Scraping item URL: ${url}`);

    if (typeof url !== 'string') {
      throw new Error(`Invalid URL: ${JSON.stringify(url)}`);
    }

    const response = await fetch(url);
    const data = await response.text();
    const $ = cheerio.load(data);

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
    const sourceUrl = url;

    // Fetch and convert image to base64
    let image = null;
    if (imageUrl) {
      try {
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data, 'binary');
        image = imageBuffer.toString('base64');
      } catch (error) {
        console.error('Error fetching image:', error);
      }
    }

    const item = {
      name,
      description,
      quantity,
      image,
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
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error scraping item:', error);
    return NextResponse.json({ error: 'Failed to scrape item' }, { status: 500 });
  }
}