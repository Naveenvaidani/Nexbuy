const providerFactory = require('../providers/ProviderFactory');
const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const Order = require('../models/Order');
const Product = require('../models/Product');
const chatbotService = require('../services/chatbotService');

// @desc    Process voice command from user
// @route   POST /api/assistant/voice
// @access  Private
exports.processVoiceCommand = async (req, res, next) => {
  try {
    const { transcript, command } = req.body;

    if (!transcript && !command) {
      return res.status(400).json({
        success: false,
        message: 'Voice transcript or command required'
      });
    }

    const text = transcript || command;
    const parsedCommand = parseVoiceCommand(text);

    let response;

    switch (parsedCommand.intent) {
      case 'search':
        response = await handleSearch(parsedCommand, req.user);
        break;
      case 'add_to_cart':
        response = await handleAddToCart(parsedCommand, req.user);
        break;
      case 'remove_from_cart':
        response = await handleRemoveFromCart(parsedCommand, req.user);
        break;
      case 'view_cart':
        response = await handleViewCart(req.user);
        break;
      case 'checkout':
        response = await handleCheckout(parsedCommand, req.user);
        break;
      case 'apply_coupon':
        response = await handleApplyCoupon(parsedCommand, req.user);
        break;
      case 'view_wishlist':
        response = await handleViewWishlist(req.user);
        break;
      case 'compare':
        response = await handleCompare(parsedCommand, req.user);
        break;
      case 'switch_profile':
        response = await handleSwitchProfile(parsedCommand, req.user);
        break;
      case 'track_order':
        response = await handleTrackOrder(parsedCommand, req.user);
        break;
      default:
        response = {
          message: "I'm sorry, I didn't understand that command. Can you please rephrase?",
          suggestions: [
            'Search for products',
            'Add to cart',
            'View cart',
            'Checkout',
            'View wishlist'
          ]
        };
    }

    res.status(200).json({
      success: true,
      command: parsedCommand,
      response,
      speech: response.message
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Chat with assistant (LLM-powered chatbot)
// @route   POST /api/assistant/chat
// @access  Public (with optional auth)
exports.chatWithAssistant = async (req, res, next) => {
  try {
    const { message, conversationHistory = [], streaming = false } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Handle both authenticated and guest users
    const userId = req.user?.id || 'guest';
    const activeProfileId = req.user?.activeProfileId || req.user?.profiles?.[0]?.id || null;
    
    // Generate chatbot response using LLM service
    const chatResponse = await chatbotService.generateChatResponse(
      message,
      userId,
      activeProfileId,
      conversationHistory
    );

    res.status(200).json({
      success: true,
      response: chatResponse, // include full object with message/products/actions
      products: chatResponse.products || [],
      suggestedActions: chatResponse.suggestedActions || [],
      metadata: chatResponse.metadata || {},
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Execute confirmed action
// @route   POST /api/assistant/action
// @access  Private
exports.executeAction = async (req, res, next) => {
  try {
    const { action, params } = req.body;

    let result;

    switch (action) {
      case 'add_to_cart':
        result = await addProductToCart(params.productId, params.quantity, req.user);
        break;
      case 'place_order':
        result = await placeOrder(params, req.user);
        break;
      case 'apply_coupon':
        result = await applyCoupon(params.couponCode, req.user);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Parse voice command to extract intent and entities
 */
function parseVoiceCommand(text) {
  const lowerText = text.toLowerCase();

  // Search intent
  if (lowerText.includes('search') || lowerText.includes('find') || lowerText.includes('show me')) {
    const query = extractSearchQuery(lowerText);
    return { intent: 'search', query };
  }

  // Add to cart
  if (lowerText.includes('add to cart') || lowerText.includes('add this') || lowerText.includes('buy this')) {
    const itemNumber = extractItemNumber(lowerText);
    const quantity = extractQuantity(lowerText);
    return { intent: 'add_to_cart', itemNumber, quantity };
  }

  // Remove from cart
  if (lowerText.includes('remove') && lowerText.includes('cart')) {
    const itemNumber = extractItemNumber(lowerText);
    return { intent: 'remove_from_cart', itemNumber };
  }

  // View cart
  if (lowerText.includes('cart') || lowerText.includes('basket')) {
    return { intent: 'view_cart' };
  }

  // Checkout
  if (lowerText.includes('checkout') || lowerText.includes('place order') || lowerText.includes('complete purchase')) {
    return { intent: 'checkout' };
  }

  // Apply coupon
  if (lowerText.includes('coupon') || lowerText.includes('promo code') || lowerText.includes('discount code')) {
    const code = extractCouponCode(lowerText);
    return { intent: 'apply_coupon', code };
  }

  // Wishlist
  if (lowerText.includes('wishlist') || lowerText.includes('favorites')) {
    return { intent: 'view_wishlist' };
  }

  // Compare
  if (lowerText.includes('compare')) {
    const query = extractSearchQuery(lowerText);
    return { intent: 'compare', query };
  }

  // Switch profile
  if (lowerText.includes('switch profile') || lowerText.includes('change profile')) {
    const profileName = extractProfileName(lowerText);
    return { intent: 'switch_profile', profileName };
  }

  // Track order
  if (lowerText.includes('track') || lowerText.includes('order status')) {
    const orderNumber = extractOrderNumber(lowerText);
    return { intent: 'track_order', orderNumber };
  }

  return { intent: 'unknown', text };
}

function extractSearchQuery(text) {
  const patterns = [
    /search (?:for )?(.+)/i,
    /find (.+)/i,
    /show me (.+)/i,
    /looking for (.+)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }

  return text;
}

function extractItemNumber(text) {
  const match = text.match(/(\d+)(?:st|nd|rd|th)?\s+(?:item|product|one)/i);
  return match ? parseInt(match[1]) : 1;
}

function extractQuantity(text) {
  const match = text.match(/(\d+)\s+(?:pieces?|items?|units?)/i);
  return match ? parseInt(match[1]) : 1;
}

function extractCouponCode(text) {
  const match = text.match(/code\s+(\w+)/i);
  return match ? match[1].toUpperCase() : null;
}

function extractProfileName(text) {
  const match = text.match(/(?:to|profile)\s+(\w+)/i);
  return match ? match[1] : null;
}

function extractOrderNumber(text) {
  const match = text.match(/NXB-[\w-]+/i);
  return match ? match[0] : null;
}

/**
 * Command handlers
 */

async function handleSearch(command, user) {
  const results = await providerFactory.searchAll(command.query, { limit: 5 });
  const allProducts = [];
  
  Object.keys(results).forEach(provider => {
    allProducts.push(...results[provider]);
  });

  return {
    message: `I found ${allProducts.length} products matching "${command.query}". Would you like me to show you the details?`,
    data: { products: allProducts.slice(0, 5) },
    requiresConfirmation: false
  };
}

async function handleAddToCart(command, user) {
  return {
    message: `Do you want to add item ${command.itemNumber} to your cart?`,
    data: { itemNumber: command.itemNumber, quantity: command.quantity },
    requiresConfirmation: true,
    action: 'add_to_cart'
  };
}

async function handleRemoveFromCart(command, user) {
  return {
    message: `Do you want to remove item ${command.itemNumber} from your cart?`,
    data: { itemNumber: command.itemNumber },
    requiresConfirmation: true,
    action: 'remove_from_cart'
  };
}

async function handleViewCart(user) {
  const cart = await Cart.findOne({ user: user.id }).populate('items.product');
  
  if (!cart || cart.items.length === 0) {
    return {
      message: 'Your cart is empty. Would you like to search for products?',
      data: { cart: null }
    };
  }

  return {
    message: `You have ${cart.items.length} items in your cart with a total of ${cart.totals.total} rupees.`,
    data: { cart }
  };
}

async function handleCheckout(command, user) {
  const cart = await Cart.findOne({ user: user.id });
  
  if (!cart || cart.items.length === 0) {
    return {
      message: 'Your cart is empty. Please add items before checkout.',
      data: null
    };
  }

  return {
    message: `Your total is ${cart.totals.total} rupees. Do you want to proceed with the payment?`,
    data: { cart },
    requiresConfirmation: true,
    action: 'place_order'
  };
}

async function handleApplyCoupon(command, user) {
  if (!command.code) {
    return {
      message: 'Please provide a coupon code.',
      data: null
    };
  }

  return {
    message: `Applying coupon code ${command.code}...`,
    data: { code: command.code },
    requiresConfirmation: true,
    action: 'apply_coupon'
  };
}

async function handleViewWishlist(user) {
  const wishlist = await Wishlist.findOne({ user: user.id }).populate('items.product');
  
  if (!wishlist || wishlist.items.length === 0) {
    return {
      message: 'Your wishlist is empty.',
      data: { wishlist: null }
    };
  }

  return {
    message: `You have ${wishlist.items.length} items in your wishlist.`,
    data: { wishlist }
  };
}

async function handleCompare(command, user) {
  const comparison = await providerFactory.compareProduct(command.query);
  
  return {
    message: `Here's a comparison of "${command.query}" across different sellers. The best deal is ${comparison[0]?.price.current} rupees from ${comparison[0]?.provider}.`,
    data: { comparison }
  };
}

async function handleSwitchProfile(command, user) {
  return {
    message: `Switching to ${command.profileName} profile...`,
    data: { profileName: command.profileName },
    requiresConfirmation: true,
    action: 'switch_profile'
  };
}

async function handleTrackOrder(command, user) {
  if (!command.orderNumber) {
    const recentOrders = await Order.find({ user: user.id })
      .sort({ createdAt: -1 })
      .limit(3);
    
    return {
      message: 'Which order would you like to track?',
      data: { orders: recentOrders }
    };
  }

  const order = await Order.findOne({ 
    orderNumber: command.orderNumber,
    user: user.id 
  });

  if (!order) {
    return {
      message: 'Order not found.',
      data: null
    };
  }

  return {
    message: `Your order ${order.orderNumber} is currently ${order.status}.`,
    data: { order }
  };
}

/**
 * Action executors
 */

async function addProductToCart(productId, quantity, user) {
  // Implementation will be in cart controller
  return { success: true, message: 'Product added to cart' };
}

async function placeOrder(params, user) {
  // Implementation will be in order controller
  return { success: true, message: 'Order placed successfully' };
}

async function applyCoupon(code, user) {
  // Implementation will be in cart controller
  return { success: true, message: 'Coupon applied' };
}
