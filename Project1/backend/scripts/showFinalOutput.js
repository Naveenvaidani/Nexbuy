const mongoose = require('mongoose');
const Product = require('../models/Product');

async function showProducts() {
  try {
    await mongoose.connect('mongodb://localhost:27017/nexbuy');
    console.log('\n' + '='.repeat(80));
    console.log('📦 NEXBUY - FINAL PRODUCT DATABASE OUTPUT');
    console.log('='.repeat(80) + '\n');

    // Get total counts
    const total = await Product.countDocuments({});
    console.log(`✅ Total Products in Database: ${total}\n`);

    // Get count by category
    const categories = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('📊 Products by Category:');
    console.log('-'.repeat(80));
    categories.forEach(cat => {
      console.log(`   ${cat._id.padEnd(25)}: ${cat.count.toString().padStart(4)} products`);
    });

    // Get count by provider
    const providers = await Product.aggregate([
      { $unwind: '$providers' },
      { $group: { _id: '$providers.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n🏪 Products by Provider:');
    console.log('-'.repeat(80));
    providers.forEach(prov => {
      console.log(`   ${prov._id.padEnd(25)}: ${prov.count.toString().padStart(4)} products`);
    });

    // Get sample products from each provider
    console.log('\n📱 Sample Products from Each Provider:');
    console.log('='.repeat(80));
    
    const providerNames = ['amazon', 'flipkart'];
    for (const provName of providerNames) {
      console.log(`\n🔹 ${provName.toUpperCase()} - Top 5 Products:`);
      console.log('-'.repeat(80));
      
      const products = await Product.find({ 'providers.name': provName })
        .limit(5)
        .lean();
      
      products.forEach((prod, idx) => {
        const provEntry = prod.providers.find(p => p.name === provName);
        console.log(`\n${idx + 1}. ${prod.title}`);
        console.log(`   Brand: ${prod.brand} | Category: ${prod.category}`);
        console.log(`   Price: ₹${provEntry.price.current.toLocaleString()} | Rating: ${provEntry.rating}⭐`);
        console.log(`   SKU: ${prod.sku}`);
      });
    }

    // Price statistics
    const priceStats = await Product.aggregate([
      { $unwind: '$providers' },
      {
        $group: {
          _id: null,
          avgPrice: { $avg: '$providers.price.current' },
          minPrice: { $min: '$providers.price.current' },
          maxPrice: { $max: '$providers.price.current' }
        }
      }
    ]);

    if (priceStats.length > 0) {
      console.log('\n\n💰 Price Statistics:');
      console.log('='.repeat(80));
      console.log(`   Average Price: ₹${priceStats[0].avgPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
      console.log(`   Lowest Price:  ₹${priceStats[0].minPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
      console.log(`   Highest Price: ₹${priceStats[0].maxPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
    }

    // Top rated products
    console.log('\n\n⭐ Top 10 Highest Rated Products:');
    console.log('='.repeat(80));
    
    const topRated = await Product.aggregate([
      { $unwind: '$providers' },
      { $sort: { 'providers.rating': -1 } },
      { $limit: 10 },
      {
        $project: {
          title: 1,
          brand: 1,
          category: 1,
          rating: '$providers.rating',
          price: '$providers.price.current',
          provider: '$providers.name'
        }
      }
    ]);

    topRated.forEach((prod, idx) => {
      console.log(`${(idx + 1).toString().padStart(2)}. ${prod.title.substring(0, 50).padEnd(50)} | ${prod.rating}⭐ | ₹${prod.price.toLocaleString()}`);
    });

    // Recent products
    console.log('\n\n🆕 Recently Added Products (Last 10):');
    console.log('='.repeat(80));
    
    const recent = await Product.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    recent.forEach((prod, idx) => {
      const provEntry = prod.providers[0];
      console.log(`${(idx + 1).toString().padStart(2)}. ${prod.title.substring(0, 45).padEnd(45)} | ${prod.brand.padEnd(15)} | ₹${provEntry.price.current.toLocaleString()}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ FINAL DATABASE OUTPUT COMPLETE');
    console.log('='.repeat(80) + '\n');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

showProducts();
