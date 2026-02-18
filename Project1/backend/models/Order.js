const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  profileIndex: Number,
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    provider: String,
    title: String,
    image: String,
    quantity: Number,
    size: String,
    color: String,
    price: Number,
    total: Number
  }],
  shippingAddress: {
    fullName: String,
    phone: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    country: String
  },
  payment: {
    method: {
      type: String,
      enum: ['card', 'upi', 'wallet', 'cod'],
      required: true
    },
    paymentId: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    paidAt: Date,
    transactionId: String
  },
  totals: {
    subtotal: Number,
    shipping: Number,
    tax: Number,
    discount: Number,
    walletUsed: { type: Number, default: 0 },
    coinsUsed: { type: Number, default: 0 },
    total: Number
  },
  appliedCoupons: [{
    code: String,
    discount: Number
  }],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  statusHistory: [{
    status: String,
    timestamp: Date,
    note: String
  }],
  tracking: {
    carrier: String,
    trackingNumber: String,
    trackingUrl: String,
    estimatedDelivery: Date
  },
  refund: {
    amount: Number,
    method: {
      type: String,
      enum: ['wallet', 'coins', 'original'],
      default: 'wallet'
    },
    processedAt: Date,
    reason: String
  },
  notes: String,
  placedVia: {
    type: String,
    enum: ['web', 'voice'],
    default: 'web'
  }
}, {
  timestamps: true
});

// Generate order number before save
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderNumber = `NXB-${timestamp}-${random}`;
  }
  next();
});

// Update status history
orderSchema.methods.updateStatus = function(newStatus, note = '') {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    note
  });
};

module.exports = mongoose.model('Order', orderSchema);
