/**
 * LLM Chatbot Service - NexBuy
 * Implements product-grounded chatbot with no hallucination safeguards
 * Supports both local (GPT4All/Llama2) and hosted (OpenAI) providers
 */

const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const axios = require('axios');

// LLM Provider Configuration
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai'; // 'openai', 'gpt4all', 'llama2', 'mock'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-proj-test'; // Will use real key from .env
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'; // Use gpt-3.5-turbo for cost efficiency
const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL || 'http://localhost:4891/v1/chat/completions';

/**
 * System prompt for product-grounded responses
 */
const SYSTEM_PROMPT = `You are AURA, the intelligent shopping assistant for NexBuy - India's smartest e-commerce platform.

CRITICAL RULES (You MUST follow these):
1. NEVER make up product information. ONLY reference products from the provided database context.
2. ALWAYS include product SKU when recommending products (format: SKU: XXXX999).
3. If you don't have information about a product, admit it and offer to search the catalog.
4. For product recommendations, use this exact format: "[Product Name] (SKU: [SKU]) - ₹[Price]"
5. NEVER discuss payment card details in chat. Always redirect to secure checkout.
6. Use INR (₹) for all prices with Indian number formatting (e.g., ₹12,999 not ₹12999).
7. Be concise, helpful, and professional. Keep responses under 150 words unless detailed explanation is needed.
8. When user says "add to cart" after a product search, extract the SKU from recent context and confirm the action.

YOUR CAPABILITIES:
- Search products by category, brand, price range, specifications
- Recommend products based on user preferences and profile
- Compare products across Amazon, Flipkart, and other providers
- Highlight best deals, discounts, and price differences
- Help with cart management (add, remove, update quantities)
- Track orders and provide real-time status updates
- Explain offers, discounts, wallet benefits, and referral rewards
- Answer product specification questions from database
- Suggest similar or alternative products
- Answer general shopping questions (payment methods, shipping, returns, etc.)
- Provide customer support for NexBuy platform features

GENERAL SHOPPING KNOWLEDGE:
- Payment Methods: UPI, Credit/Debit Cards, Net Banking, Wallets, Cash on Delivery
- Shipping: Free shipping on orders above ₹500, Standard delivery 3-5 days, Express 1-2 days
- Returns: 7-day easy returns on most products, 30-day warranty on electronics
- Customer Support: Available 24/7 via chat, email (support@nexbuy.com), phone
- Wallet Benefits: Earn cashback on purchases, use wallet balance for discounts
- Referral Program: Invite friends and earn ₹100 per referral
- Voice Shopping: Use voice commands to search and add products
- Visual Search: Upload product images to find similar items
- Price Comparison: Automatically compare prices across Amazon and Flipkart
 - Cancellations: You can cancel before the order is shipped; instant refunds to original payment method
 - Exchanges: Eligible items can be exchanged within 7 days if tags and packaging are intact
 - Warranty: Manufacturer warranty applies to electronics; contact support for warranty claims
 - Coupons: One coupon per order; some items may be excluded from promotions
 - Price Match: If a better price is found on a supported retailer, we’ll highlight it automatically
 - Privacy: We never store card details; payments are processed via secure PCI-compliant gateways
 - Account Help: You can update address, phone, and payment preferences from Profile settings
 - Store Hours: The website runs 24/7; live chat support is always available

COMMON QUESTIONS YOU CAN ANSWER:
Q: "How do I track my order?"
A: You can track orders from the Orders page or by asking me for your order status.

Q: "What payment methods do you accept?"
A: We accept UPI, Credit/Debit Cards, Net Banking, Wallets, and Cash on Delivery.

Q: "How does the referral program work?"
A: Invite friends using your unique referral code. You earn ₹100 when they make their first purchase!

Q: "Can I return products?"
A: Yes! We offer 7-day easy returns on most products and 30-day warranty on electronics.

Q: "How do I use voice search?"
A: Click the microphone icon and speak your product query. I'll find what you're looking for!

Q: "What's your shipping policy?"
A: Free shipping on orders ₹500+. Standard delivery takes 3-5 days, Express 1-2 days.

Q: "How do I apply a coupon?"
A: During checkout, enter your coupon code in the 'Apply Coupon' field. I can also help you find available coupons!

Q: "Can I cancel my order?"
A: Yes, orders can be canceled before they are shipped. Go to Orders → select the order → Cancel. Refunds are processed instantly to the original payment method.

Q: "Do you offer warranty?"
A: Most electronics include manufacturer warranty. Keep your invoice; we’ll help you connect with the service center if needed.

Q: "What is NexBuy?"
A: NexBuy is India's smartest e-commerce platform with AI-powered shopping, voice search, visual search, and automatic price comparison across major retailers.

RESPONSE GUIDELINES:
- Use bullet points for product lists (max 5 products per response)
- Always provide 2-4 actionable next steps as suggested action chips
- Include confidence level when making recommendations (e.g., "Highly recommended" or "Based on your preferences")
- For price comparisons, show savings percentage: "Save 15% compared to Flipkart"
- When multiple products match, show top 3 and offer to see more
- Be conversational and friendly while maintaining professionalism
- If asked about features, explain clearly with examples
- For troubleshooting, provide step-by-step guidance

CONTEXT USAGE:
- User's cart items are in the context - reference them when relevant
- Recent search results are provided - use them for "add to cart" requests
- User's order history helps with personalized recommendations
- Respect user's price range preferences from their profile

SAFETY & PRIVACY:
- Never share or ask for sensitive information (passwords, CVV, OTP, etc.)
- Route all payment actions to secure checkout flow
- Respect user privacy and data protection regulations
- Don't make assumptions about user's financial situation

EXAMPLE INTERACTIONS:
User: "Show me iPhones under 50000"
You: "I found these iPhones within your budget:
• Apple iPhone 15 (SKU: ELEC002) - ₹49,999 (10% off)
• Apple iPhone 14 Plus (SKU: ELEC005) - ₹44,999 (Best deal!)

Would you like to compare prices or add one to cart?"

User: "Add the second one to cart"
You: "I'll add Apple iPhone 14 Plus (SKU: ELEC005) to your cart right away!"

User: "How do I return a product?"
You: "Returning a product is easy! Simply:
1. Go to Orders page
2. Select the item you want to return
3. Choose return reason
4. Schedule free pickup

We offer 7-day easy returns on most products. Need help with a specific order?"

User: "What is voice search?"
You: "Voice Search lets you shop hands-free! Just click the microphone icon in the navbar and speak naturally, like 'Find wireless headphones under 2000'. I'll search our entire catalog and show you the best matches. It's perfect for multitasking!"

User: "Tell me about NexBuy"
You: "NexBuy is India's most advanced e-commerce platform! We offer:
• Voice-powered shopping
• Visual search with camera
• AI price comparison (Amazon & Flipkart)
• Instant cashback & wallet rewards
• 24/7 customer support

With 50,000+ products and the best prices guaranteed, we make shopping smarter and faster!"

Remember: Your knowledge includes both the NexBuy product database AND general e-commerce/platform information. Be helpful for any shopping-related questions!`;

/**
 * Format product for LLM context
 */
function formatProductForContext(product) {
  // Handle both normalized and raw DB product formats
  const provider = product.providers?.[0] || {};
  const price = provider.price?.current || product.price?.current || 0;
  const originalPrice = provider.price?.original || product.price?.original || price;
  const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  
  return {
    sku: product.sku,
    title: product.title,
    brand: product.brand,
    category: product.category,
    priceINR: price,
    originalPriceINR: originalPrice,
    discountPercent: discount,
    rating: provider.rating || product.rating || 0,
    reviewsCount: provider.reviewCount || product.reviewCount || 0,
    stock: provider.availability || product.availability || 'in_stock',
    specifications: product.specifications,
    providers: product.providers?.map(p => ({
      name: p.name,
      priceINR: p.price?.current || 0,
      availability: p.availability || 'in_stock'
    }))
  };
}

/**
 * Search products based on query
 */
async function searchProductsForContext(query, limit = 10) {
  try {
    // Build search query
    const searchQuery = {
      isActive: true,
      $or: [
        { title: new RegExp(query, 'i') },
        { description: new RegExp(query, 'i') },
        { brand: new RegExp(query, 'i') },
        { category: new RegExp(query, 'i') },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    };
    
    const products = await Product.find(searchQuery)
      .limit(limit)
      .sort({ 'providers.rating': -1, 'providers.reviewCount': -1 })
      .lean();
    
    return products.map(formatProductForContext);
  } catch (error) {
    console.error('Product search error:', error);
    return [];
  }
}

/**
 * Extract filters from natural language query
 */
function extractFilters(query) {
  const filters = {};
  const queryLower = query.toLowerCase();
  
  // Extract category
  const categories = ['electronics', 'fashion', 'home', 'kitchen', 'books', 'toys', 'beauty', 'sports', 'fitness', 'groceries', 'furniture', 'automotive'];
  for (const cat of categories) {
    if (queryLower.includes(cat)) {
      filters.category = cat;
      break;
    }
  }
  
  // Extract brand
  const brandMatch = queryLower.match(/(?:from|by|brand)\s+([a-z]+)/i);
  if (brandMatch) {
    filters.brand = brandMatch[1];
  }
  
  // Extract price range
  const priceMatch = queryLower.match(/(?:under|below|less than|max|maximum)\s*₹?\s*(\d+)/i);
  if (priceMatch) {
    filters.maxPrice = parseInt(priceMatch[1]);
  }
  
  const minPriceMatch = queryLower.match(/(?:above|over|more than|min|minimum)\s*₹?\s*(\d+)/i);
  if (minPriceMatch) {
    filters.minPrice = parseInt(minPriceMatch[1]);
  }
  
  // Extract keywords (remove filter keywords)
  let keywords = query
    .replace(/(?:from|by|brand|under|below|less than|max|maximum|above|over|more than|min|minimum)\s+\S+/gi, '')
    .trim();
  
  if (keywords) {
    filters.keywords = keywords;
  }
  
  return filters;
}

/**
 * Get user context (cart, orders, preferences)
 */
async function getUserContext(userId, profileId) {
  // Handle guest users
  if (!userId || userId === 'guest') {
    return {
      cart: { itemCount: 0, items: [], totalINR: 0 },
      recentOrders: []
    };
  }
  
  try {
    const [cart, recentOrders] = await Promise.all([
      Cart.findOne({ user: userId }).populate('items.product').lean().catch(() => null),
      Order.find({ user: userId }).sort({ createdAt: -1 }).limit(5).lean().catch(() => [])
    ]);
    
    return {
      cart: cart ? {
        itemCount: cart.items?.length || 0,
        items: (cart.items || []).map(item => ({
          sku: item.product?.sku || 'UNKNOWN',
          title: item.product?.title || 'Unknown Product',
          quantity: item.quantity || 1,
          priceINR: item.product?.providers?.[0]?.price?.current || 0
        })),
        totalINR: cart.totals?.total || 0
      } : { itemCount: 0, items: [], totalINR: 0 },
      recentOrders: (recentOrders || []).map(order => ({
        orderId: order.orderNumber || order._id.toString(),
        status: order.status || 'unknown',
        totalINR: order.totals?.total || 0,
        date: order.createdAt
      }))
    };
  } catch (error) {
    console.error('User context error:', error);
    return {
      cart: { itemCount: 0, items: [], totalINR: 0 },
      recentOrders: []
    };
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(messages, streaming = false) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: OPENAI_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 500,
        stream: streaming
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    throw new Error('Failed to get response from OpenAI');
  }
}

/**
 * Call local LLM (GPT4All/Llama2)
 */
async function callLocalLLM(messages) {
  try {
    const response = await axios.post(
      LOCAL_LLM_URL,
      {
        messages,
        temperature: 0.7,
        max_tokens: 500
      },
      {
        timeout: 30000
      }
    );
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Local LLM error:', error.message);
    throw new Error('Failed to get response from local LLM');
  }
}

/**
 * Mock LLM for testing (pattern-based responses)
 */
function callMockLLM(messages, context) {
  const lastMessage = messages[messages.length - 1].content.toLowerCase();
  const searchResults = context.searchResults || [];
  
  // Greetings
  if (lastMessage.match(/^(hi|hello|hey|greetings|good morning|good afternoon|good evening)/)) {
    return {
      message: "Hello! I'm AURA, your NexBuy shopping assistant! 👋\n\nI can help you:\n• Search for products\n• Compare prices across platforms\n• Add items to cart\n• Track orders\n• Answer shopping questions\n\nWhat would you like to do today?",
      products: [],
      suggestedActions: [
        { label: 'Search Products', action: 'search', params: {} },
        { label: 'Browse Deals', action: 'navigate', params: { page: '/products.html' } },
        { label: 'View Cart', action: 'view_cart', params: {} }
      ]
    };
  }
  
  // Product search queries
  if (lastMessage.match(/\b(find|search|show|looking for|need|want)\b.*\b(phone|laptop|headphone|watch|speaker|camera|shoes|shirt|bag|bottle)\b/i)) {
    if (searchResults.length > 0) {
      const productsText = searchResults.slice(0, 5).map((p, i) => 
        `${i + 1}. ${p.title} (SKU: ${p.sku}) - ₹${p.priceINR.toLocaleString('en-IN')}${p.discountPercent > 0 ? ` (${p.discountPercent}% off)` : ''}`
      ).join('\n');
      
      return {
        message: `I found these products for you:\n\n${productsText}\n\nWould you like to add any to your cart or compare prices?`,
        products: searchResults.slice(0, 5),
        suggestedActions: [
          { label: 'Add First to Cart', action: 'add_to_cart', params: { sku: searchResults[0].sku } },
          { label: 'Compare Prices', action: 'compare', params: { skus: searchResults.slice(0, 3).map(p => p.sku) } },
          { label: 'View Details', action: 'view_product', params: { sku: searchResults[0].sku } }
        ]
      };
    } else {
      return {
        message: "I couldn't find any products matching your search. Could you try:\n• Being more specific (e.g., 'wireless headphones')\n• Using different keywords\n• Browsing our categories",
        products: [],
        suggestedActions: [
          { label: 'Browse All Products', action: 'navigate', params: { page: '/products.html' } }
        ]
      };
    }
  }
  
  // Add to cart commands
  if (lastMessage.match(/\b(add|put)\b.*(cart|basket)/i)) {
    const numberMatch = lastMessage.match(/\b(first|second|third|1st|2nd|3rd|one|two|three|1|2|3)\b/i);
    let index = 0;
    
    if (numberMatch) {
      const num = numberMatch[1].toLowerCase();
      if (num.includes('second') || num === '2nd' || num === 'two' || num === '2') index = 1;
      else if (num.includes('third') || num === '3rd' || num === 'three' || num === '3') index = 2;
    }
    
    if (searchResults.length > index) {
      const product = searchResults[index];
      return {
        message: `I'll add ${product.title} (₹${product.priceINR.toLocaleString('en-IN')}) to your cart right away!`,
        products: [product],
        suggestedActions: [
          { label: 'Add to Cart', action: 'add_to_cart', params: { sku: product.sku, quantity: 1 } },
          { label: 'View Cart', action: 'view_cart', params: {} },
          { label: 'Continue Shopping', action: 'navigate', params: { page: '/products.html' } }
        ]
      };
    } else {
      return {
        message: "Please search for a product first, then I can help you add it to cart!",
        products: [],
        suggestedActions: [
          { label: 'Search Products', action: 'search', params: {} }
        ]
      };
    }
  }
  
  // About NexBuy / What is NexBuy
  if (lastMessage.includes('what is nexbuy') || lastMessage.includes('about nexbuy') || lastMessage.includes('tell me about')) {
    return {
      message: "NexBuy is India's smartest e-commerce platform! 🚀\n\nKey Features:\n• AI-powered voice shopping\n• Visual search with camera\n• Automatic price comparison (Amazon & Flipkart)\n• Instant cashback & wallet rewards\n• 50,000+ products\n• 24/7 customer support\n\nWe make shopping smarter, faster, and more affordable!",
      suggestedActions: [
        { label: 'Start Shopping', action: 'navigate', params: { page: '/products.html' } },
        { label: 'How Voice Search Works', action: 'chat', params: { message: 'How does voice search work?' } },
        { label: 'Payment Methods', action: 'chat', params: { message: 'What payment methods do you accept?' } }
      ]
    };
  }
  
  // Payment methods
  if (lastMessage.includes('payment') || lastMessage.includes('pay') || lastMessage.includes('payment method')) {
    return {
      message: "We accept multiple payment methods for your convenience:\n\n💳 UPI (Google Pay, PhonePe, Paytm)\n💳 Credit/Debit Cards (Visa, Mastercard, RuPay)\n🏦 Net Banking (All major banks)\n👛 Digital Wallets (Paytm, Amazon Pay)\n💵 Cash on Delivery (COD)\n\nAll payments are 100% secure and encrypted!",
      suggestedActions: [
        { label: 'Start Shopping', action: 'navigate', params: { page: '/products.html' } },
        { label: 'Wallet Benefits', action: 'chat', params: { message: 'Tell me about wallet benefits' } }
      ]
    };
  }
  
  // Shipping / Delivery
  if (lastMessage.includes('ship') || lastMessage.includes('deliver') || lastMessage.includes('delivery time')) {
    return {
      message: "Our Shipping Policy:\n\n📦 Free Shipping on orders above ₹500\n🚚 Standard Delivery: 3-5 business days\n⚡ Express Delivery: 1-2 business days\n🌍 Pan-India delivery available\n📍 Real-time tracking for all orders\n\nWe partner with trusted couriers to ensure safe delivery!",
      suggestedActions: [
        { label: 'Track Order', action: 'navigate', params: { page: '/orders.html' } },
        { label: 'Browse Products', action: 'navigate', params: { page: '/products.html' } }
      ]
    };
  }
  
  // Returns / Refund
  if (lastMessage.includes('return') || lastMessage.includes('refund') || lastMessage.includes('exchange')) {
    return {
      message: "Easy Returns & Refunds:\n\n✅ 7-day easy returns on most products\n✅ 30-day warranty on electronics\n✅ Free pickup from your doorstep\n✅ Instant refund to original payment method\n\nTo return:\n1. Go to Orders page\n2. Select item to return\n3. Choose return reason\n4. Schedule free pickup\n\nNeed help with a specific order?",
      suggestedActions: [
        { label: 'View My Orders', action: 'navigate', params: { page: '/orders.html' } },
        { label: 'Contact Support', action: 'chat', params: { message: 'How do I contact support?' } }
      ]
    };
  }
  
  // Voice search / Voice shopping
  if (lastMessage.includes('voice search') || lastMessage.includes('voice shop') || lastMessage.includes('mic')) {
    return {
      message: "Voice Shopping Made Easy! 🎤\n\nHow to use:\n1. Click the microphone icon in the navbar\n2. Speak naturally (e.g., 'Find wireless headphones under 2000')\n3. I'll search our catalog instantly\n4. Add items to cart with voice commands\n\nIt's perfect for hands-free shopping while multitasking!",
      suggestedActions: [
        { label: 'Try Voice Search', action: 'voice_search', params: {} },
        { label: 'Browse Products', action: 'navigate', params: { page: '/products.html' } }
      ]
    };
  }
  
  // Visual search / Camera search
  if (lastMessage.includes('visual search') || lastMessage.includes('camera') || lastMessage.includes('image search') || lastMessage.includes('photo')) {
    return {
      message: "Visual Search - Shop What You See! 📸\n\nHow it works:\n1. Click the camera icon in navbar\n2. Upload or capture product image\n3. Our AI finds similar products\n4. Compare prices and buy!\n\nPerfect for finding products from photos or screenshots!",
      suggestedActions: [
        { label: 'Try Visual Search', action: 'visual_search', params: {} },
        { label: 'Browse Products', action: 'navigate', params: { page: '/products.html' } }
      ]
    };
  }
  
  // Wallet / Cashback / Rewards
  if (lastMessage.includes('wallet') || lastMessage.includes('cashback') || lastMessage.includes('reward')) {
    return {
      message: "NexBuy Wallet Benefits:\n\n💰 Earn cashback on every purchase\n💰 Use wallet balance for instant discounts\n💰 Get exclusive wallet-only deals\n💰 No minimum balance required\n💰 Instant crediting of cashback\n\nStart earning rewards with your first purchase!",
      suggestedActions: [
        { label: 'View My Wallet', action: 'navigate', params: { page: '/wallet.html' } },
        { label: 'Referral Program', action: 'chat', params: { message: 'Tell me about referral program' } }
      ]
    };
  }
  
  // Referral program
  if (lastMessage.includes('referral') || lastMessage.includes('refer') || lastMessage.includes('invite friend')) {
    return {
      message: "Referral Program - Earn Together! 🎁\n\nHow it works:\n1. Share your unique referral code\n2. Friend signs up and makes first purchase\n3. You both earn ₹100!\n\nNo limit on referrals - invite unlimited friends and keep earning!",
      suggestedActions: [
        { label: 'Get Referral Code', action: 'navigate', params: { page: '/profile.html' } },
        { label: 'View Wallet', action: 'navigate', params: { page: '/wallet.html' } }
      ]
    };
  }
  
  // Customer support / Contact
  if (lastMessage.includes('support') || lastMessage.includes('contact') || lastMessage.includes('help') || lastMessage.includes('customer care')) {
    return {
      message: "We're Here to Help! 24/7 Support 🤝\n\n📧 Email: support@nexbuy.com\n📞 Phone: 1800-123-4567 (Toll-free)\n💬 Live Chat: Available right here!\n⏰ Response Time: Under 2 hours\n\nYou can also ask me anything - I'm here to assist!",
      suggestedActions: [
        { label: 'Chat with Me', action: 'chat', params: {} },
        { label: 'Email Support', action: 'external', params: { url: 'mailto:support@nexbuy.com' } }
      ]
    };
  }
  
  // Coupons / Offers / Discounts
  if (lastMessage.includes('coupon') || lastMessage.includes('offer') || lastMessage.includes('discount') || lastMessage.includes('deal')) {
    return {
      message: "Current Offers & Coupons: 🎉\n\n🎁 WELCOME10 - 10% off on first order\n🎁 SAVE20 - ₹200 off on orders above ₹1000\n🎁 FREESHIP - Free shipping on all orders\n\nApply coupons at checkout for instant savings!\n\nNew deals added daily!",
      suggestedActions: [
        { label: 'Browse Deals', action: 'navigate', params: { page: '/products.html?sort=discount' } },
        { label: 'View Cart', action: 'view_cart', params: {} }
      ]
    };
  }
  
  // Price comparison
  if (lastMessage.includes('compare price') || lastMessage.includes('comparison') || lastMessage.includes('cheapest')) {
    return {
      message: "Price Comparison - Always Best Deals! 💰\n\nWe automatically compare prices across:\n• Amazon India\n• Flipkart\n• Other major retailers\n\nYou always see the lowest price with savings percentage highlighted!\n\nTry our Compare page to see price differences side-by-side.",
      suggestedActions: [
        { label: 'Compare Products', action: 'navigate', params: { page: '/compare.html' } },
        { label: 'Browse Products', action: 'navigate', params: { page: '/products.html' } }
      ]
    };
  }
  
  // Search for products
  if (lastMessage.includes('search') || lastMessage.includes('find') || lastMessage.includes('show') || lastMessage.includes('looking for')) {
    const products = context.searchResults || [];
    
    if (products.length === 0) {
      return {
        message: "I couldn't find any products matching that description. Could you provide more details like category, brand, or price range?\n\nExample queries:\n• 'Show laptops under 50000'\n• 'Find Samsung phones'\n• 'Wireless headphones with noise cancellation'",
        suggestedActions: [
          { label: 'Browse Electronics', action: 'navigate', params: { page: '/products.html?category=Electronics' } },
          { label: 'Browse Fashion', action: 'navigate', params: { page: '/products.html?category=Fashion' } },
          { label: 'View All Products', action: 'navigate', params: { page: '/products.html' } }
        ]
      };
    }
    
    const productList = products.slice(0, 5).map(p => 
      `• ${p.title} (SKU: ${p.sku}) - ₹${p.priceINR.toLocaleString('en-IN')} ${p.discountPercent > 0 ? `(${p.discountPercent}% off!)` : ''}`
    ).join('\n');
    
    return {
      message: `I found ${products.length} product(s) for you:\n\n${productList}\n\n${products.length > 5 ? `Showing top 5 results. ` : ''}Would you like to add any to your cart?`,
      products: products.slice(0, 5),
      suggestedActions: [
        { label: 'Add to Cart', action: 'add_to_cart', params: {} },
        { label: 'Compare Prices', action: 'compare', params: {} },
        { label: 'View Details', action: 'view_product', params: {} }
      ]
    };
  }
  
  // Add to cart
  if (lastMessage.includes('add') && lastMessage.includes('cart')) {
    const products = context.searchResults || [];
    
    // Try to extract SKU from message
    const skuMatch = lastMessage.match(/\b([A-Z]{4}\d{3})\b/i);
    if (skuMatch && skuMatch[1]) {
      const sku = skuMatch[1].toUpperCase();
      return {
        message: `I'll add ${sku} to your cart right away!`,
        suggestedActions: [
          { label: 'Add to Cart', action: 'add_to_cart', params: { sku } },
          { label: 'View Cart', action: 'view_cart', params: {} }
        ]
      };
    }
    
    // If recent search results, offer to add first product
    if (products.length > 0) {
      const firstProduct = products[0];
      return {
        message: `Would you like to add "${firstProduct.title}" to your cart?`,
        products: [firstProduct],
        suggestedActions: [
          { label: 'Add to Cart', action: 'add_to_cart', params: { sku: firstProduct.sku } },
          { label: 'Show More', action: 'search', params: {} }
        ]
      };
    }
    
    return {
      message: "I can help you add items to your cart! Please specify which product you'd like to add by its name or SKU number.",
      suggestedActions: [
        { label: 'Search Products', action: 'search', params: {} },
        { label: 'View Cart', action: 'view_cart', params: {} }
      ]
    };
  }
  
  // View cart
  if (lastMessage.includes('cart') && (lastMessage.includes('view') || lastMessage.includes('show') || lastMessage.includes('check'))) {
    const cart = context.userContext?.cart;
    
    if (!cart || cart.itemCount === 0) {
      return {
        message: "Your cart is currently empty. Let me help you find some great products!",
        suggestedActions: [
          { label: 'Browse Products', action: 'navigate', params: { page: '/products.html' } },
          { label: 'Search Products', action: 'search', params: {} }
        ]
      };
    }
    
    const cartItems = cart.items.map(item => 
      `• ${item.title} x${item.quantity} - ₹${item.priceINR.toLocaleString('en-IN')}`
    ).join('\n');
    
    return {
      message: `You have ${cart.itemCount} item(s) in your cart:\n\n${cartItems}\n\nTotal: ₹${cart.totalINR.toLocaleString('en-IN')}`,
      suggestedActions: [
        { label: 'Proceed to Checkout', action: 'checkout', params: {} },
        { label: 'Continue Shopping', action: 'navigate', params: { page: '/products.html' } },
        { label: 'Apply Coupon', action: 'apply_coupon', params: {} }
      ]
    };
  }
  
  // Track order
  if (lastMessage.includes('order') && (lastMessage.includes('track') || lastMessage.includes('status'))) {
    const orders = context.userContext?.recentOrders || [];
    
    if (orders.length === 0) {
      return {
        message: "You don't have any recent orders. Start shopping to place your first order!",
        suggestedActions: [
          { label: 'Browse Products', action: 'navigate', params: { page: '/products.html' } }
        ]
      };
    }
    
    const latestOrder = orders[0];
    return {
      message: `Your latest order (${latestOrder.orderId}) is ${latestOrder.status}. Total: ₹${latestOrder.totalINR.toLocaleString('en-IN')}`,
      suggestedActions: [
        { label: 'View Order Details', action: 'view_order', params: { orderId: latestOrder.orderId } },
        { label: 'View All Orders', action: 'navigate', params: { page: '/orders.html' } }
      ]
    };
  }
  
  // Help with Voice/Mic Issues
  if (lastMessage.includes('mic') || lastMessage.includes('microphone') || lastMessage.includes('voice') || lastMessage.includes('speak')) {
    return {
      message: "Having trouble with voice commands? 🎤\n\nTry these steps:\n1. Ensure your microphone is connected and allowed in browser settings.\n2. Click the microphone icon in the navbar.\n3. Speak clearly and naturally.\n\nTry saying: 'Find wireless headphones' or 'Show my cart'.",
      suggestedActions: [
        { label: 'Try Voice Search', action: 'voice_search', params: {} },
        { label: 'Text Chat Instead', action: 'chat', params: { message: 'I prefer typing' } }
      ]
    };
  }

  // Help with Chatbot Issues
  if (lastMessage.includes('bot') || lastMessage.includes('chat') || lastMessage.includes('not working') || lastMessage.includes('issue')) {
    return {
      message: "I'm here to help! 🤖\n\nIf I'm not understanding you correctly, try:\n• Using simple keywords (e.g., 'laptop', 'shoes')\n• Checking your internet connection\n• Refreshing the page\n\nYou can always browse products directly using the menu.",
      suggestedActions: [
        { label: 'Browse Products', action: 'navigate', params: { page: '/products.html' } },
        { label: 'Contact Support', action: 'chat', params: { message: 'Contact support' } }
      ]
    };
  }

  // Default response - handle any other question
  return {
    message: "I'm AURA, your NexBuy shopping assistant! 🛍️\n\nI can help you with:\n\n• Search for products\n• Compare prices across platforms\n• Add items to cart & checkout\n• Track your orders\n• Payment methods & shipping info\n• Returns & refunds policy\n• Coupons & special offers\n• Voice & visual search features\n• Wallet benefits & referrals\n\nWhat would you like to know?",
    suggestedActions: [
      { label: 'Search Products', action: 'search', params: {} },
      { label: 'View Offers', action: 'chat', params: { message: 'Show me current offers' } },
      { label: 'How to Shop', action: 'chat', params: { message: 'How does voice search work?' } },
      { label: 'Browse Products', action: 'navigate', params: { page: '/products.html' } }
    ]
  };
}

/**
 * Generate chatbot response
 */
async function generateChatResponse(userMessage, userId, profileId, conversationHistory = []) {
  try {
    console.log('[Chatbot] Processing message:', userMessage);
    console.log('[Chatbot] Using provider:', LLM_PROVIDER);
    console.log('[Chatbot] OpenAI key present:', !!OPENAI_API_KEY && OPENAI_API_KEY !== 'sk-proj-test');
    
    // Get user context
    const userContext = await getUserContext(userId, profileId);
    
    // Search for relevant products based on message
    const searchResults = await searchProductsForContext(userMessage, 10);
    console.log('[Chatbot] Found products:', searchResults.length);
    
    // Build context object
    const context = {
      userContext,
      searchResults,
      timestamp: new Date().toISOString()
    };
    
    // Build messages for LLM
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'system',
        content: `CONTEXT:\nUser Cart: ${JSON.stringify(userContext.cart)}\nSearch Results: ${JSON.stringify(searchResults.slice(0, 5))}\n\nUse this context to provide accurate, grounded responses.`
      },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];
    
    let response;
    
    switch (LLM_PROVIDER) {
      case 'openai':
        try {
          if (!OPENAI_API_KEY || OPENAI_API_KEY === 'sk-proj-test') {
            console.log('[Chatbot] OpenAI key not configured, falling back to mock LLM');
            response = callMockLLM(messages, context);
          } else {
            console.log('[Chatbot] Calling OpenAI API...');
            const llmResponse = await callOpenAI(messages);
            console.log('[Chatbot] OpenAI response received:', llmResponse.substring(0, 100));
            response = {
              message: llmResponse,
              products: searchResults.slice(0, 5),
              suggestedActions: extractActionsFromResponse(llmResponse, searchResults)
            };
          }
        } catch (error) {
          console.error('[Chatbot] OpenAI failed, using mock LLM:', error.message);
          response = callMockLLM(messages, context);
        }
        break;
        
      case 'gpt4all':
      case 'llama2':
        const localResponse = await callLocalLLM(messages);
        response = {
          message: localResponse,
          products: searchResults.slice(0, 5),
          suggestedActions: extractActionsFromResponse(localResponse, searchResults)
        };
        break;
        
      case 'mock':
      default:
        console.log('[Chatbot] Using mock LLM');
        response = callMockLLM(messages, context);
        console.log('[Chatbot] Mock response:', response.message?.substring(0, 100));
        break;
    }
    
    // Add metadata
    response.metadata = {
      provider: LLM_PROVIDER,
      productsFound: searchResults.length,
      timestamp: new Date().toISOString()
    };
    
    return response;
  } catch (error) {
    console.error('Chatbot error:', error);
    
    // Fallback response
    return {
      message: "I'm having trouble processing your request right now. Please try again or use the search bar to find products.",
      error: error.message,
      suggestedActions: [
        { label: 'Try Again', action: 'retry', params: {} },
        { label: 'Browse Products', action: 'navigate', params: { page: '/products.html' } }
      ]
    };
  }
}

/**
 * Extract suggested actions from LLM response
 */
function extractActionsFromResponse(response, products) {
  const actions = [];
  
  // Common actions based on response content
  if (response.toLowerCase().includes('add to cart') || response.toLowerCase().includes('checkout')) {
    actions.push({ label: 'View Cart', action: 'view_cart', params: {} });
  }
  
  if (products && products.length > 0) {
    actions.push({ label: 'Compare Prices', action: 'compare', params: { skus: products.slice(0, 3).map(p => p.sku) } });
    actions.push({ label: 'View Details', action: 'view_product', params: { sku: products[0].sku } });
  }
  
  if (response.toLowerCase().includes('order') || response.toLowerCase().includes('track')) {
    actions.push({ label: 'View Orders', action: 'navigate', params: { page: '/orders.html' } });
  }
  
  // Always provide search option
  actions.push({ label: 'Search Products', action: 'search', params: {} });
  
  return actions;
}

module.exports = {
  generateChatResponse,
  searchProductsForContext,
  getUserContext
};
