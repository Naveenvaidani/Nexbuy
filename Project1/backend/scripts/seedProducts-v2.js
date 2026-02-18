const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

// Helper functions
const randomPick = arr => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomInRange = (min, max) => Math.random() * (max - min) + min;

// Brands by category
const BRANDS = {
  Electronics: ['Samsung', 'Apple', 'OnePlus', 'Xiaomi', 'Sony', 'LG', 'Dell', 'HP', 'Lenovo', 'Asus', 'Realme', 'Oppo', 'Vivo'],
  Fashion: ['Nike', 'Adidas', 'Puma', 'Levis', 'Zara', 'H&M', 'Van Heusen', 'Allen Solly', 'Peter England', 'Raymond'],
  'Home & Kitchen': ['Prestige', 'Pigeon', 'Hawkins', 'Milton', 'Cello', 'Borosil', 'Wonderchef', 'Butterfly'],
  Books: ['Penguin', 'HarperCollins', 'Scholastic', 'Random House', 'Bloomsbury', 'Oxford', 'Pearson', 'Rupa'],
  Toys: ['Lego', 'Hasbro', 'Mattel', 'Funskool', 'Hot Wheels', 'Fisher-Price', 'Nerf', 'Barbie'],
  'Beauty & Personal Care': ['Lakme', 'Maybelline', 'LOreal', 'Nivea', 'Himalaya', 'Biotique', 'Neutrogena', 'Dove'],
  'Sports & Fitness': ['Nike', 'Adidas', 'Puma', 'Reebok', 'Decathlon', 'Nivia', 'Cosco', 'Yonex'],
  Groceries: ['Nestle', 'Amul', 'Britannia', 'Parle', 'ITC', 'Dabur', 'Patanjali', 'MDH', 'Everest'],
  Furniture: ['Urban Ladder', 'Pepperfry', 'Ikea', 'Godrej', 'Nilkamal', 'Durian', 'HomeTown'],
  Automotive: ['Bosch', '3M', 'Philips', 'Michelin', 'MRF', 'Castrol', 'Shell', 'Amaron']
};

// Product templates
const PRODUCT_TEMPLATES = {
  Electronics: [
    { type: 'Smartphone', price: [10000, 80000], variants: ['5G', 'Pro', 'Max', 'Ultra', 'Lite', 'Plus'] },
    { type: 'Laptop', price: [25000, 120000], variants: ['Gaming', 'Business', 'Ultrabook', 'Workstation'] },
    { type: 'Headphones', price: [500, 25000], variants: ['Wireless', 'Noise-Cancelling', 'True Wireless', 'Over-Ear'] },
    { type: 'Smart Watch', price: [2000, 50000], variants: ['Fitness', 'Sport', 'Premium', 'Classic'] },
    { type: 'TV', price: [15000, 150000], variants: ['4K', 'OLED', 'QLED', 'Smart', '8K'] },
    { type: 'Camera', price: [20000, 200000], variants: ['DSLR', 'Mirrorless', 'Point-and-Shoot', 'Action'] },
    { type: 'Tablet', price: [8000, 70000], variants: ['Wi-Fi', 'LTE', 'Pro', 'Kids'] }
  ],
  Fashion: [
    { type: 'T-Shirt', price: [300, 2000], variants: ['Cotton', 'Polo', 'V-Neck', 'Round Neck', 'Graphic'] },
    { type: 'Jeans', price: [800, 5000], variants: ['Slim Fit', 'Regular', 'Skinny', 'Bootcut'] },
    { type: 'Sneakers', price: [1000, 10000], variants: ['Running', 'Casual', 'Sports', 'Walking'] },
    { type: 'Shirt', price: [500, 3000], variants: ['Formal', 'Casual', 'Denim', 'Checkered'] },
    { type: 'Dress', price: [800, 5000], variants: ['Party', 'Casual', 'Formal', 'Maxi'] },
    { type: 'Jacket', price: [1500, 8000], variants: ['Leather', 'Denim', 'Bomber', 'Winter'] },
    { type: 'Watch', price: [500, 15000], variants: ['Analog', 'Digital', 'Chronograph', 'Smart'] }
  ],
  'Home & Kitchen': [
    { type: 'Pressure Cooker', price: [800, 5000], variants: ['3L', '5L', '7L', 'Stainless Steel'] },
    { type: 'Mixer Grinder', price: [1500, 8000], variants: ['500W', '750W', '1000W', '3 Jar'] },
    { type: 'Water Bottle', price: [200, 1500], variants: ['Insulated', 'Steel', 'Copper', '1L'] },
    { type: 'Dinner Set', price: [500, 5000], variants: ['24-Piece', '36-Piece', 'Bone China', 'Melamine'] },
    { type: 'Cookware Set', price: [1000, 10000], variants: ['Non-Stick', 'Stainless Steel', '7-Piece'] },
    { type: 'Vacuum Cleaner', price: [3000, 25000], variants: ['Handheld', 'Upright', 'Robot', 'Wet & Dry'] },
    { type: 'Air Fryer', price: [2500, 12000], variants: ['2L', '4L', 'Digital', 'Manual'] }
  ],
  Books: [
    { type: 'Fiction Novel', price: [150, 800], variants: ['Mystery', 'Romance', 'Thriller', 'Fantasy'] },
    { type: 'Self-Help Book', price: [200, 600], variants: ['Productivity', 'Motivation', 'Mindfulness'] },
    { type: 'Textbook', price: [300, 1500], variants: ['Mathematics', 'Science', 'History', 'English'] },
    { type: 'Cookbook', price: [250, 1000], variants: ['Indian', 'Baking', 'Healthy', 'Quick Meals'] },
    { type: 'Biography', price: [200, 900], variants: ['Political', 'Sports', 'Business', 'Celebrity'] },
    { type: 'Children Book', price: [100, 500], variants: ['Picture Book', 'Story Collection', 'Educational'] }
  ],
  Toys: [
    { type: 'Building Blocks', price: [500, 8000], variants: ['Classic', 'Technic', 'Duplo', '1000-Piece'] },
    { type: 'Remote Control Car', price: [800, 5000], variants: ['Racing', 'Monster Truck', 'Drift'] },
    { type: 'Doll', price: [300, 3000], variants: ['Fashion', 'Baby', 'Collectible'] },
    { type: 'Board Game', price: [400, 3000], variants: ['Strategy', 'Family', 'Card Game'] },
    { type: 'Action Figure', price: [500, 4000], variants: ['Superhero', 'Transformers', 'Collectible'] },
    { type: 'Educational Toy', price: [600, 3500], variants: ['STEM Kit', 'Puzzle', 'Learning Tablet'] }
  ],
  'Beauty & Personal Care': [
    { type: 'Lipstick', price: [200, 1500], variants: ['Matte', 'Glossy', 'Long-lasting', 'Nude'] },
    { type: 'Face Wash', price: [100, 800], variants: ['Acne Control', 'Oil Control', 'Gentle', 'Brightening'] },
    { type: 'Perfume', price: [500, 5000], variants: ['EDT', 'EDP', 'Floral', 'Woody'] },
    { type: 'Hair Oil', price: [150, 600], variants: ['Coconut', 'Almond', 'Herbal', 'Anti-Dandruff'] },
    { type: 'Body Lotion', price: [200, 1200], variants: ['Moisturizing', 'Whitening', 'Cocoa Butter'] },
    { type: 'Shampoo', price: [150, 800], variants: ['Anti-Dandruff', 'Smooth & Silky', 'Volume'] }
  ],
  'Sports & Fitness': [
    { type: 'Running Shoes', price: [1500, 12000], variants: ['Trail', 'Road', 'Marathon', 'Casual'] },
    { type: 'Yoga Mat', price: [400, 2500], variants: ['6mm', '8mm', 'Non-Slip', 'Eco-Friendly'] },
    { type: 'Dumbbells', price: [500, 5000], variants: ['5kg Set', '10kg Set', 'Adjustable', 'Rubber'] },
    { type: 'Cricket Bat', price: [800, 8000], variants: ['Kashmir Willow', 'English Willow', 'Junior'] },
    { type: 'Badminton Racket', price: [600, 6000], variants: ['Professional', 'Beginner', 'Carbon Fiber'] },
    { type: 'Gym Bag', price: [500, 3000], variants: ['Duffle', 'Backpack', 'Waterproof'] }
  ],
  Groceries: [
    { type: 'Rice', price: [200, 1500], variants: ['Basmati 5kg', 'Regular 10kg', 'Brown Rice'] },
    { type: 'Cooking Oil', price: [150, 800], variants: ['Sunflower 1L', 'Olive Oil', 'Mustard Oil'] },
    { type: 'Tea', price: [100, 500], variants: ['250g', '500g', 'Green Tea', 'Masala Chai'] },
    { type: 'Biscuits', price: [30, 300], variants: ['Cream', 'Digestive', 'Cookies', 'Family Pack'] },
    { type: 'Noodles', price: [50, 400], variants: ['Instant', 'Atta', 'Hakka', '12-Pack'] },
    { type: 'Spices', price: [50, 300], variants: ['Garam Masala', 'Turmeric', 'Red Chilli', 'Mix Pack'] }
  ],
  Furniture: [
    { type: 'Study Table', price: [3000, 15000], variants: ['Wooden', 'Engineered Wood', 'With Drawer'] },
    { type: 'Office Chair', price: [2000, 20000], variants: ['Ergonomic', 'Executive', 'Gaming', 'Mesh'] },
    { type: 'Bookshelf', price: [1500, 10000], variants: ['3-Tier', '5-Tier', 'Wall Mounted', 'Wooden'] },
    { type: 'Sofa', price: [10000, 80000], variants: ['3-Seater', 'L-Shape', 'Recliner', 'Fabric'] },
    { type: 'Bed', price: [8000, 50000], variants: ['Queen Size', 'King Size', 'Storage', 'Wooden'] },
    { type: 'Wardrobe', price: [7000, 40000], variants: ['2-Door', '3-Door', 'Sliding', 'Mirror'] }
  ],
  Automotive: [
    { type: 'Car Perfume', price: [100, 800], variants: ['Gel', 'Liquid', 'Long-lasting'] },
    { type: 'Car Cover', price: [500, 3000], variants: ['Waterproof', 'UV Protection', 'Custom Fit'] },
    { type: 'Engine Oil', price: [300, 2000], variants: ['5W-30', '10W-40', 'Synthetic', '1L'] },
    { type: 'Tyre', price: [2000, 15000], variants: ['Tubeless', 'All-Season', 'Performance'] },
    { type: 'Car Battery', price: [3000, 12000], variants: ['45Ah', '60Ah', 'Maintenance-Free'] },
    { type: 'Dashboard Camera', price: [1500, 10000], variants: ['HD', 'Night Vision', 'Dual Camera'] }
  ]
};

// Generate unique SKU
function generateSKU() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let sku = 'NXB';
  for (let i = 0; i < 9; i++) {
    sku += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return sku;
}

// Generate product
function generateProduct(category, template, brand, providerName) {
  const sku = generateSKU();
  const variant = randomPick(template.variants);
  const basePrice = randomInRange(template.price[0], template.price[1]);
  const price = Math.round(basePrice / 10) * 10 - 1;
  
  const rating = Math.round(randomInRange(3.0, 5.0) * 10) / 10;
  const reviewCount = rating > 4.0 ? randomInt(100, 5000) : 
                      rating > 3.5 ? randomInt(50, 1000) : 
                      randomInt(10, 500);
  
  const title = `${brand} ${variant} ${template.type}`;
  const imageId = Math.abs(sku.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  const imageUrl = `https://picsum.photos/seed/${imageId}/500/500`;
  
  return {
    sku,
    title,
    description: `Premium ${variant} ${template.type} from ${brand}. High quality product with ${rating} star rating based on ${reviewCount} customer reviews.`,
    category,
    brand,
    images: [{
      url: imageUrl,
      alt: title
    }],
    providers: [{
      name: providerName,
      productId: `${providerName.toUpperCase()}-${sku}`,
      url: providerName === 'amazon' 
        ? `https://www.amazon.in/dp/${sku.toLowerCase()}`
        : `https://www.flipkart.com/product/p/itm${sku.toLowerCase()}`,
      price: {
        current: price,
        original: Math.round(price * randomInRange(1.05, 1.25)),
        discount: 0
      },
      availability: Math.random() > 0.05 ? 'in_stock' : 'out_of_stock',
      rating,
      reviewCount,
      seller: providerName === 'amazon' ? 'Amazon' : 'Flipkart',
      shipping: {
        cost: 0,
        estimatedDays: randomInt(2, 7),
        isFree: true
      },
      lastUpdated: new Date()
    }],
    specifications: new Map([
      ['Brand', brand],
      ['Model', variant],
      ['Type', template.type]
    ])
  };
}

// Generate all products
async function generateAllProducts() {
  const products = [];
  const categories = Object.keys(PRODUCT_TEMPLATES);
  const productsPerCategory = 500;
  const providers = ['amazon', 'flipkart'];
  
  console.log(`\nGenerating ${productsPerCategory} products per category...`);
  console.log(`Total categories: ${categories.length}`);
  console.log(`Target total: ${productsPerCategory * categories.length} products\n`);
  
  for (const category of categories) {
    const templates = PRODUCT_TEMPLATES[category];
    const brands = BRANDS[category];
    
    console.log(`Generating ${category}...`);
    
    for (let i = 0; i < productsPerCategory; i++) {
      const template = randomPick(templates);
      const brand = randomPick(brands);
      const provider = randomPick(providers);
      
      const product = generateProduct(category, template, brand, provider);
      product.providers[0].price.discount = 
        product.providers[0].price.original - product.providers[0].price.current;
      
      products.push(product);
    }
    
    console.log(`✓ Generated ${productsPerCategory} ${category} products`);
  }
  
  console.log(`\n✓ Total products generated: ${products.length}`);
  return products;
}

// Seed database
async function seedDatabase() {
  try {
    console.log('\n========================================');
    console.log('  NexBuy Product Seeding Script v2');
    console.log('========================================\n');
    
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexbuy';
    console.log(`Connecting to MongoDB: ${uri}`);
    
    await mongoose.connect(uri);
    console.log('✓ Connected to MongoDB\n');
    
    console.log('Clearing existing products...');
    const deleted = await Product.deleteMany({});
    console.log(`✓ Deleted ${deleted.deletedCount} existing products\n`);
    
    console.log('Generating products...');
    const products = await generateAllProducts();
    
    console.log('\nInserting products into database...');
    const batchSize = 500;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      await Product.insertMany(batch);
      console.log(`Inserted: ${Math.min(i + batchSize, products.length)}/${products.length} products`);
    }
    
    console.log('✓ All products inserted successfully!\n');
    
    console.log('Creating database indexes...');
    await Product.collection.createIndex({ category: 1 });
    await Product.collection.createIndex({ brand: 1 });
    await Product.collection.createIndex({ 'providers.price.current': 1 });
    await Product.collection.createIndex({ 'providers.rating': 1 });
    console.log('✓ Indexes created!\n');
    
    console.log('========================================');
    console.log('  Seeding Completed Successfully! ');
    console.log('========================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
