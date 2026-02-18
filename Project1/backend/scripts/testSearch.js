require('dotenv').config();
const mongoose = require('mongoose');
const chatbotService = require('../services/chatbotService');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nexbuy');
  console.log('Testing searchProductsForContext...\n');
  
  const results = await chatbotService.searchProductsForContext('iPhone', 10);
  console.log('Search results:', results.length);
  
  if (results.length > 0) {
    results.forEach((p, i) => {
      console.log(`${i + 1}. ${p.title} - ₹${p.priceINR} (SKU: ${p.sku})`);
    });
  } else {
    console.log('No results found');
  }
  
  process.exit(0);
})();
