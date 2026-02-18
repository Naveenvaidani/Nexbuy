/**
 * Base Provider Class
 * All provider adapters must extend this class and implement required methods
 */

class BaseProvider {
  constructor(config) {
    this.config = config;
    this.name = 'base';
  }

  /**
   * Search for products
   * @param {string} query - Search query
   * @param {object} options - Search options (category, priceRange, etc.)
   * @returns {Promise<Array>} - Array of normalized products
   */
  async search(query, options = {}) {
    throw new Error('search() must be implemented by provider');
  }

  /**
   * Get product details by ID
   * @param {string} productId - Provider's product ID
   * @returns {Promise<object>} - Normalized product details
   */
  async getProductDetails(productId) {
    throw new Error('getProductDetails() must be implemented by provider');
  }

  /**
   * Get product by multiple IDs
   * @param {Array<string>} productIds - Array of product IDs
   * @returns {Promise<Array>} - Array of normalized products
   */
  async getProductsByIds(productIds) {
    throw new Error('getProductsByIds() must be implemented by provider');
  }

  /**
   * Check product availability
   * @param {string} productId - Provider's product ID
   * @returns {Promise<object>} - Availability info
   */
  async checkAvailability(productId) {
    throw new Error('checkAvailability() must be implemented by provider');
  }

  /**
   * Normalize product data to unified schema
   * @param {object} rawProduct - Raw product data from provider
   * @returns {object} - Normalized product object
   */
  normalizeProduct(rawProduct) {
    throw new Error('normalizeProduct() must be implemented by provider');
  }

  /**
   * Handle rate limiting and backoff
   * @param {Function} fn - Function to execute with rate limiting
   * @returns {Promise<any>}
   */
  async withRateLimit(fn) {
    // Simple exponential backoff implementation
    const maxRetries = 3;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        return await fn();
      } catch (error) {
        if (error.response && error.response.status === 429) {
          retries++;
          const delay = Math.pow(2, retries) * 1000; // Exponential backoff
          console.log(`Rate limited. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    
    throw new Error('Max retries exceeded due to rate limiting');
  }

  /**
   * Build cache key for a request
   * @param {string} method - Method name
   * @param {object} params - Method parameters
   * @returns {string} - Cache key
   */
  buildCacheKey(method, params) {
    return `${this.name}:${method}:${JSON.stringify(params)}`;
  }
}

module.exports = BaseProvider;
