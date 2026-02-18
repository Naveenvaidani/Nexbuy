const mongoose = require('mongoose');
const Product = require('../models/Product');
const providerFactory = require('../providers/ProviderFactory');
require('dotenv').config();

(async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexbuy';
    await mongoose.connect(uri);

    const products = await Product.find({ isActive: true })
      .sort({ viewCount: -1, purchaseCount: -1, createdAt: -1 })
      .limit(8);

    const amazon = providerFactory.getProvider('amazon');
    const normalized = products.map(p => amazon.normalizeProduct(p));

    console.log(JSON.stringify({ success: true, count: normalized.length, products: normalized }, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
