const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Unified product ID (internal)
  sku: {
    type: String,
    required: true,
    unique: true
  },
  
  // Product details
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  subcategory: String,
  brand: {
    type: String,
    index: true
  },
  
  // Images
  images: [{
    url: String,
    alt: String
  }],
  // Primary image variants and quality
  imageThumb: String,   // 300x400 (3:4)
  imageLarge: String,   // 900x1200 (3:4)
  imageQuality: {
    type: String,
    enum: ['unknown', 'good', 'poor'],
    default: 'unknown'
  },
  imageHash: String, // For visual search
  imageFeatures: [Number], // Feature vector for similarity search
  
  // Provider information
  providers: [{
    name: {
      type: String,
      enum: ['amazon', 'flipkart', 'internal'],
      required: true
    },
    productId: String, // Provider's product ID
    url: String,
    price: {
      current: Number,
      original: Number,
      discount: Number
    },
    availability: {
      type: String,
      enum: ['in_stock', 'out_of_stock', 'pre_order'],
      default: 'in_stock'
    },
    rating: Number,
    reviewCount: Number,
    seller: String,
    shipping: {
      cost: Number,
      estimatedDays: Number,
      isFree: Boolean
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Specifications
  specifications: {
    type: Map,
    of: String
  },
  
  // Size information
  sizes: [{
    label: String, // S, M, L, XL, 32, 34, etc.
    availability: Boolean,
    measurements: {
      length: Number,
      width: Number,
      height: Number,
      unit: String
    }
  }],
  
  // Colors
  colors: [{
    name: String,
    hex: String,
    images: [String]
  }],
  
  // SEO and search
  tags: [String],
  keywords: [String],
  
  // Analytics
  viewCount: {
    type: Number,
    default: 0
  },
  searchCount: {
    type: Number,
    default: 0
  },
  purchaseCount: {
    type: Number,
    default: 0
  },
  
  // Cache control
  cacheExpiry: {
    type: Date,
    index: true
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for search
productSchema.index({ title: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, brand: 1 });
productSchema.index({ 'providers.price.current': 1 });
productSchema.index({ 'providers.rating': 1 });
productSchema.index({ cacheExpiry: 1 }, { expireAfterSeconds: 0 });

// Get best price across providers
productSchema.methods.getBestPrice = function() {
  if (!this.providers || this.providers.length === 0) return null;
  
  return this.providers.reduce((best, current) => {
    if (!best || current.price.current < best.price.current) {
      return current;
    }
    return best;
  }, null);
};

// Get provider comparison
productSchema.methods.getComparison = function() {
  return this.providers.map(provider => ({
    provider: provider.name,
    price: provider.price.current,
    originalPrice: provider.price.original,
    discount: provider.price.discount,
    rating: provider.rating,
    reviewCount: provider.reviewCount,
    shipping: provider.shipping,
    url: provider.url,
    availability: provider.availability
  })).sort((a, b) => a.price - b.price);
};

module.exports = mongoose.model('Product', productSchema);
