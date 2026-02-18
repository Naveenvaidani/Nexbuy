const BaseProvider = require('./BaseProvider');
const axios = require('axios');

/**
 * Flipkart Affiliate API Provider
 * Documentation: https://affiliate.flipkart.com/api-docs
 */

class FlipkartProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.name = 'flipkart';
    this.affiliateId = config.affiliateId || process.env.FLIPKART_AFFILIATE_ID;
    this.affiliateToken = config.affiliateToken || process.env.FLIPKART_AFFILIATE_TOKEN;
    this.apiUrl = 'https://affiliate-api.flipkart.net/affiliate/api';
  }

  /**
   * Make API request to Flipkart Affiliate API
   */
  async makeRequest(endpoint, params = {}) {
    if (!this.affiliateId || !this.affiliateToken) {
      throw new Error('Flipkart API credentials not configured');
    }

    return this.withRateLimit(async () => {
      const response = await axios.get(`${this.apiUrl}/${endpoint}`, {
        params: {
          ...params,
          affid: this.affiliateId
        },
        headers: {
          'Fk-Affiliate-Id': this.affiliateId,
          'Fk-Affiliate-Token': this.affiliateToken,
        }
      });

      return response.data;
    });
  }

  /**
   * Search for products
   */
  async search(query, options = {}) {
    try {
      const params = {
        query: query,
        resultCount: options.limit || 10,
      };

      if (options.category) {
        params.category = options.category;
      }
      if (options.minPrice) {
        params.minPrice = options.minPrice;
      }
      if (options.maxPrice) {
        params.maxPrice = options.maxPrice;
      }

      const response = await this.makeRequest('product/search', params);
      
      if (response.products) {
        return response.products.map(product => this.normalizeProduct(product));
      }

      return [];
    } catch (error) {
      console.error('Flipkart search error:', error.message);
      return [];
    }
  }

  /**
   * Get product details
   */
  async getProductDetails(productId) {
    try {
      const response = await this.makeRequest(`product/${productId}`);
      
      if (response.productBaseInfo) {
        return this.normalizeProduct(response);
      }

      return null;
    } catch (error) {
      console.error('Flipkart product details error:', error.message);
      return null;
    }
  }

  /**
   * Get products by category
   */
  async getByCategory(category, options = {}) {
    try {
      const params = {
        category: category,
        resultCount: options.limit || 10,
      };

      const response = await this.makeRequest('product/category', params);
      
      if (response.products) {
        return response.products.map(product => this.normalizeProduct(product));
      }

      return [];
    } catch (error) {
      console.error('Flipkart category error:', error.message);
      return [];
    }
  }

  /**
   * Normalize Flipkart product to unified schema
   */
  normalizeProduct(item) {
    const baseInfo = item.productBaseInfo || item.productBaseInfoV1 || {};
    const images = [];

    if (baseInfo.imageUrls) {
      Object.values(baseInfo.imageUrls).forEach(url => {
        if (url) {
          images.push({
            url: url,
            alt: baseInfo.productName || 'Product Image'
          });
        }
      });
    }

    const pricing = baseInfo.flipkartSpecialPrice || baseInfo.flipkartSellingPrice || {};
    const originalPrice = baseInfo.maximumRetailPrice?.amount || pricing.amount || 0;
    const currentPrice = pricing.amount || 0;

    return {
      provider: 'flipkart',
      productId: baseInfo.productId || item.productId,
      title: baseInfo.productName || baseInfo.title || 'Unknown Product',
      description: baseInfo.productDescription || baseInfo.description || '',
      brand: baseInfo.productBrand || '',
      category: baseInfo.categoryPath || baseInfo.category || '',
      images,
      price: {
        current: currentPrice,
        original: originalPrice,
        discount: originalPrice - currentPrice,
        currency: pricing.currency || 'INR'
      },
      availability: baseInfo.inStock ? 'in_stock' : 'out_of_stock',
      rating: baseInfo.productRating || 0,
      reviewCount: baseInfo.reviewCount || 0,
      url: baseInfo.productUrl || `https://www.flipkart.com/p/${baseInfo.productId}`,
      shipping: {
        isFree: baseInfo.shippingCharges === 0,
        estimatedDays: baseInfo.estimatedDeliveryTime || null
      },
      seller: baseInfo.sellerName || 'Flipkart'
    };
  }

  /**
   * Check availability
   */
  async checkAvailability(productId) {
    const product = await this.getProductDetails(productId);
    return {
      available: product?.availability === 'in_stock',
      stock: product?.availability
    };
  }
}

module.exports = FlipkartProvider;
