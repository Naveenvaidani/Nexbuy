const Order = require('../models/Order');
const Cart = require('../models/Cart');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const { createNotification } = require('../services/notificationService');
const { createPaymentIntent } = require('../services/paymentService');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res, next) => {
  try {
    const { shippingAddressId, paymentMethod, useWallet, useCoins } = req.body;

    // Get user cart
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Get user
    const user = await User.findById(req.user.id);

    // Get shipping address
    const shippingAddress = user.addresses.id(shippingAddressId);
    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address not found'
      });
    }

    // Calculate wallet and coins usage
    let walletUsed = 0;
    let coinsUsed = 0;
    let remainingAmount = cart.totals.total;

    if (useWallet && user.wallet.balance > 0) {
      walletUsed = Math.min(user.wallet.balance, remainingAmount);
      remainingAmount -= walletUsed;
    }

    if (useCoins && user.wallet.coins > 0) {
      const coinsValue = user.wallet.coins; // 1 coin = 1 rupee
      coinsUsed = Math.min(coinsValue, remainingAmount);
      remainingAmount -= coinsUsed;
    }

    // Create order
    const order = new Order({
      user: user._id,
      profileIndex: user.activeProfile,
      items: cart.items.map(item => ({
        product: item.product._id,
        provider: item.provider,
        title: item.product.title,
        image: item.product.images[0]?.url,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        price: item.price,
        total: item.price * item.quantity
      })),
      shippingAddress: {
        fullName: shippingAddress.fullName,
        phone: shippingAddress.phone,
        addressLine1: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        pincode: shippingAddress.pincode,
        country: shippingAddress.country
      },
      payment: {
        method: paymentMethod,
        status: 'pending'
      },
      totals: {
        ...cart.totals,
        walletUsed,
        coinsUsed,
        total: remainingAmount
      },
      appliedCoupons: cart.appliedCoupons,
      placedVia: req.body.placedVia || 'web'
    });

    await order.save();

    // Create payment intent if amount remaining
    if (remainingAmount > 0 && paymentMethod !== 'cod') {
      const paymentIntent = await createPaymentIntent({
        amount: remainingAmount,
        currency: 'inr',
        orderId: order._id,
        customerId: user._id
      });

      order.payment.paymentId = paymentIntent.id;
      await order.save();
    } else if (paymentMethod === 'cod' || remainingAmount === 0) {
      // Auto-confirm for COD or fully wallet-paid orders
      order.payment.status = 'completed';
      order.status = 'confirmed';
      order.updateStatus('confirmed', 'Order confirmed');
      await order.save();

      // Deduct wallet/coins
      if (walletUsed > 0) {
        user.wallet.balance -= walletUsed;
        await WalletTransaction.create({
          user: user._id,
          type: 'debit',
          amount: walletUsed,
          currency: 'wallet',
          reason: 'order_payment',
          relatedOrder: order._id,
          balanceBefore: user.wallet.balance + walletUsed,
          balanceAfter: user.wallet.balance
        });
      }

      if (coinsUsed > 0) {
        user.wallet.coins -= coinsUsed;
        await WalletTransaction.create({
          user: user._id,
          type: 'debit',
          amount: coinsUsed,
          currency: 'coins',
          reason: 'order_payment',
          relatedOrder: order._id,
          balanceBefore: user.wallet.coins + coinsUsed,
          balanceAfter: user.wallet.coins
        });
      }

      await user.save();

      // Clear cart
      cart.items = [];
      cart.appliedCoupons = [];
      await cart.save();

      // Create notification
      await createNotification(user._id, {
        type: 'order_confirmed',
        title: 'Order Confirmed',
        message: `Your order ${order.orderNumber} has been confirmed`,
        data: { orderId: order._id, orderNumber: order.orderNumber }
      });
    }

    res.status(201).json({
      success: true,
      order,
      paymentRequired: remainingAmount > 0 && paymentMethod !== 'cod'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res, next) => {
  try {
    const { status, limit, page } = req.query;

    const query = { user: req.user.id };
    if (status) {
      query.status = status;
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('items.product');

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('items.product');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel order
// @route   POST /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!['pending', 'confirmed', 'processing'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at this stage'
      });
    }

    order.updateStatus('cancelled', reason || 'Cancelled by user');
    await order.save();

    // Process refund
    const user = await User.findById(req.user.id);
    const refundAmount = order.totals.total + order.totals.walletUsed + order.totals.coinsUsed;

    // Refund to wallet
    user.wallet.balance += refundAmount;
    
    await WalletTransaction.create({
      user: user._id,
      type: 'credit',
      amount: refundAmount,
      currency: 'wallet',
      reason: 'refund',
      relatedOrder: order._id,
      balanceBefore: user.wallet.balance - refundAmount,
      balanceAfter: user.wallet.balance
    });

    await user.save();

    order.refund = {
      amount: refundAmount,
      method: 'wallet',
      processedAt: new Date(),
      reason
    };
    await order.save();

    // Create notification
    await createNotification(user._id, {
      type: 'order_cancelled',
      title: 'Order Cancelled',
      message: `Your order ${order.orderNumber} has been cancelled. Refund of ₹${refundAmount} has been credited to your wallet.`,
      data: { orderId: order._id, orderNumber: order.orderNumber, refundAmount }
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(req.user.id.toString()).emit('order:cancelled', { order });

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      order,
      refund: order.refund
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.updateStatus(status, note);
    await order.save();

    // Create notification based on status
    let notificationType = 'system';
    let title = 'Order Update';
    let message = `Your order ${order.orderNumber} status has been updated to ${status}`;

    if (status === 'shipped') {
      notificationType = 'order_shipped';
      title = 'Order Shipped';
      message = `Your order ${order.orderNumber} has been shipped`;
    } else if (status === 'delivered') {
      notificationType = 'order_delivered';
      title = 'Order Delivered';
      message = `Your order ${order.orderNumber} has been delivered`;
    }

    await createNotification(order.user, {
      type: notificationType,
      title,
      message,
      data: { orderId: order._id, orderNumber: order.orderNumber }
    });

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
};
