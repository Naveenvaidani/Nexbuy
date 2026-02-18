const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  profileIndex: {
    type: Number,
    default: 0
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    provider: {
      type: String,
      enum: ['amazon', 'flipkart', 'internal'],
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    size: String,
    color: String,
    price: {
      type: Number,
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    addedVia: {
      type: String,
      enum: ['manual', 'voice', 'lens'],
      default: 'manual'
    }
  }],
  totals: {
    subtotal: {
      type: Number,
      default: 0
    },
    shipping: {
      type: Number,
      default: 0
    },
    tax: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  appliedCoupons: [{
    code: String,
    discount: Number,
    appliedAt: Date
  }]
}, {
  timestamps: true
});

// Calculate totals before save
cartSchema.methods.calculateTotals = function() {
  const subtotal = this.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  const shipping = subtotal > 500 ? 0 : 50; // Free shipping above 500
  const tax = subtotal * 0.18; // 18% GST
  const discount = this.appliedCoupons.reduce((sum, coupon) => sum + coupon.discount, 0);
  const total = subtotal + shipping + tax - discount;

  this.totals = {
    subtotal: Math.round(subtotal * 100) / 100,
    shipping: Math.round(shipping * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    total: Math.round(total * 100) / 100
  };
};

// Auto-calculate totals before save
cartSchema.pre('save', function(next) {
  this.calculateTotals();
  next();
});

module.exports = mongoose.model('Cart', cartSchema);
