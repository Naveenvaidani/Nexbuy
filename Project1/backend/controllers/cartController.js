const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const providerFactory = require('../providers/ProviderFactory');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate('items.product');

    if (!cart) {
      cart = await Cart.create({
        user: req.user.id,
        profileIndex: req.user.activeProfile || 0,
        items: []
      });
    }

    res.status(200).json({
      success: true,
      cart
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
exports.addToCart = async (req, res, next) => {
  try {
    const { productId, provider, quantity, size, color } = req.body;

    if (!productId || !provider) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and provider are required'
      });
    }

    // Get product details
    const product = await Product.findOne({
      $or: [
        { sku: productId },
        { 'providers.productId': productId }
      ]
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get price from provider
    const providerData = product.providers.find(p => p.name === provider);
    if (!providerData) {
      return res.status(400).json({
        success: false,
        message: 'Provider not available for this product'
      });
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      cart = new Cart({
        user: req.user.id,
        profileIndex: req.user.activeProfile || 0,
        items: []
      });
    }

    // Check if item already exists in cart
    const existingItem = cart.items.find(
      item => item.product.toString() === product._id.toString() &&
              item.provider === provider &&
              item.size === size &&
              item.color === color
    );

    if (existingItem) {
      existingItem.quantity += (quantity || 1);
    } else {
      cart.items.push({
        product: product._id,
        provider,
        quantity: quantity || 1,
        size,
        color,
        price: providerData.price.current,
        addedVia: req.body.addedVia || 'manual'
      });
    }

    await cart.save();
    await cart.populate('items.product');

    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.to(req.user.id.toString()).emit('cart:updated', { cart });

    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      cart
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/item/:itemId
// @access  Private
exports.updateCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    item.quantity = quantity;
    await cart.save();
    await cart.populate('items.product');

    res.status(200).json({
      success: true,
      message: 'Cart updated',
      cart
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/item/:itemId
// @access  Private
exports.removeFromCart = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.items.pull(itemId);
    await cart.save();
    await cart.populate('items.product');

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      cart
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart/clear
// @access  Private
exports.clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.items = [];
    cart.appliedCoupons = [];
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart cleared',
      cart
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Apply coupon to cart
// @route   POST /api/cart/coupon
// @access  Private
exports.applyCoupon = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required'
      });
    }

    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon || !coupon.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired coupon'
      });
    }

    // Check if already applied
    const alreadyApplied = cart.appliedCoupons.find(c => c.code === coupon.code);
    if (alreadyApplied) {
      return res.status(400).json({
        success: false,
        message: 'Coupon already applied'
      });
    }

    // Calculate discount
    const discount = coupon.calculateDiscount(cart.totals.subtotal);

    if (discount === 0) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase of ${coupon.minPurchase} required`
      });
    }

    cart.appliedCoupons.push({
      code: coupon.code,
      discount,
      appliedAt: new Date()
    });

    await cart.save();
    await cart.populate('items.product');

    res.status(200).json({
      success: true,
      message: `Coupon applied! You saved ${discount} rupees`,
      cart,
      discount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove coupon from cart
// @route   DELETE /api/cart/coupon/:code
// @access  Private
exports.removeCoupon = async (req, res, next) => {
  try {
    const { code } = req.params;

    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.appliedCoupons = cart.appliedCoupons.filter(c => c.code !== code.toUpperCase());
    await cart.save();
    await cart.populate('items.product');

    res.status(200).json({
      success: true,
      message: 'Coupon removed',
      cart
    });
  } catch (error) {
    next(error);
  }
};
