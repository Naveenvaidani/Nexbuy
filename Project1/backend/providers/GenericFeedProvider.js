const fs = require('fs');
const path = require('path');
const BaseProvider = require('./BaseProvider');

class GenericFeedProvider extends BaseProvider {
  constructor({ providerName, feedPath }) {
    super({});
    this.name = providerName;
    this.feedPath = feedPath;
    this.items = [];
    this._load();
  }

  _load() {
    try {
      const abs = path.resolve(this.feedPath);
      if (fs.existsSync(abs)) {
        const raw = fs.readFileSync(abs, 'utf-8');
        const data = JSON.parse(raw);
        this.items = Array.isArray(data) ? data : [];
      }
    } catch (e) {
      console.error(`Failed to load feed for ${this.name}:`, e.message);
      this.items = [];
    }
  }

  async search(query, options = {}) {
    const q = (query || '').toLowerCase();
    const limit = options.limit || 10;
    const minPrice = options.minPrice ? Number(options.minPrice) : undefined;
    const maxPrice = options.maxPrice ? Number(options.maxPrice) : undefined;
    const category = options.category ? options.category.toLowerCase() : undefined;
    const brands = options.brands ? options.brands.map(b => b.toLowerCase()) : undefined;

    let results = this.items.filter(it => {
      const inQ = !q || it.title?.toLowerCase().includes(q) || it.description?.toLowerCase().includes(q) || it.brand?.toLowerCase().includes(q);
      const inCat = !category || (it.category?.toLowerCase() || '').includes(category);
      const inBrand = !brands || brands.includes((it.brand || '').toLowerCase());
      const price = it.price?.current ?? 0;
      const inMin = minPrice === undefined || price >= minPrice;
      const inMax = maxPrice === undefined || price <= maxPrice;
      return inQ && inCat && inBrand && inMin && inMax;
    });

    // sort basic by price if requested
    if (options.sortBy === 'price_low') results.sort((a,b) => (a.price.current||0) - (b.price.current||0));
    if (options.sortBy === 'price_high') results.sort((a,b) => (b.price.current||0) - (a.price.current||0));
    if (options.sortBy === 'rating') results.sort((a,b) => (b.rating||0) - (a.rating||0));

    results = results.slice(0, limit);
    return results.map(this.normalizeProduct.bind(this));
  }

  async getProductDetails(productId) {
    const found = this.items.find(it => it.productId === productId || it.sku === productId);
    return found ? this.normalizeProduct(found) : null;
  }

  normalizeProduct(item) {
    const priceCurrent = item.price?.current || 0;
    const priceOriginal = item.price?.original || priceCurrent;
    return {
      provider: this.name,
      productId: item.productId || item.sku,
      sku: item.sku,
      title: item.title,
      description: item.description,
      brand: item.brand,
      category: item.category,
      subcategory: item.subcategory,
      images: item.images || [],
      price: {
        current: priceCurrent,
        original: priceOriginal,
        discount: Math.max(priceOriginal - priceCurrent, 0),
        currency: 'INR'
      },
      availability: item.availability || 'in_stock',
      rating: item.rating || 0,
      reviewCount: item.reviewCount || 0,
      url: item.url || '#',
      shipping: item.shipping || { cost: 0, isFree: true, estimatedDays: 5 }
    };
  }
}

module.exports = GenericFeedProvider;
