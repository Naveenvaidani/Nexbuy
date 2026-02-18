const BaseProvider = require('./BaseProvider');
const Product = require('../models/Product');

/**
 * Mock Provider - Uses seeded database products
 * This provider is used when DATA_PROVIDER_MODE=mock
 */

class MockProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.name = config.providerName || 'mock'; // Can simulate 'amazon' or 'flipkart'
  }

  /**
   * Search for products in database
   */
  async search(query, options = {}) {
    try {
      const searchQuery = {
        isActive: true,
        $text: { $search: query }
      };

      // Add category filter
      if (options.category) {
        searchQuery.category = new RegExp(options.category, 'i');
      }

      // Add price range filter
      if (options.minPrice || options.maxPrice) {
        searchQuery['providers.price.current'] = {};
        if (options.minPrice) {
          searchQuery['providers.price.current'].$gte = options.minPrice;
        }
        if (options.maxPrice) {
          searchQuery['providers.price.current'].$lte = options.maxPrice;
        }
      }

      let products = await Product.find(searchQuery)
        .limit(options.limit || 10)
        .sort({ score: { $meta: 'textScore' } });

      // If $text returns no results (e.g., index not built), fallback to regex search
      if (!products || products.length === 0) {
        products = await Product.find({
          isActive: true,
          title: new RegExp(query, 'i')
        }).limit(options.limit || 10);
      }

      return products.map(product => this.normalizeProduct(product));
    } catch (error) {
      console.error('Mock search error:', error.message);
      // Fallback to simple search if text index doesn't exist
      try {
        const products = await Product.find({
          isActive: true,
          title: new RegExp(query, 'i')
        }).limit(options.limit || 10);
        
        return products.map(product => this.normalizeProduct(product));
      } catch (fallbackError) {
        console.error('Mock fallback search error:', fallbackError.message);
        return [];
      }
    }
  }

  /**
   * Get product details by SKU
   */
  async getProductDetails(productId) {
    try {
      const product = await Product.findOne({
        $or: [
          { sku: productId },
          { 'providers.productId': productId }
        ],
        isActive: true
      });

      if (!product) return null;

      return this.normalizeProduct(product);
    } catch (error) {
      console.error('Mock product details error:', error.message);
      return null;
    }
  }

  /**
   * Get products by IDs
   */
  async getProductsByIds(productIds) {
    try {
      const products = await Product.find({
        sku: { $in: productIds },
        isActive: true
      });

      return products.map(product => this.normalizeProduct(product));
    } catch (error) {
      console.error('Mock getProductsByIds error:', error.message);
      return [];
    }
  }

  /**
   * Get products by category
   */
  async getByCategory(category, options = {}) {
    try {
      const products = await Product.find({
        category: new RegExp(category, 'i'),
        isActive: true
      })
        .limit(options.limit || 10)
        .sort({ createdAt: -1 });

      return products.map(product => this.normalizeProduct(product));
    } catch (error) {
      console.error('Mock category error:', error.message);
      return [];
    }
  }

  /**
   * Search by image hash (for Lens feature)
   */
  async searchByImageHash(imageHash, options = {}) {
    try {
      const products = await Product.find({
        imageHash: { $exists: true },
        isActive: true
      }).limit(50); // Get more products for similarity comparison

      // Simple Hamming distance for image hash similarity
      const similarities = products.map(product => {
        const distance = this.hammingDistance(imageHash, product.imageHash);
        return {
          product,
          similarity: 1 - (distance / (imageHash.length * 4)) // Normalize to 0-1
        };
      });

      // Sort by similarity and return top matches
      const topMatches = similarities
        .filter(item => item.similarity > 0.7) // Threshold
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, options.limit || 10);

      return topMatches.map(item => ({
        ...this.normalizeProduct(item.product),
        similarity: item.similarity
      }));
    } catch (error) {
      console.error('Mock image search error:', error.message);
      return [];
    }
  }

  /**
   * Calculate Hamming distance between two hex strings
   */
  hammingDistance(hash1, hash2) {
    if (!hash1 || !hash2 || hash1.length !== hash2.length) return Infinity;
    
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) {
        distance++;
      }
    }
    return distance;
  }

  /**
   * Normalize database product to unified schema
   */
  normalizeProduct(product) {
    // Get provider data for this mock provider
    const providerData = product.providers?.find(p => p.name === this.name) || product.providers?.[0];

    if (!providerData) {
      // Return basic product info if no provider data
      return {
        provider: this.name,
        productId: product.sku,
        title: product.title,
        description: product.description,
        brand: product.brand,
        category: product.category,
        images: product.images || [],
        price: {
          current: 0,
          original: 0,
          discount: 0,
          currency: 'INR'
        },
        availability: 'out_of_stock',
        rating: 0,
        reviewCount: 0,
        url: '#',
        shipping: {
          isFree: false,
          estimatedDays: null
        }
      };
    }

    return {
      provider: this.name,
      productId: providerData.productId || product.sku,
      sku: product.sku,
      title: product.title,
      description: product.description,
      brand: product.brand,
      category: product.category,
      subcategory: product.subcategory,
      images: product.images || [],
      price: {
        current: providerData.price?.current || 0,
        original: providerData.price?.original || providerData.price?.current || 0,
        discount: providerData.price?.discount || 0,
        currency: 'INR'
      },
      availability: providerData.availability || 'in_stock',
      rating: providerData.rating || 0,
      reviewCount: providerData.reviewCount || 0,
      url: providerData.url || '#',
      shipping: {
        cost: providerData.shipping?.cost || 0,
        isFree: providerData.shipping?.isFree || false,
        estimatedDays: providerData.shipping?.estimatedDays || 5
      },
      seller: providerData.seller || 'NexBuy',
      specifications: product.specifications,
      sizes: product.sizes,
      colors: product.colors,
      tags: product.tags
    };
  }

  /**
   * Check availability
   */
  async checkAvailability(productId) {
    const product = await this.getProductDetails(productId);
    return {
      available: product?.availability === 'in_stock',
      stock: product?.availability || 'unknown'
    };
  }
}

module.exports = MockProvider;
