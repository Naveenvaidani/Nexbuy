const mongoose = require('mongoose');
const Product = require('../models/Product');

async function checkProducts() {
    try {
        await mongoose.connect('mongodb://localhost:27017/nexbuy');
        console.log('Connected to MongoDB');

        const count = await Product.countDocuments();
        console.log(`\nTotal products: ${count}`);

        // Check products by category
        const categories = await Product.distinct('category');
        console.log(`\nCategories: ${categories.length}`);
        
        for (const cat of categories) {
            const catCount = await Product.countDocuments({ category: cat });
            console.log(`  ${cat}: ${catCount} products`);
        }

        // Sample products to verify images
        const sample = await Product.find().limit(10).select('title imageThumb imageLarge category');
        console.log('\nSample products with images:');
        sample.forEach((p, i) => {
            console.log(`${i+1}. [${p.category}] ${p.title}`);
            console.log(`   imageThumb: ${p.imageThumb}`);
            console.log(`   imageLarge: ${p.imageLarge}`);
        });

        // Check for picsum URLs (old format)
        const picsumCount = await Product.countDocuments({ imageThumb: /picsum\.photos/i });
        console.log(`\nProducts with picsum URLs: ${picsumCount}`);

        // Check for local images
        const localCount = await Product.countDocuments({ imageThumb: /^\/images\/products\//i });
        console.log(`Products with local images: ${localCount}`);

        // Check for Unsplash images
        const unsplashCount = await Product.countDocuments({ imageThumb: /unsplash\.com/i });
        console.log(`Products with Unsplash images: ${unsplashCount}`);

        await mongoose.connection.close();
        console.log('\nDatabase connection closed');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkProducts();
