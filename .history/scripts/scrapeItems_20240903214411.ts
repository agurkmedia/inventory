import axios from 'axios';
import cheerio from 'cheerio';
import prisma from '@/lib/prisma'; // Ensure this path is correct

async function scrapeItems() {
  try {
    const { data } = await axios.get('https://example.com/items'); // Replace with the actual URL
    const $ = cheerio.load(data);

    const items = [];

    $('.item').each((index, element) => {
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

      items.push({ name, description, quantity, imageUrl, productCode, price, weight, availability, manufacturer, attenuation, flocculation, usageDirections, storageRecommendations });
    });

    for (const item of items) {
      const imageBuffer = await axios.get(item.imageUrl, { responseType: 'arraybuffer' }).then(res => Buffer.from(res.data, 'binary'));

      await prisma.itemScraping.create({
        data: {
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          image: imageBuffer,
          inventoryId: 'your-inventory-id', // Replace with the actual inventory ID
          productCode: item.productCode,
          price: item.price,
          weight: item.weight,
          availability: item.availability,
          manufacturer: item.manufacturer,
          attenuation: item.attenuation,
          flocculation: item.flocculation,
          usageDirections: item.usageDirections,
          storageRecommendations: item.storageRecommendations,
        },
      });
    }

    console.log('Items scraped and inserted into the database successfully.');
  } catch (error) {
    console.error('Error scraping items:', error);
  }
}

scrapeItems();