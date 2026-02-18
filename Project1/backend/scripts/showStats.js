const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

async function showStats() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nexbuy');
    
    console.log('\n========================================');
    console.log('  NexBuy Database Statistics');
    console.log('========================================\n');
    
    const totalProducts = await Product.countDocuments();
    console.log(`✓ Total Products: ${totalProducts}\n`);
    
    // Category distribution
    console.log('Products by Category:');
    const categories = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    categories.forEach(cat => {
      console.log(`  ${cat._id}: ${cat.count}`);
    });
    
    // Provider distribution
    console.log('\nProvider Distribution:');
    const providers = await Product.aggregate([
      { $unwind: '$providers' },
      { $group: { _id: '$providers.name', count: { $sum: 1 } } }
    ]);
    providers.forEach(prov => {
      const percent = ((prov.count / totalProducts) * 100).toFixed(1);
      console.log(`  ${prov._id}: ${prov.count} (${percent}%)`);
    });
    
    // Price stats
    console.log('\nPrice Statistics:');
    const priceStats = await Product.aggregate([
      { $unwind: '$providers' },
      { $group: { 
        _id: null, 
        avgPrice: { $avg: '$providers.price.current' },
        minPrice: { $min: '$providers.price.current' },
        maxPrice: { $max: '$providers.price.current' }
      }}
    ]);
    if (priceStats[0]) {
      console.log(`  Average: ₹${Math.round(priceStats[0].avgPrice).toLocaleString('en-IN')}`);
      console.log(`  Min: ₹${Math.round(priceStats[0].minPrice).toLocaleString('en-IN')}`);
      console.log(`  Max: ₹${Math.round(priceStats[0].maxPrice).toLocaleString('en-IN')}`);
    }
    
    // Rating stats
    console.log('\nRating Statistics:');
    const ratingStats = await Product.aggregate([
      { $unwind: '$providers' },
      { $group: { 
        _id: null, 
        avgRating: { $avg: '$providers.rating' },
        avgReviews: { $avg: '$providers.reviewCount' }
      }}
    ]);
    if (ratingStats[0]) {
      console.log(`  Average Rating: ${ratingStats[0].avgRating.toFixed(2)} ⭐`);
      console.log(`  Average Reviews: ${Math.round(ratingStats[0].avgReviews).toLocaleString('en-IN')}`);
    }
    
    // Rating distribution
    console.log('\nRating Distribution:');
    const ratingDist = await Product.aggregate([
      { $unwind: '$providers' },
      { $bucket: {
        groupBy: '$providers.rating',
        boundaries: [0, 1, 2, 3, 4, 5, 6],
        default: 'Other',
        output: { count: { $sum: 1 } }
      }}
    ]);
    ratingDist.forEach(bucket => {
      const range = bucket._id === 'Other' ? 'Other' : `${bucket._id}-${bucket._id + 1}`;
      const percent = ((bucket.count / totalProducts) * 100).toFixed(1);
      console.log(`  ${range} ⭐: ${bucket.count} (${percent}%)`);
    });
    
    // Stock status
    const stockStats = await Product.aggregate([
      { $unwind: '$providers' },
      { $group: {
        _id: '$providers.availability',
        count: { $sum: 1 }
      }}
    ]);
    console.log('\nStock Status:');
    stockStats.forEach(stock => {
      const percent = ((stock.count / totalProducts) * 100).toFixed(1);
      const label = stock._id === 'in_stock' ? 'In Stock' : 
                    stock._id === 'out_of_stock' ? 'Out of Stock' : 
                    stock._id;
      console.log(`  ${label}: ${stock.count} (${percent}%)`);
    });
    
    // Price range by category
    console.log('\nPrice Range by Category (Top 5):');
    const categoryPrices = await Product.aggregate([
      { $unwind: '$providers' },
      { $group: {
        _id: '$category',
        minPrice: { $min: '$providers.price.current' },
        maxPrice: { $max: '$providers.price.current' },
        avgPrice: { $avg: '$providers.price.current' }
      }},
      { $sort: { avgPrice: -1 } },
      { $limit: 5 }
    ]);
    categoryPrices.forEach(cat => {
      console.log(`  ${cat._id}:`);
      console.log(`    ₹${Math.round(cat.minPrice).toLocaleString('en-IN')} - ₹${Math.round(cat.maxPrice).toLocaleString('en-IN')} (avg: ₹${Math.round(cat.avgPrice).toLocaleString('en-IN')})`);
    });
    
    // Sample products
    console.log('\nSample Products (Random 10):');
    const samples = await Product.aggregate([{ $sample: { size: 10 } }]);
    samples.forEach((p, i) => {
      const provider = p.providers && p.providers[0];
      console.log(`\n  ${i+1}. ${p.title}`);
      console.log(`     Category: ${p.category} | Brand: ${p.brand}`);
      if (provider) {
        console.log(`     Price: ₹${provider.price.current.toLocaleString('en-IN')} (was ₹${provider.price.original.toLocaleString('en-IN')})`);
        console.log(`     Rating: ${provider.rating} ⭐ (${provider.reviewCount.toLocaleString('en-IN')} reviews)`);
        console.log(`     Provider: ${provider.name} | Stock: ${provider.availability}`);
      }
    });
    
    console.log('\n========================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

showStats();
