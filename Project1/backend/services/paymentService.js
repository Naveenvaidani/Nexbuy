const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Create payment intent
 */
exports.createPaymentIntent = async ({ amount, currency, orderId, customerId }) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency || 'inr',
      metadata: {
        orderId: orderId.toString(),
        customerId: customerId.toString()
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error('Payment intent creation error:', error);
    throw error;
  }
};

/**
 * Confirm payment
 */
exports.confirmPayment = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Payment confirmation error:', error);
    throw error;
  }
};

/**
 * Create refund
 */
exports.createRefund = async (paymentIntentId, amount) => {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined
    });

    return refund;
  } catch (error) {
    console.error('Refund creation error:', error);
    throw error;
  }
};

/**
 * Verify webhook signature
 */
exports.verifyWebhookSignature = (payload, signature) => {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    return event;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw error;
  }
};
