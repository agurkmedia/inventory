import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { url, itemCount } = await req.json();
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const items = [];

    $('.item').each((index, element) => {
      if (index >= itemCount) return false; // Limit the number of items
      const name = $(element).find('.item-name').text().trim();
      const description = $(element).find('.item-description').text().trim();
      const quantity = parseInt($(element).find('.item-quantity').text().trim(), 10);
      const imageUrl = $(element).find('.item-image').attr('src');
      const productCode = $(element).find('.item-product-code').text().trim();
      const price = parseFloat($(element).find('.item-price').text().replace(',-', '').trim());
      const weight = parseFloat($(element).find('.item-weight').text().replace('kg', '').trim());
      const availability = $(element).find('.item-availability').text().trim();
      const manufacturer = $(element).find('.item-manufacturer').text().trim();
      const attenuation = $(element).find('.item-attenuation').text().trim();
      const flocculation = $(element).find('.item-flocculation').text().trim();
      const usageDirections = $(element).find('.item-usage-directions').text().trim();
      const storageRecommendations = $(element).find('.item-storage-recommendations').text().trim();
      const desinfisering = $(element).find('.item-desinfisering').text().trim();
      const contactTime = $(element).find('.item-contact-time').text().trim();
      const sourceUrl = url;

      items.push({ name, description, quantity, imageUrl, productCode, price, weight, availability, manufacturer, attenuation, flocculation, usageDirections, storageRecommendations, desinfisering, contactTime, sourceUrl });
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error scraping items:', error);
    return NextResponse.json({ error: 'Failed to scrape items' }, { status: 500 });
  }
}