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

      items.push({ name, description, quantity, imageUrl });
    });

    for (const item of items) {
      const imageBuffer = await axios.get(item.imageUrl, { responseType: 'arraybuffer' }).then(res => Buffer.from(res.data, 'binary'));

      await prisma.item.create({
        data: {
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          image: imageBuffer,
          inventoryId: 'your-inventory-id', // Replace with the actual inventory ID
        },
      });
    }

    console.log('Items scraped and inserted into the database successfully.');
  } catch (error) {
    console.error('Error scraping items:', error);
  }
}

scrapeItems();