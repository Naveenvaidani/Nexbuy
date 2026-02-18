const AmazonProvider = require('./AmazonProvider');
const FlipkartProvider = require('./FlipkartProvider');
const MockProvider = require('./MockProvider');
const GenericFeedProvider = require('./GenericFeedProvider');
const path = require('path');
const NodeCache = require('node-cache');

/**
 * Provider Factory - Manages provider instances and caching
 */

class ProviderFactory {
  constructor() {
    this.providers = new Map();
    this.cache = new NodeCache({
      stdTTL: parseInt(process.env.PRODUCT_CACHE_TTL) || 1800, // 30 minutes default
      checkperiod: 120
    });
    this.mode = process.env.DATA_PROVIDER_MODE || 'mock';
    this.initializeProviders();
  }

  /**
   * Initialize providers based on mode
   */
  initializeProviders() {
    if (this.mode === 'mock') {
      // Mock mode - simulate both Amazon and Flipkart
      this.providers.set('amazon', new MockProvider({ providerName: 'amazon' }));
      this.providers.set('flipkart', new MockProvider({ providerName: 'flipkart' }));
      // Additional Indian marketplaces via curated feeds
      this.providers.set('snapdeal', new GenericFeedProvider({ providerName: 'snapdeal', feedPath: path.join(__dirname, 'data', 'snapdeal.json') }));
      this.providers.set('myntra', new GenericFeedProvider({ providerName: 'myntra', feedPath: path.join(__dirname, 'data', 'myntra.json') }));
      this.providers.set('ajio', new GenericFeedProvider({ providerName: 'ajio', feedPath: path.join(__dirname, 'data', 'ajio.json') }));
      this.providers.set('tatacliq', new GenericFeedProvider({ providerName: 'tatacliq', feedPath: path.join(__dirname, 'data', 'tatacliq.json') }));
      console.log('Provider Factory: Running in MOCK mode');
    } else if (this.mode === 'live') {
      // Live mode - use actual API providers if credentials are available
      try {
        if (process.env.AMAZON_ACCESS_KEY && process.env.AMAZON_SECRET_KEY) {
          this.providers.set('amazon', new AmazonProvider({}));
          console.log('Provider Factory: Amazon provider initialized');
        } else {
          this.providers.set('amazon', new MockProvider({ providerName: 'amazon' }));
          console.log('Provider Factory: Amazon credentials missing, using mock');
        }

        if (process.env.FLIPKART_AFFILIATE_ID && process.env.FLIPKART_AFFILIATE_TOKEN) {
          this.providers.set('flipkart', new FlipkartProvider({}));
          console.log('Provider Factory: Flipkart provider initialized');
        } else {
          this.providers.set('flipkart', new MockProvider({ providerName: 'flipkart' }));
          console.log('Provider Factory: Flipkart credentials missing, using mock');
        }
      } catch (error) {
        console.error('Provider initialization error:', error.message);
        // Fallback to mock providers
        this.providers.set('amazon', new MockProvider({ providerName: 'amazon' }));
        this.providers.set('flipkart', new MockProvider({ providerName: 'flipkart' }));
      }
    }
  }

  /**
   * Get provider instance
   */
  getProvider(providerName) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider '${providerName}' not found`);
    }
    return provider;
  }

  /**
   * Get all available providers
   */
  getAllProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * Search across multiple providers
   */
  async searchAll(query, options = {}) {
    const providerNames = options.providers || this.getAllProviders();
    const results = {};

    await Promise.all(
      providerNames.map(async (providerName) => {
        try {
          const provider = this.getProvider(providerName);
          const cacheKey = provider.buildCacheKey('search', { query, options });
          
          // Check cache first
          let providerResults = this.cache.get(cacheKey);
          
          if (!providerResults) {
            providerResults = await provider.search(query, options);
            this.cache.set(cacheKey, providerResults);
          }
          
          results[providerName] = providerResults;
        } catch (error) {
          console.error(`Search error for ${providerName}:`, error.message);
          results[providerName] = [];
        }
      })
    );

    return results;
  }

  /**
   * Aggregate, deduplicate and paginate search across providers with fallback
   */
  async aggregateSearch(query, options = {}) {
    const providerNames = options.providers || this.getAllProviders();
    const merged = [];
    let fallbackUsed = false;

    const results = await this.searchAll(query, options);
    providerNames.forEach(name => {
      const arr = results[name] || [];
      if (!arr.length) fallbackUsed = true;
      merged.push(...arr);
    });

    // Brand filter (multi-select)
    if (options.brands && options.brands.length) {
      const set = new Set(options.brands.map(b => b.toLowerCase()));
      merged.splice(0, merged.length, ...merged.filter(p => set.has((p.brand || '').toLowerCase())));
    }

    // Deduplicate by brand+title (case-insensitive)
    const seen = new Set();
    const deduped = [];
    for (const p of merged) {
      const key = `${(p.brand||'').toLowerCase()}|${(p.title||'').toLowerCase()}`;
      if (!seen.has(key)) { seen.add(key); deduped.push(p); }
    }

    // Sort
    const sortBy = options.sortBy || 'relevance';
    if (sortBy === 'price_low') deduped.sort((a,b) => (a.price?.current||0) - (b.price?.current||0));
    if (sortBy === 'price_high') deduped.sort((a,b) => (b.price?.current||0) - (a.price?.current||0));
    if (sortBy === 'rating') deduped.sort((a,b) => (b.rating||0) - (a.rating||0));

    // Paginate
    const page = Math.max(parseInt(options.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(options.limit) || 12, 1), 60);
    const total = deduped.length;
    const start = (page - 1) * limit;
    const items = deduped.slice(start, start + limit);

    return {
      products: items,
      meta: {
        fallback: fallbackUsed,
        providers: providerNames,
        total,
        page,
        limit,
        totalPages: Math.max(Math.ceil(total/limit), 1)
      }
    };
  }

  /**
   * Compare product across providers
   */
  async compareProduct(query, options = {}) {
    const results = await this.searchAll(query, { ...options, limit: 5 });

    // Aggregate, normalize, compute totals and best deal
    const offers = [];
    for (const providerName of Object.keys(results)) {
      for (const p of results[providerName]) {
        const price = p.price?.current ?? 0;
        const shipping = p.shipping?.cost ?? 0;
        const totalCost = price + shipping;
        offers.push({
          provider: providerName,
          providerProductId: p.productId || p.sku || null,
          title: p.title,
          brand: p.brand,
          url: p.url || '#',
          availability: p.availability || 'in_stock',
          rating: p.rating || 0,
          reviewsCount: p.reviewCount || 0,
          imageUrl: p.images?.[0]?.url || null,
          priceINR: price,
          shippingCost: shipping,
          totalCost
        });
      }
    }

    if (!offers.length) return [];

    offers.sort((a, b) => a.totalCost - b.totalCost);
    const min = offers[0].totalCost;
    return offers.map(o => ({
      ...o,
      bestDeal: o.totalCost === min,
      priceDiffPercent: min ? Math.round(((o.totalCost - min) / min) * 100) : 0
    }));
  }

  /**
   * Get product details from specific provider
   */
  async getProductDetails(providerName, productId) {
    try {
      const provider = this.getProvider(providerName);
      const cacheKey = provider.buildCacheKey('getProductDetails', { productId });
      
      let product = this.cache.get(cacheKey);
      
      if (!product) {
        product = await provider.getProductDetails(productId);
        if (product) {
          this.cache.set(cacheKey, product);
        }
      }
      
      return product;
    } catch (error) {
      console.error(`Get product details error for ${providerName}:`, error.message);
      return null;
    }
  }

  /**
   * Clear cache
   */
  clearCache(pattern) {
    if (pattern) {
      const keys = this.cache.keys();
      keys.forEach(key => {
        if (key.includes(pattern)) {
          this.cache.del(key);
        }
      });
    } else {
      this.cache.flushAll();
    }
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}

// Export singleton instance
module.exports = new ProviderFactory();
