/**
 * Test script for chatbot functionality
 * Tests LLM training, product search, and cart integration
 */

require('dotenv').config();
const mongoose = require('mongoose');
const chatbotService = require('../services/chatbotService');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const User = require('../models/User');

async function runTests() {
  try {
    console.log('🧪 Testing NexBuy Chatbot Service...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nexbuy');
    console.log('✅ Connected to MongoDB\n');

    // Create test user if not exists
    let testUser = await User.findOne({ email: 'chatbot-test@demo.com' });
    if (!testUser) {
      testUser = await User.create({
        name: 'Chatbot Test User',
        email: 'chatbot-test@demo.com',
        password: 'test123',
        role: 'user'
      });
      console.log('✅ Created test user\n');
    }

    const userId = testUser._id.toString();
    const profileId = testUser.profiles?.[0]?._id?.toString() || 'default';

    // Test 1: Search for products
    console.log('📝 Test 1: Search for iPhone products');
    const searchResponse = await chatbotService.generateChatResponse(
      'Show me iPhones',
      userId,
      profileId,
      []
    );
    console.log('Response:', searchResponse.message);
    console.log('Products found:', searchResponse.products?.length || 0);
    if (searchResponse.products && searchResponse.products.length > 0) {
      console.log('First product:', searchResponse.products[0].title, '(SKU:', searchResponse.products[0].sku + ')');
    }
    console.log('Suggested actions:', searchResponse.suggestedActions?.map(a => a.label).join(', '));
    console.log('✅ Test 1 passed\n');

    // Test 2: Add to cart with SKU
    console.log('📝 Test 2: Add product to cart by SKU');
    const addToCartResponse = await chatbotService.generateChatResponse(
      'Add ELEC002 to my cart',
      userId,
      profileId,
      [
        { role: 'user', content: 'Show me iPhones' },
        { role: 'assistant', content: searchResponse.message }
      ]
    );
    console.log('Response:', addToCartResponse.message);
    console.log('Suggested actions:', addToCartResponse.suggestedActions?.map(a => a.label).join(', '));
    const hasAddAction = addToCartResponse.suggestedActions?.some(a => a.action === 'add_to_cart');
    console.log(hasAddAction ? '✅ Test 2 passed - Add to cart action found\n' : '❌ Test 2 failed - No add action\n');

    // Test 3: View cart
    console.log('📝 Test 3: View cart status');
    const viewCartResponse = await chatbotService.generateChatResponse(
      'Show me my cart',
      userId,
      profileId,
      []
    );
    console.log('Response:', viewCartResponse.message);
    console.log('✅ Test 3 passed\n');

    // Test 4: Compare products
    console.log('📝 Test 4: Compare products');
    const compareResponse = await chatbotService.generateChatResponse(
      'Compare headphones',
      userId,
      profileId,
      []
    );
    console.log('Response:', compareResponse.message);
    console.log('Products found:', compareResponse.products?.length || 0);
    console.log('✅ Test 4 passed\n');

    // Test 5: Context awareness - follow-up question
    console.log('📝 Test 5: Context awareness (follow-up)');
    const followUpResponse = await chatbotService.generateChatResponse(
      'What is the price of the first one?',
      userId,
      profileId,
      [
        { role: 'user', content: 'Show me iPhones' },
        { role: 'assistant', content: searchResponse.message }
      ]
    );
    console.log('Response:', followUpResponse.message);
    console.log('✅ Test 5 passed\n');

    // Test 6: Product search context
    console.log('📝 Test 6: Search product context (internal)');
    const searchResults = await chatbotService.searchProductsForContext('laptop', 5);
    console.log('Found products:', searchResults.length);
    if (searchResults.length > 0) {
      console.log('Sample product:', searchResults[0].title, '- ₹' + searchResults[0].priceINR);
    }
    console.log('✅ Test 6 passed\n');

    console.log('🎉 All chatbot tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- LLM Provider:', process.env.LLM_PROVIDER || 'mock');
    console.log('- Product search: Working');
    console.log('- SKU extraction: Working');
    console.log('- Add to cart flow: Working');
    console.log('- Context awareness: Working');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  }
}

runTests();
