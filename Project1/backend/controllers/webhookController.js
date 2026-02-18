const Order = require('../models/Order');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const { verifyWebhookSignature } = require('../services/paymentService');
const { createNotification } = require('../services/notificationService');

// @desc    Handle Stripe webhook events
// @route   POST /api/webhooks/stripe
// @access  Public (but verified)
exports.handleStripeWebhook = async (req, res, next) => {
  const signature = req.headers['stripe-signature'];

  try {
    const event = verifyWebhookSignature(req.body, signature);

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(paymentIntent) {
  const { orderId, customerId } = paymentIntent.metadata;

  const order = await Order.findById(orderId);
  if (!order) {
    console.error('Order not found for payment intent:', paymentIntent.id);
    return;
  }

  // Update order
  order.payment.status = 'completed';
  order.payment.paidAt = new Date();
  order.payment.transactionId = paymentIntent.id;
  order.status = 'confirmed';
  order.updateStatus('confirmed', 'Payment received');

  await order.save();

  // Deduct wallet/coins if used
  if (order.totals.walletUsed > 0 || order.totals.coinsUsed > 0) {
    const user = await User.findById(customerId);

    if (order.totals.walletUsed > 0) {
      user.wallet.balance -= order.totals.walletUsed;
      await WalletTransaction.create({
        user: user._id,
        type: 'debit',
        amount: order.totals.walletUsed,
        currency: 'wallet',
        reason: 'order_payment',
        relatedOrder: order._id,
        balanceBefore: user.wallet.balance + order.totals.walletUsed,
        balanceAfter: user.wallet.balance
      });
    }

    if (order.totals.coinsUsed > 0) {
      user.wallet.coins -= order.totals.coinsUsed;
      await WalletTransaction.create({
        user: user._id,
        type: 'debit',
        amount: order.totals.coinsUsed,
        currency: 'coins',
        reason: 'order_payment',
        relatedOrder: order._id,
        balanceBefore: user.wallet.coins + order.totals.coinsUsed,
        balanceAfter: user.wallet.coins
      });
    }

    await user.save();
  }

  // Create notification
  await createNotification(order.user, {
    type: 'order_confirmed',
    title: 'Order Confirmed',
    message: `Your order ${order.orderNumber} has been confirmed`,
    data: { orderId: order._id, orderNumber: order.orderNumber },
    action: {
      type: 'view_order',
      label: 'View Order'
    }
  });

  console.log('Payment successful for order:', order.orderNumber);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(paymentIntent) {
  const { orderId } = paymentIntent.metadata;

  const order = await Order.findById(orderId);
  if (!order) {
    console.error('Order not found for payment intent:', paymentIntent.id);
    return;
  }

  order.payment.status = 'failed';
  await order.save();

  // Create notification
  await createNotification(order.user, {
    type: 'system',
    title: 'Payment Failed',
    message: `Payment for order ${order.orderNumber} failed. Please try again.`,
    data: { orderId: order._id, orderNumber: order.orderNumber },
    priority: 'high'
  });

  console.log('Payment failed for order:', order.orderNumber);
}

/**
 * Handle refund
 */
async function handleRefund(charge) {
  console.log('Refund processed:', charge.id);
  // Additional refund handling if needed
}
