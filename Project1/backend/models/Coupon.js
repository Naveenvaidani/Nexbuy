const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed', 'free_shipping'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  minPurchase: {
    type: Number,
    default: 0
  },
  maxDiscount: {
    type: Number,
    default: null
  },
  usageLimit: {
    type: Number,
    default: null // null = unlimited
  },
  usedCount: {
    type: Number,
    default: 0
  },
  perUserLimit: {
    type: Number,
    default: 1
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: true
  },
  applicableCategories: [{
    type: String
  }],
  applicableProviders: [{
    type: String,
    enum: ['amazon', 'flipkart', 'internal']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isFirstTimeOnly: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Check if coupon is valid
couponSchema.methods.isValid = function() {
  const now = new Date();
  
  if (!this.isActive) return false;
  if (now < this.validFrom) return false;
  if (now > this.validUntil) return false;
  if (this.usageLimit && this.usedCount >= this.usageLimit) return false;
  
  return true;
};

// Calculate discount
couponSchema.methods.calculateDiscount = function(subtotal) {
  if (!this.isValid()) return 0;
  if (subtotal < this.minPurchase) return 0;

  let discount = 0;
  
  if (this.type === 'percentage') {
    discount = (subtotal * this.value) / 100;
    if (this.maxDiscount) {
      discount = Math.min(discount, this.maxDiscount);
    }
  } else if (this.type === 'fixed') {
    discount = this.value;
  }
  
  return Math.min(discount, subtotal);
};

module.exports = mongoose.model('Coupon', couponSchema);
