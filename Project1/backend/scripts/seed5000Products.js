const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

// Realistic brand mappings by category
const BRANDS = {
  Electronics: ['Samsung', 'Apple', 'OnePlus', 'Xiaomi', 'Realme', 'Sony', 'LG', 'Boat', 'JBL', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Intel', 'AMD', 'Nvidia', 'Canon', 'Nikon', 'GoPro'],
  Fashion: ['Nike', 'Adidas', 'Puma', 'Reebok', 'Levi\'s', 'Zara', 'H&M', 'Allen Solly', 'Peter England', 'Van Heusen', 'Louis Philippe', 'Raymond', 'Fabindia', 'Biba', 'W', 'Global Desi'],
  'Home & Kitchen': ['Prestige', 'Hawkins', 'Pigeon', 'Butterfly', 'Milton', 'Cello', 'Borosil', 'Philips', 'Bajaj', 'Orient', 'Havells', 'Crompton', 'Usha', 'Singer', 'Whirlpool', 'IFB'],
  Books: ['Penguin', 'HarperCollins', 'Scholastic', 'Oxford', 'Cambridge', 'McGraw Hill', 'Pearson', 'Wiley', 'Rupa', 'Westland', 'Hachette', 'Random House', 'Bloomsbury'],
  Toys: ['Lego', 'Mattel', 'Hasbro', 'Fisher-Price', 'Hot Wheels', 'Barbie', 'Nerf', 'Funskool', 'Toysrus', 'Disney', 'Marvel', 'Playskool'],
  'Beauty & Personal Care': ['Lakme', 'Maybelline', 'L\'Oreal', 'Nivea', 'Garnier', 'Himalaya', 'Dove', 'Pantene', 'Head & Shoulders', 'Olay', 'Ponds', 'Mamaearth', 'Biotique', 'The Body Shop'],
  'Sports & Fitness': ['Nike', 'Adidas', 'Puma', 'Reebok', 'Decathlon', 'Yonex', 'Nivia', 'Cosco', 'Strauss', 'Kalenji', 'Domyos', 'Fitbit', 'Garmin'],
  Groceries: ['Tata', 'Amul', 'Mother Dairy', 'Nestle', 'Britannia', 'Parle', 'ITC', 'Dabur', 'Patanjali', 'Everest', 'MDH', 'Aashirvaad', 'Fortune', 'Saffola'],
  Furniture: ['IKEA', 'Godrej', 'Nilkamal', 'Durian', 'Urban Ladder', 'Pepperfry', 'Hometown', 'Woodsworth', '@home', 'Springtek'],
  Automotive: ['Bosch', 'Philips', 'Michelin', 'MRF', 'CEAT', '3M', 'Waxpol', 'Turtle', 'Meguiars', 'Motul', 'Shell', 'Castrol']
};

// Product templates for realistic titles and descriptions
const PRODUCT_TEMPLATES = {
  Electronics: [
    { type: 'Smartphone', titles: ['Galaxy', 'iPhone', 'OnePlus', 'Mi', 'Realme', 'Pixel', 'Vivo', 'Oppo'], price: [10000, 80000], desc: 'Latest smartphone with advanced camera and 5G connectivity' },
    { type: 'Laptop', titles: ['ThinkPad', 'Inspiron', 'MacBook', 'Pavilion', 'VivoBook', 'IdeaPad'], price: [25000, 120000], desc: 'High-performance laptop for work and entertainment' },
    { type: 'Headphones', titles: ['AirPods', 'Airdopes', 'QuietComfort', 'WH-1000XM'], price: [500, 30000], desc: 'Premium wireless headphones with noise cancellation' },
    { type: 'Smart TV', titles: ['Crystal', 'OLED', 'QLED', 'Bravia', 'Smart Android TV'], price: [15000, 150000], desc: '4K Smart TV with HDR and streaming apps' },
    { type: 'Tablet', titles: ['iPad', 'Galaxy Tab', 'MatePad', 'Tab'], price: [8000, 70000], desc: 'Lightweight tablet perfect for entertainment and productivity' },
    { type: 'Smartwatch', titles: ['Watch', 'Band', 'Fit', 'Active'], price: [2000, 45000], desc: 'Fitness smartwatch with heart rate monitoring' },
    { type: 'Camera', titles: ['EOS', 'Alpha', 'Lumix', 'D-Series'], price: [25000, 200000], desc: 'Professional DSLR camera with high resolution' },
    { type: 'Speaker', titles: ['Flip', 'Charge', 'SoundLink', 'Echo'], price: [1500, 25000], desc: 'Portable Bluetooth speaker with powerful bass' }
  ],
  Fashion: [
    { type: 'Men Shirt', titles: ['Cotton', 'Formal', 'Casual', 'Slim Fit', 'Regular Fit'], price: [400, 3000], desc: 'Comfortable cotton shirt for everyday wear' },
    { type: 'Women Kurti', titles: ['Anarkali', 'Straight', 'A-Line', 'Flared'], price: [500, 4000], desc: 'Trendy ethnic wear kurti with beautiful prints' },
    { type: 'Jeans', titles: ['Skinny', 'Slim', 'Regular', 'Bootcut', 'Straight'], price: [800, 5000], desc: 'Premium quality denim jeans with perfect fit' },
    { type: 'Sneakers', titles: ['Air', 'Boost', 'Run', 'Training', 'Classic'], price: [1500, 12000], desc: 'Stylish and comfortable sneakers for daily use' },
    { type: 'Dress', titles: ['Maxi', 'Midi', 'Mini', 'Cocktail', 'Party'], price: [800, 6000], desc: 'Elegant dress perfect for special occasions' },
    { type: 'T-Shirt', titles: ['Crew Neck', 'V-Neck', 'Polo', 'Graphic'], price: [300, 2000], desc: 'Soft cotton t-shirt with modern design' },
    { type: 'Saree', titles: ['Silk', 'Cotton', 'Georgette', 'Chiffon'], price: [1000, 15000], desc: 'Traditional Indian saree with intricate work' },
    { type: 'Watch', titles: ['Analog', 'Digital', 'Smart', 'Chronograph'], price: [500, 50000], desc: 'Stylish wristwatch with premium build quality' }
  ],
  'Home & Kitchen': [
    { type: 'Pressure Cooker', titles: ['Stainless Steel', 'Inner Lid', 'Outer Lid', 'Induction Base'], price: [800, 5000], desc: 'Durable pressure cooker for faster cooking' },
    { type: 'Mixer Grinder', titles: ['750W', '500W', '1000W', '3 Jar', '4 Jar'], price: [1500, 8000], desc: 'Powerful mixer grinder for all grinding needs' },
    { type: 'Air Fryer', titles: ['Digital', 'Manual', '4L', '6L'], price: [3000, 15000], desc: 'Healthy cooking with 80% less oil' },
    { type: 'Water Purifier', titles: ['RO+UV', 'RO', 'UV', 'Gravity'], price: [5000, 25000], desc: 'Advanced water purification system for safe drinking water' },
    { type: 'Dinner Set', titles: ['24 Piece', '32 Piece', 'Bone China', 'Melamine'], price: [800, 8000], desc: 'Elegant dinner set for family meals' },
    { type: 'Bedsheet Set', titles: ['Cotton', 'Satin', 'King Size', 'Queen Size'], price: [500, 5000], desc: 'Soft and comfortable bedsheet with pillow covers' },
    { type: 'Curtains', titles: ['Blackout', 'Sheer', 'Door', 'Window'], price: [400, 4000], desc: 'Premium quality curtains for home decor' },
    { type: 'Vacuum Cleaner', titles: ['Wet & Dry', 'Handheld', 'Robot', 'Upright'], price: [3000, 35000], desc: 'Powerful vacuum cleaner for spotless cleaning' }
  ],
  Books: [
    { type: 'Fiction', titles: ['The', 'A Tale of', 'Journey to', 'Mystery of', 'Secret'], price: [150, 1500], desc: 'Bestselling fiction novel with gripping storyline' },
    { type: 'Self-Help', titles: ['How to', 'The Art of', 'Mastering', 'Guide to'], price: [200, 800], desc: 'Inspirational self-help book for personal growth' },
    { type: 'Technology', titles: ['Learning', 'Mastering', 'Complete Guide to', 'Introduction to'], price: [300, 2000], desc: 'Comprehensive guide for tech enthusiasts' },
    { type: 'Biography', titles: ['Life of', 'Story of', 'Journey of', 'Autobiography'], price: [250, 1200], desc: 'Inspiring biography of influential personality' },
    { type: 'Children', titles: ['Tales of', 'Adventures of', 'Stories for', 'Fun with'], price: [100, 600], desc: 'Colorful picture book for young readers' },
    { type: 'Cookbook', titles: ['Easy', 'Complete', 'Traditional', 'Modern'], price: [200, 1000], desc: 'Delicious recipes for home cooking' },
    { type: 'Business', titles: ['Startup', 'Business Strategy', 'Marketing', 'Finance'], price: [300, 1500], desc: 'Essential business guide for entrepreneurs' }
  ],
  Toys: [
    { type: 'Building Blocks', titles: ['Classic', 'Creator', 'City', 'Technic'], price: [500, 15000], desc: 'Creative building blocks for endless fun' },
    { type: 'Action Figure', titles: ['Superhero', 'Robot', 'Transformer', 'Dinosaur'], price: [300, 3000], desc: 'Detailed action figure with movable parts' },
    { type: 'Board Game', titles: ['Strategy', 'Family', 'Party', 'Educational'], price: [400, 3500], desc: 'Fun board game for family entertainment' },
    { type: 'Doll', titles: ['Fashion', 'Princess', 'Baby', 'Collectible'], price: [500, 5000], desc: 'Beautiful doll with accessories' },
    { type: 'Remote Control', titles: ['Car', 'Drone', 'Helicopter', 'Robot'], price: [800, 12000], desc: 'Exciting remote-controlled toy with advanced features' },
    { type: 'Puzzle', titles: ['Jigsaw', '3D', 'Educational', 'Brain Teaser'], price: [200, 2000], desc: 'Challenging puzzle for all ages' },
    { type: 'Soft Toy', titles: ['Teddy', 'Panda', 'Unicorn', 'Animal'], price: [300, 2500], desc: 'Cuddly soft toy perfect for kids' }
  ],
  'Beauty & Personal Care': [
    { type: 'Lipstick', titles: ['Matte', 'Glossy', 'Liquid', 'Creamy'], price: [200, 1500], desc: 'Long-lasting lipstick with vibrant color' },
    { type: 'Face Cream', titles: ['Night', 'Day', 'Anti-Aging', 'Moisturizing'], price: [250, 3000], desc: 'Nourishing face cream for glowing skin' },
    { type: 'Shampoo', titles: ['Anti-Dandruff', 'Smooth & Silky', 'Volume', 'Repair'], price: [150, 1200], desc: 'Gentle shampoo for healthy hair' },
    { type: 'Perfume', titles: ['EDT', 'EDP', 'Deo', 'Body Spray'], price: [300, 8000], desc: 'Long-lasting fragrance for all-day freshness' },
    { type: 'Face Wash', titles: ['Charcoal', 'Neem', 'Vitamin C', 'Gentle'], price: [100, 800], desc: 'Deep cleansing face wash for clear skin' },
    { type: 'Hair Oil', titles: ['Coconut', 'Almond', 'Argan', 'Herbal'], price: [150, 1500], desc: 'Natural hair oil for strong and shiny hair' },
    { type: 'Sunscreen', titles: ['SPF 30', 'SPF 50', 'Gel', 'Lotion'], price: [200, 1500], desc: 'Broad spectrum sun protection cream' },
    { type: 'Makeup Kit', titles: ['Bridal', 'Party', 'Professional', 'Everyday'], price: [500, 5000], desc: 'Complete makeup kit with all essentials' }
  ],
  'Sports & Fitness': [
    { type: 'Running Shoes', titles: ['Marathon', 'Trail', 'Training', 'Lightweight'], price: [1500, 12000], desc: 'Comfortable running shoes with great cushioning' },
    { type: 'Yoga Mat', titles: ['Anti-Slip', 'Thick', 'Eco-Friendly', 'Foldable'], price: [400, 3000], desc: 'Premium yoga mat for comfortable practice' },
    { type: 'Dumbbell Set', titles: ['Adjustable', 'Fixed', 'Rubber Coated', 'Chrome'], price: [800, 8000], desc: 'Durable dumbbells for strength training' },
    { type: 'Cricket Bat', titles: ['Kashmir Willow', 'English Willow', 'Professional', 'Practice'], price: [1000, 25000], desc: 'High-quality cricket bat with perfect balance' },
    { type: 'Football', titles: ['Match', 'Training', 'Professional', 'Size 5'], price: [400, 3000], desc: 'Official size football for all surfaces' },
    { type: 'Badminton Racket', titles: ['Lightweight', 'Power', 'Control', 'Professional'], price: [500, 8000], desc: 'Premium badminton racket for competitive play' },
    { type: 'Cycle', titles: ['Mountain', 'Road', 'Hybrid', 'Kids'], price: [5000, 50000], desc: 'Durable bicycle for fitness and commute' },
    { type: 'Gym Bag', titles: ['Duffle', 'Backpack', 'Sport', 'Travel'], price: [500, 3000], desc: 'Spacious gym bag with multiple compartments' }
  ],
  Groceries: [
    { type: 'Rice', titles: ['Basmati', 'Brown', 'Organic', 'Sona Masoori'], price: [100, 2000], desc: 'Premium quality rice for daily cooking' },
    { type: 'Cooking Oil', titles: ['Sunflower', 'Refined', 'Mustard', 'Olive'], price: [150, 1500], desc: 'Healthy cooking oil for all recipes' },
    { type: 'Atta', titles: ['Whole Wheat', 'Multigrain', 'Organic', 'Chakki'], price: [200, 800], desc: 'Fresh atta flour for soft rotis' },
    { type: 'Tea', titles: ['Green', 'Black', 'Masala', 'Herbal'], price: [100, 1000], desc: 'Aromatic tea leaves for perfect chai' },
    { type: 'Biscuits', titles: ['Cream', 'Digestive', 'Cookies', 'Crackers'], price: [20, 300], desc: 'Crunchy biscuits for tea-time snack' },
    { type: 'Spices', titles: ['Garam Masala', 'Turmeric', 'Red Chilli', 'Mix'], price: [50, 500], desc: 'Pure spices for authentic taste' },
    { type: 'Pulses', titles: ['Toor Dal', 'Moong Dal', 'Chana Dal', 'Masoor'], price: [100, 800], desc: 'Protein-rich pulses for healthy meals' },
    { type: 'Snacks', titles: ['Chips', 'Namkeen', 'Nuts', 'Mix'], price: [30, 500], desc: 'Tasty snacks for munching anytime' }
  ],
  Furniture: [
    { type: 'Sofa Set', titles: ['3 Seater', 'L-Shape', 'Recliner', '5 Seater'], price: [15000, 80000], desc: 'Comfortable sofa set for living room' },
    { type: 'Bed', titles: ['Queen Size', 'King Size', 'Single', 'Storage'], price: [10000, 60000], desc: 'Sturdy wooden bed with elegant design' },
    { type: 'Study Table', titles: ['Computer', 'Writing', 'Kids', 'Foldable'], price: [3000, 15000], desc: 'Functional study table with storage' },
    { type: 'Dining Table', titles: ['4 Seater', '6 Seater', 'Glass Top', 'Wooden'], price: [8000, 50000], desc: 'Beautiful dining table for family meals' },
    { type: 'Wardrobe', titles: ['2 Door', '3 Door', 'Sliding', 'Mirror'], price: [8000, 40000], desc: 'Spacious wardrobe with organized storage' },
    { type: 'Office Chair', titles: ['Ergonomic', 'Executive', 'Mesh', 'Gaming'], price: [3000, 25000], desc: 'Comfortable office chair for long hours' },
    { type: 'Bookshelf', titles: ['Wall Mounted', 'Ladder', 'Open', 'Cabinet'], price: [2000, 15000], desc: 'Stylish bookshelf for organized storage' },
    { type: 'TV Unit', titles: ['Wall Mount', 'Floor', 'Modern', 'Classic'], price: [4000, 25000], desc: 'Elegant TV unit with storage space' }
  ],
  Automotive: [
    { type: 'Car Battery', titles: ['Maintenance Free', 'Dry', 'Wet', 'AGM'], price: [3000, 12000], desc: 'Long-lasting car battery with warranty' },
    { type: 'Tyre', titles: ['Tubeless', 'Radial', 'All Season', 'Performance'], price: [3000, 15000], desc: 'Durable car tyre with excellent grip' },
    { type: 'Car Care Kit', titles: ['Wash & Wax', 'Polish', 'Interior', 'Complete'], price: [500, 5000], desc: 'Complete car care kit for shine' },
    { type: 'LED Lights', titles: ['Headlight', 'Fog', 'Interior', 'Strip'], price: [400, 8000], desc: 'Bright LED lights for better visibility' },
    { type: 'Seat Cover', titles: ['Leather', 'Fabric', 'Custom Fit', 'Universal'], price: [1000, 8000], desc: 'Premium seat covers for comfort and style' },
    { type: 'Car Charger', titles: ['Fast Charging', 'Dual USB', 'Type-C', 'Wireless'], price: [200, 2000], desc: 'Quick charging car adapter' },
    { type: 'Air Freshener', titles: ['Gel', 'Spray', 'Clip', 'Diffuser'], price: [100, 1000], desc: 'Long-lasting car fragrance' },
    { type: 'Dashboard Cam', titles: ['HD', '4K', 'Night Vision', 'Dual'], price: [2000, 15000], desc: 'High-quality dashboard camera for safety' }
  ]
};

// Helper function to generate random number in range
function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Helper function to generate random integer in range
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to pick random item from array
function randomPick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Generate SKU
function generateSKU() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let sku = 'NXB';
  for (let i = 0; i < 9; i++) {
    sku += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return sku;
}

// Generate realistic product
function generateProduct(category, template, brand, source) {
  const sku = generateSKU();
  const variant = randomPick(template.titles);
  const priceRange = template.price;
  const basePrice = randomInRange(priceRange[0], priceRange[1]);
  const price = Math.round(basePrice / 10) * 10 - 1; // Price ending in 9
  
  // Generate realistic rating (skewed towards higher ratings)
  const ratingBase = randomInRange(3.0, 5.0);
  const rating = Math.round(ratingBase * 10) / 10;
  
  // Reviews count (more popular products have more reviews)
  const reviewsCount = rating > 4.0 
    ? randomInt(100, 5000) 
    : rating > 3.5 
      ? randomInt(50, 1000) 
      : randomInt(10, 500);
  
  // Generate title
  const title = `${brand} ${variant} ${template.type}`;
  
  // Image URL (using reliable Unsplash images with specific search terms)
  const imageMap = {
    // Electronics
    'Headphones': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    'Earbuds': 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop',
    'Bluetooth Headphones': 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&h=400&fit=crop',
    'Smartphone': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop',
    'Laptop': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop',
    'Tablet': 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&h=400&fit=crop',
    'Smartwatch': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    'Camera': 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=400&fit=crop',
    'Smart TV': 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=400&fit=crop',
    'Speaker': 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop',
    
    // Home & Kitchen
    'Water Bottle': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop',
    'Water Purifier': 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=400&h=400&fit=crop',
    'Desk Lamp': 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=400&fit=crop',
    'Pressure Cooker': 'https://images.unsplash.com/photo-1584990347449-39bcf0f8d2f6?w=400&h=400&fit=crop',
    'Mixer Grinder': 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=400&h=400&fit=crop',
    'Air Fryer': 'https://images.unsplash.com/photo-1585636737116-51a8e7d28a82?w=400&h=400&fit=crop',
    'Vacuum Cleaner': 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400&h=400&fit=crop',
    'Dinner Set': 'https://images.unsplash.com/photo-1574870165453-e2b0ce4b3846?w=400&h=400&fit=crop',
    'Bedsheet Set': 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&h=400&fit=crop',
    'Curtains': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop',
    
    // Sports & Fitness
    'Yoga Mat': 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop',
    'Running Shoes': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
    'Dumbbell Set': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop',
    'Cricket Bat': 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&h=400&fit=crop',
    'Football': 'https://images.unsplash.com/photo-1614632537423-1e6c2e7e0aab?w=400&h=400&fit=crop',
    'Badminton Racket': 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&h=400&fit=crop',
    'Cycle': 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400&h=400&fit=crop',
    'Gym Bag': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
    
    // Accessories
    'Power Bank': 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&h=400&fit=crop',
    'USB-C Charger': 'https://images.unsplash.com/photo-1591290619762-9281b4fb9021?w=400&h=400&fit=crop',
    'Car Charger': 'https://images.unsplash.com/photo-1591290619762-9281b4fb9021?w=400&h=400&fit=crop',
    'Wireless Mouse': 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=400&fit=crop',
    'Laptop Sleeve': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
    
    // Fashion
    'Men Shirt': 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&h=400&fit=crop',
    'Women Kurti': 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=400&fit=crop',
    'Jeans': 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop',
    'Sneakers': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop',
    'Dress': 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop',
    'T-Shirt': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
    'Saree': 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=400&fit=crop',
    'Watch': 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=400&fit=crop',
    
    // Beauty & Personal Care
    'Lipstick': 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&h=400&fit=crop',
    'Face Cream': 'https://images.unsplash.com/photo-1556228841-0e2c12f41734?w=400&h=400&fit=crop',
    'Shampoo': 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&h=400&fit=crop',
    'Perfume': 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop',
    'Face Wash': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop',
    'Hair Oil': 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=400&fit=crop',
    'Sunscreen': 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop',
    'Makeup Kit': 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&h=400&fit=crop',
    
    // Groceries
    'Rice': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop',
    'Cooking Oil': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop',
    'Atta': 'https://images.unsplash.com/photo-1628453396487-bfd69f828f90?w=400&h=400&fit=crop',
    'Tea': 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&h=400&fit=crop',
    'Biscuits': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop',
    'Spices': 'https://images.unsplash.com/photo-1596040033229-a0b3b46c4c50?w=400&h=400&fit=crop',
    'Pulses': 'https://images.unsplash.com/photo-1577003811926-53b288c1c4fd?w=400&h=400&fit=crop',
    'Snacks': 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&h=400&fit=crop',
    
    // Furniture
    'Sofa Set': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop',
    'Bed': 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&h=400&fit=crop',
    'Study Table': 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&h=400&fit=crop',
    'Dining Table': 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400&h=400&fit=crop',
    'Wardrobe': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
    'Office Chair': 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400&h=400&fit=crop',
    'Bookshelf': 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=400&h=400&fit=crop',
    'TV Unit': 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400&h=400&fit=crop',
    
    // Books
    'Fiction': 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=400&fit=crop',
    'Self-Help': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=400&fit=crop',
    'Technology': 'https://images.unsplash.com/photo-1516414447565-b14be0adf13e?w=400&h=400&fit=crop',
    'Biography': 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400&h=400&fit=crop',
    'Children': 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=400&fit=crop',
    'Cookbook': 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=400&h=400&fit=crop',
    'Business': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    
    // Toys
    'Building Blocks': 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400&h=400&fit=crop',
    'Action Figure': 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400&h=400&fit=crop',
    'Board Game': 'https://images.unsplash.com/photo-1606167668584-78701c57f13d?w=400&h=400&fit=crop',
    'Doll': 'https://images.unsplash.com/photo-1582150953407-c6f6a26e1e5c?w=400&h=400&fit=crop',
    'Remote Control': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
    'Puzzle': 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400&h=400&fit=crop',
    'Soft Toy': 'https://images.unsplash.com/photo-1530325553241-4f6e7690cf36?w=400&h=400&fit=crop',
    
    // Automotive
    'Car Battery': 'https://images.unsplash.com/photo-1627997289293-4c87e5f49bb8?w=400&h=400&fit=crop',
    'Tyre': 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=400&h=400&fit=crop',
    'Car Care Kit': 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=400&h=400&fit=crop',
    'LED Lights': 'https://images.unsplash.com/photo-1621905081176-cbc8bf952ff7?w=400&h=400&fit=crop',
    'Seat Cover': 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=400&fit=crop',
    'Air Freshener': 'https://images.unsplash.com/photo-1582719471896-e3c7c6620c4f?w=400&h=400&fit=crop',
    'Dashboard Cam': 'https://images.unsplash.com/photo-1624706825317-4fcdc45f4bb6?w=400&h=400&fit=crop'
  };
  const imageUrl = imageMap[template.type] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop';
  
  // Product URL
  const urlSuffix = sku.toLowerCase().replace(/[^a-z0-9]/g, '');
  const url = source === 'amazon' 
    ? `https://www.amazon.in/dp/${urlSuffix}`
    : `https://www.flipkart.com/product/p/itm${urlSuffix}`;
  
  // Availability (95% in stock)
  const inStock = Math.random() > 0.05;
  
  return {
    sku,
    productId: sku,
    title,
    category,
    brand,
    description: template.desc + ' from ' + brand,
    // Image fields according to Product schema
    images: [
      {
        url: imageUrl,
        alt: title
      }
    ],
    imageThumb: imageUrl,
    imageLarge: imageUrl,
    imageQuality: 'good',
    // Provider information according to schema
    providers: [
      {
        name: source,
        productId: sku,
        url: url,
        price: {
          current: price,
          original: Math.round(price * randomInRange(1.0, 1.3)),
          discount: 0
        },
        availability: inStock ? 'in_stock' : 'out_of_stock',
        rating: rating,
        reviewCount: reviewsCount,
        shipping: {
          cost: 0,
          estimatedDays: randomInt(2, 7),
          isFree: true
        }
      }
    ],
    // Legacy fields for compatibility
    provider: source,
    inStock,
    availability: inStock ? 'In Stock' : 'Out of Stock',
    price: {
      currency: 'INR',
      current: price,
      original: Math.round(price * randomInRange(1.0, 1.3)),
      discount: 0
    },
    rating,
    reviewCount: reviewsCount,
    url,
    features: [
      `Genuine ${brand} product`,
      'Fast delivery available',
      inStock ? 'In stock and ready to ship' : 'Currently out of stock',
      `${reviewsCount} customer reviews`,
      source === 'flipkart' ? 'Cash on Delivery available' : 'Free shipping eligible'
    ],
    tags: [category.toLowerCase(), brand.toLowerCase(), template.type.toLowerCase()],
    keywords: [category, brand, template.type],
    metadata: {
      source,
      createdAt: new Date(),
      lastUpdated: new Date()
    }
  };
}

// Main function to generate all products
async function generateAllProducts() {
  const products = [];
  const categories = Object.keys(PRODUCT_TEMPLATES);
  const productsPerCategory = Math.ceil(5000 / categories.length);
  
  console.log(`Generating ${productsPerCategory} products per category...`);
  console.log(`Total categories: ${categories.length}`);
  console.log(`Target total: ${productsPerCategory * categories.length} products\n`);
  
  for (const category of categories) {
    const templates = PRODUCT_TEMPLATES[category];
    const brands = BRANDS[category];
    let categoryCount = 0;
    
    console.log(`Generating ${category}...`);
    
    for (let i = 0; i < productsPerCategory; i++) {
      const template = randomPick(templates);
      const brand = randomPick(brands);
      const source = Math.random() > 0.5 ? 'amazon' : 'flipkart';
      
      const product = generateProduct(category, template, brand, source);
      
      // Calculate actual discount
      product.price.discount = product.price.original - product.price.current;
      
      products.push(product);
      categoryCount++;
    }
    
    console.log(`✓ Generated ${categoryCount} ${category} products`);
  }
  
  console.log(`\n✓ Total products generated: ${products.length}`);
  return products;
}

// Seed database
async function seedDatabase() {
  try {
    console.log('========================================');
    console.log('  NexBuy Product Seeding Script');
    console.log('========================================\n');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexbuy';
    console.log(`Connecting to MongoDB: ${mongoUri}`);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✓ Connected to MongoDB\n');
    
    // Clear existing products
    console.log('Clearing existing products...');
    const deleteResult = await Product.deleteMany({});
    console.log(`✓ Deleted ${deleteResult.deletedCount} existing products\n`);
    
    // Generate products
    console.log('Generating products...\n');
    const products = await generateAllProducts();
    
    // Insert products in batches (for better performance)
    console.log('\nInserting products into database...');
    const batchSize = 500;
    let inserted = 0;
    
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      await Product.insertMany(batch);
      inserted += batch.length;
      process.stdout.write(`\rInserted: ${inserted}/${products.length} products`);
    }
    
    console.log('\n✓ All products inserted successfully!\n');
    
    // Create indexes for better performance
    console.log('Creating database indexes...');
    await Product.createIndexes();
    console.log('✓ Indexes created\n');
    
    // Statistics
    console.log('========================================');
    console.log('  Database Statistics');
    console.log('========================================\n');
    
    const totalCount = await Product.countDocuments();
    console.log(`Total Products: ${totalCount}`);
    
    const categories = await Product.distinct('category');
    console.log(`\nProducts by Category:`);
    for (const category of categories) {
      const count = await Product.countDocuments({ category });
      const amazonCount = await Product.countDocuments({ category, provider: 'amazon' });
      const flipkartCount = await Product.countDocuments({ category, provider: 'flipkart' });
      console.log(`  ${category}: ${count} (Amazon: ${amazonCount}, Flipkart: ${flipkartCount})`);
    }
    
    const amazonTotal = await Product.countDocuments({ provider: 'amazon' });
    const flipkartTotal = await Product.countDocuments({ provider: 'flipkart' });
    console.log(`\nSource Distribution:`);
    console.log(`  Amazon: ${amazonTotal} (${(amazonTotal/totalCount*100).toFixed(1)}%)`);
    console.log(`  Flipkart: ${flipkartTotal} (${(flipkartTotal/totalCount*100).toFixed(1)}%)`);
    
    const avgPrice = await Product.aggregate([
      { $group: { _id: null, avgPrice: { $avg: '$price.current' } } }
    ]);
    console.log(`\nAverage Price: ₹${Math.round(avgPrice[0]?.avgPrice || 0)}`);
    
    const avgRating = await Product.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);
    console.log(`Average Rating: ${(avgRating[0]?.avgRating || 0).toFixed(2)} ⭐`);
    
    const inStockCount = await Product.countDocuments({ inStock: true });
    console.log(`In Stock: ${inStockCount} (${(inStockCount/totalCount*100).toFixed(1)}%)`);
    
    console.log('\n========================================');
    console.log('  Seeding Complete! ✓');
    console.log('========================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the script
seedDatabase();
