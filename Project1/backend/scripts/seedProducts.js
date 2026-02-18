require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Sample product data
const sampleProducts = [
  // Electronics
  {
    sku: 'ELEC001',
    title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
    description: 'Industry-leading noise cancelling with Auto NC Optimizer. Crystal clear hands-free calling. Up to 30-hour battery life. Ultra-comfortable, with superior sound quality.',
    category: 'Electronics',
    subcategory: 'Audio',
    brand: 'Sony',
    images: [
      { url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&h=800&fit=crop', alt: 'Sony Headphones' }
    ],
    providers: [
      {
        name: 'amazon',
        productId: 'B0BXSFK9RB',
        url: '#',
        price: { current: 24990, original: 34990, discount: 10000 },
        availability: 'in_stock',
        rating: 4.5,
        reviewCount: 1234,
        seller: 'Amazon',
        shipping: { cost: 0, estimatedDays: 2, isFree: true }
      },
      {
        name: 'flipkart',
        productId: 'ACCGWFQFK9DGHFTG',
        url: '#',
        price: { current: 25490, original: 34990, discount: 9500 },
        availability: 'in_stock',
        rating: 4.4,
        reviewCount: 856,
        seller: 'Flipkart',
        shipping: { cost: 0, estimatedDays: 3, isFree: true }
      }
    ],
    tags: ['headphones', 'wireless', 'noise-cancelling', 'sony', 'premium'],
    isActive: true
  },
  {
    sku: 'ELEC002',
    title: 'Apple iPhone 15 Pro (256GB) - Natural Titanium',
    description: 'Forged in titanium with A17 Pro chip. Strong and light titanium design. Advanced camera system. Customizable Action button. All-day battery life.',
    category: 'Electronics',
    subcategory: 'Smartphones',
    brand: 'Apple',
    images: [
      { url: 'https://images.unsplash.com/photo-1592286927505-4b100d6e2a04?w=800&h=800&fit=crop', alt: 'iPhone 15 Pro' }
    ],
    providers: [
      {
        name: 'amazon',
        productId: 'B0CHX3FXFB',
        url: '#',
        price: { current: 134900, original: 144900, discount: 10000 },
        availability: 'in_stock',
        rating: 4.6,
        reviewCount: 2341,
        seller: 'Appario',
        shipping: { cost: 0, estimatedDays: 1, isFree: true }
      },
      {
        name: 'flipkart',
        productId: 'MOBGWFQFK9DPHFTG',
        url: '#',
        price: { current: 135900, original: 144900, discount: 9000 },
        availability: 'in_stock',
        rating: 4.5,
        reviewCount: 1876,
        seller: 'Flipkart',
        shipping: { cost: 0, estimatedDays: 2, isFree: true }
      }
    ],
    sizes: [
      { label: '128GB', availability: true },
      { label: '256GB', availability: true },
      { label: '512GB', availability: true }
    ],
    colors: [
      { name: 'Natural Titanium', hex: '#E5E5E5' },
      { name: 'Blue Titanium', hex: '#2E3F4F' },
      { name: 'White Titanium', hex: '#F5F5F5' },
      { name: 'Black Titanium', hex: '#1C1C1C' }
    ],
    tags: ['iphone', 'smartphone', 'apple', '5g', 'titanium'],
    isActive: true
  },

  // Fashion - Men's Clothing
  {
    sku: 'FASH001',
    title: 'Levi\'s Men\'s 511 Slim Fit Jeans',
    description: 'Iconic slim fit jeans with a modern twist. Crafted from premium denim with slight stretch for all-day comfort. Sits below the waist with a slim leg.',
    category: 'Fashion',
    subcategory: 'Men\'s Jeans',
    brand: 'Levi\'s',
    images: [
      { url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&h=800&fit=crop', alt: 'Levi\'s Jeans' }
    ],
    providers: [
      {
        name: 'amazon',
        productId: 'B07XR3JQVW',
        url: '#',
        price: { current: 2499, original: 3999, discount: 1500 },
        availability: 'in_stock',
        rating: 4.3,
        reviewCount: 3245,
        seller: 'Amazon',
        shipping: { cost: 0, estimatedDays: 3, isFree: true }
      },
      {
        name: 'flipkart',
        productId: 'JEAGWFQFK9DQHFTG',
        url: '#',
        price: { current: 2599, original: 3999, discount: 1400 },
        availability: 'in_stock',
        rating: 4.2,
        reviewCount: 2156,
        seller: 'Flipkart',
        shipping: { cost: 0, estimatedDays: 4, isFree: true }
      }
    ],
    sizes: [
      { label: '28', availability: true },
      { label: '30', availability: true },
      { label: '32', availability: true },
      { label: '34', availability: true },
      { label: '36', availability: false }
    ],
    colors: [
      { name: 'Dark Blue', hex: '#1E3A8A' },
      { name: 'Black', hex: '#000000' },
      { name: 'Light Blue', hex: '#3B82F6' }
    ],
    tags: ['jeans', 'denim', 'levis', 'mens-fashion', 'slim-fit'],
    isActive: true
  },
  {
    sku: 'FASH002',
    title: 'Nike Men\'s Dri-FIT Training T-Shirt',
    description: 'Stay dry and comfortable during your workout. Nike Dri-FIT technology moves sweat away from your skin. Breathable fabric with modern fit.',
    category: 'Fashion',
    subcategory: 'Men\'s Activewear',
    brand: 'Nike',
    images: [
      { url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop', alt: 'Nike T-Shirt' }
    ],
    providers: [
      {
        name: 'amazon',
        productId: 'B09XYZABC1',
        url: '#',
        price: { current: 1299, original: 1995, discount: 696 },
        availability: 'in_stock',
        rating: 4.4,
        reviewCount: 1567,
        seller: 'Nike Store',
        shipping: { cost: 0, estimatedDays: 2, isFree: true }
      },
      {
        name: 'flipkart',
        productId: 'TSHGWFQFK9DRHFTG',
        url: '#',
        price: { current: 1349, original: 1995, discount: 646 },
        availability: 'in_stock',
        rating: 4.3,
        reviewCount: 987,
        seller: 'Flipkart',
        shipping: { cost: 50, estimatedDays: 4, isFree: false }
      }
    ],
    sizes: [
      { label: 'S', availability: true },
      { label: 'M', availability: true },
      { label: 'L', availability: true },
      { label: 'XL', availability: true },
      { label: 'XXL', availability: false }
    ],
    colors: [
      { name: 'Black', hex: '#000000' },
      { name: 'Navy', hex: '#1E3A8A' },
      { name: 'Grey', hex: '#6B7280' }
    ],
    tags: ['tshirt', 'nike', 'activewear', 'dri-fit', 'sports'],
    isActive: true
  },

  // Home & Kitchen
  {
    sku: 'HOME001',
    title: 'Instant Pot Duo 7-in-1 Electric Pressure Cooker',
    description: '7 kitchen appliances in 1: pressure cooker, slow cooker, rice cooker, steamer, sauté pan, yogurt maker & warmer. 14 smart programs for perfect results.',
    category: 'Home & Kitchen',
    subcategory: 'Kitchen Appliances',
    brand: 'Instant Pot',
    images: [
      { url: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&h=800&fit=crop', alt: 'Instant Pot' }
    ],
    providers: [
      {
        name: 'amazon',
        productId: 'B00FLYWNYQ',
        url: '#',
        price: { current: 6999, original: 9995, discount: 2996 },
        availability: 'in_stock',
        rating: 4.6,
        reviewCount: 45678,
        seller: 'Amazon',
        shipping: { cost: 0, estimatedDays: 2, isFree: true }
      },
      {
        name: 'flipkart',
        productId: 'PCKGWFQFK9DSHFTG',
        url: '#',
        price: { current: 7299, original: 9995, discount: 2696 },
        availability: 'in_stock',
        rating: 4.5,
        reviewCount: 23456,
        seller: 'Flipkart',
        shipping: { cost: 0, estimatedDays: 3, isFree: true }
      }
    ],
    specifications: new Map([
      ['Capacity', '6 Quarts (5.7 Liters)'],
      ['Power', '1000W'],
      ['Programs', '14 Smart Programs'],
      ['Material', 'Stainless Steel']
    ]),
    tags: ['pressure-cooker', 'instant-pot', 'kitchen-appliances', 'multi-cooker'],
    isActive: true
  },

  // Books
  {
    sku: 'BOOK001',
    title: 'Atomic Habits: An Easy & Proven Way to Build Good Habits',
    description: 'Transform your life with tiny changes that deliver remarkable results. #1 New York Times bestseller with over 15 million copies sold worldwide.',
    category: 'Books',
    subcategory: 'Self-Help',
    brand: 'Penguin Random House',
    images: [
      { url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=800&fit=crop', alt: 'Atomic Habits Book' }
    ],
    providers: [
      {
        name: 'amazon',
        productId: 'B07RFSSYBH',
        url: '#',
        price: { current: 399, original: 599, discount: 200 },
        availability: 'in_stock',
        rating: 4.7,
        reviewCount: 87654,
        seller: 'Amazon',
        shipping: { cost: 0, estimatedDays: 3, isFree: true }
      },
      {
        name: 'flipkart',
        productId: 'BOKGWFQFK9DTHFTG',
        url: '#',
        price: { current: 419, original: 599, discount: 180 },
        availability: 'in_stock',
        rating: 4.6,
        reviewCount: 54321,
        seller: 'Flipkart',
        shipping: { cost: 0, estimatedDays: 4, isFree: true }
      }
    ],
    specifications: new Map([
      ['Author', 'James Clear'],
      ['Publisher', 'Penguin Random House'],
      ['Pages', '320'],
      ['Language', 'English'],
      ['ISBN', '9780735211292']
    ]),
    tags: ['books', 'self-help', 'habits', 'productivity', 'bestseller'],
    isActive: true
  },

  // Sports & Fitness
  {
    sku: 'SPORT001',
    title: 'Yoga Mat - Extra Thick Exercise Mat with Carrying Strap',
    description: 'Premium 6mm thick yoga mat with superior cushioning. Non-slip surface for stability. Eco-friendly TPE material. Perfect for yoga, pilates, and floor exercises.',
    category: 'Sports & Fitness',
    subcategory: 'Yoga Equipment',
    brand: 'FitPro',
    images: [
      { url: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&h=600&fit=crop', alt: 'Yoga Mat' }
    ],
    providers: [
      {
        name: 'amazon',
        productId: 'B08XYABC23',
        url: '#',
        price: { current: 999, original: 1999, discount: 1000 },
        availability: 'in_stock',
        rating: 4.4,
        reviewCount: 2345,
        seller: 'FitPro Store',
        shipping: { cost: 0, estimatedDays: 3, isFree: true }
      },
      {
        name: 'flipkart',
        productId: 'YMTGWFQFK9DUHFTG',
        url: '#',
        price: { current: 1099, original: 1999, discount: 900 },
        availability: 'in_stock',
        rating: 4.3,
        reviewCount: 1456,
        seller: 'Flipkart',
        shipping: { cost: 50, estimatedDays: 5, isFree: false }
      }
    ],
    colors: [
      { name: 'Purple', hex: '#8B5CF6' },
      { name: 'Blue', hex: '#3B82F6' },
      { name: 'Pink', hex: '#EC4899' },
      { name: 'Green', hex: '#10B981' }
    ],
    specifications: new Map([
      ['Thickness', '6mm'],
      ['Length', '183cm'],
      ['Width', '61cm'],
      ['Material', 'TPE (Eco-friendly)'],
      ['Weight', '900g']
    ]),
    tags: ['yoga', 'fitness', 'exercise', 'mat', 'workout'],
    isActive: true
  }
];

// Sample coupons
const sampleCoupons = [
  {
    code: 'WELCOME50',
    description: 'Welcome offer - Flat 50 rupees off on first order',
    type: 'fixed',
    value: 50,
    minPurchase: 500,
    usageLimit: 1000,
    perUserLimit: 1,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    isFirstTimeOnly: true,
    isActive: true
  },
  {
    code: 'SAVE10',
    description: '10% off on orders above 1000',
    type: 'percentage',
    value: 10,
    minPurchase: 1000,
    maxDiscount: 500,
    usageLimit: null,
    perUserLimit: 5,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    isActive: true
  },
  {
    code: 'FREESHIP',
    description: 'Free shipping on all orders',
    type: 'free_shipping',
    value: 0,
    minPurchase: 0,
    usageLimit: null,
    perUserLimit: 10,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    isActive: true
  }
];

async function seedData() {
  try {
    console.log('Seeding database...');

    // Clear existing data
    await Product.deleteMany({});
    await Coupon.deleteMany({});
    console.log('Cleared existing data');

    // Insert products
    await Product.insertMany(sampleProducts);
    console.log(`✓ Inserted ${sampleProducts.length} products`);

    // Insert coupons
    await Coupon.insertMany(sampleCoupons);
    console.log(`✓ Inserted ${sampleCoupons.length} coupons`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\nSample products:');
    sampleProducts.forEach(p => {
      console.log(`  - ${p.title} (${p.sku})`);
    });

    console.log('\nSample coupons:');
    sampleCoupons.forEach(c => {
      console.log(`  - ${c.code}: ${c.description}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

// Run seeding
seedData();
