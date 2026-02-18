const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
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
      enum: ['amazon', 'flipkart', 'internal']
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    priceWhenAdded: Number,
    notifyOnPriceDrop: {
      type: Boolean,
      default: true
    },
    targetPrice: Number // Notify when price drops to this
  }]
}, {
  timestamps: true
});

// Prevent duplicate items
wishlistSchema.index({ user: 1, 'items.product': 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);
