const mongoose = require('mongoose');
const Product = require('../models/Product');

async function checkProductStructure() {
    try {
        await mongoose.connect('mongodb://localhost:27017/nexbuy');
        console.log('Connected to MongoDB\n');

        // Get one full product document
        const product = await Product.findOne().lean();
        
        console.log('Full product structure:');
        console.log(JSON.stringify(product, null, 2));

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkProductStructure();
