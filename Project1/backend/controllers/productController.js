const providerFactory = require('../providers/ProviderFactory');
const Product = require('../models/Product');

// @desc    List products from DB with pagination and filters
// @route   GET /api/products
// @query   q, page, limit, category, brand, minPrice, maxPrice, minRating, providers, sortBy
// @access  Public
exports.listProducts = async (req, res, next) => {
  try {
    const {
      q,
      page = 1,
      limit = 12,
      category,
      brand,
      minPrice,
      maxPrice,
      minRating,
      providers,
      sortBy = 'relevance'
    } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit) || 12, 1), 60);

    const providerList = providers ? providers.split(',').map(p => p.trim().toLowerCase()) : [];

    const filter = { isActive: true };

    if (q) {
      // Prefer text index if present, fallback to regex
      filter.$or = [
        { $text: { $search: q } },
        { title: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') }
      ];
    }

    if (category) filter.category = new RegExp(category, 'i');
    if (brand) filter.brand = new RegExp(brand, 'i');

    if (minPrice || maxPrice) {
      filter['providers.price.current'] = {};
      if (minPrice) filter['providers.price.current'].$gte = parseFloat(minPrice);
      if (maxPrice) filter['providers.price.current'].$lte = parseFloat(maxPrice);
    }

    if (minRating) {
      filter['providers.rating'] = { $gte: parseFloat(minRating) };
    }

    if (providerList.length) {
      filter['providers.name'] = { $in: providerList };
    }

    // Sorting
    const sort = {};
    if (q) {
      // if text search, prefer text score when relevance
      if (sortBy === 'relevance') {
        sort.score = { $meta: 'textScore' };
      }
    }
    if (sortBy === 'price_low') sort['providers.price.current'] = 1;
    if (sortBy === 'price_high') sort['providers.price.current'] = -1;
    if (sortBy === 'rating') sort['providers.rating'] = -1;
    if (sortBy === 'popularity') {
      sort.viewCount = -1;
      sort.purchaseCount = -1;
    }
    if (Object.keys(sort).length === 0) sort.createdAt = -1;

    // Query
    const total = await Product.countDocuments(filter);
    const cursor = Product.find(filter)
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize);

    if (sort.score) cursor.sort({ score: sort.score });
    cursor.sort(sort);

    // If text score requested, project it
    if (q) {
      cursor.select({ score: { $meta: 'textScore' } });
    }

    const docs = await cursor.exec();

    // Normalize to unified schema expected by frontend
    const normalized = docs.map(doc => {
      // choose provider entry
      let pEntry = null;
      if (providerList.length) {
        pEntry = (doc.providers || []).find(p => providerList.includes((p.name || '').toLowerCase()));
      }
      if (!pEntry) {
        // fallback to best price if available
        pEntry = (doc.providers || [])[0];
      }

      const priceCurrent = pEntry?.price?.current || 0;
      const priceOriginal = pEntry?.price?.original || priceCurrent || 0;
      // Prefer provider image (future), else stored image, else CDN by SKU, else placeholder
      let primaryImage = (doc.images && doc.images[0]?.url) || '';
      if (!primaryImage && process.env.CDN_IMAGE_BASE) {
        primaryImage = `${process.env.CDN_IMAGE_BASE.replace(/\/$/, '')}/${encodeURIComponent(doc.sku)}.jpg`;
      }
      if (!primaryImage) {
        const placeholderKey = encodeURIComponent(`${doc.brand || 'product'} ${doc.category || 'item'}`);
        primaryImage = `https://picsum.photos/seed/${placeholderKey}/600/800`;
      }
      const imageThumb = doc.imageThumb || (process.env.CDN_IMAGE_BASE ? `${process.env.CDN_IMAGE_BASE.replace(/\/$/, '')}/${encodeURIComponent(doc.sku)}-300x400.jpg` : undefined);
      const imageLarge = doc.imageLarge || (process.env.CDN_IMAGE_BASE ? `${process.env.CDN_IMAGE_BASE.replace(/\/$/, '')}/${encodeURIComponent(doc.sku)}-900x1200.jpg` : undefined);
      return {
        provider: (pEntry?.name) || 'internal',
        productId: pEntry?.productId || doc.sku,
        sku: doc.sku,
        title: doc.title,
        description: doc.description,
        brand: doc.brand,
        category: doc.category,
        subcategory: doc.subcategory,
        images: [{ url: primaryImage, alt: doc.title }],
        imageThumb,
        imageLarge,
        imageQuality: doc.imageQuality || 'unknown',
        price: {
          current: priceCurrent,
          original: priceOriginal,
          discount: Math.max(priceOriginal - priceCurrent, 0),
          currency: 'INR'
        },
        availability: pEntry?.availability || 'in_stock',
        rating: pEntry?.rating || 0,
        reviewCount: pEntry?.reviewCount || 0,
        url: pEntry?.url || '#'
      };
    });

    res.status(200).json({
      success: true,
      count: normalized.length,
      products: normalized,
      pagination: {
        currentPage: pageNum,
        pageSize,
        totalItems: total,
        totalPages: Math.max(Math.ceil(total / pageSize), 1)
      }
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Search products across providers
// @route   GET /api/products/search?q=query&category=&minPrice=&maxPrice=&providers=
// @access  Public
exports.searchProducts = async (req, res, next) => {
  try {
    const { q, category, minPrice, maxPrice, providers, limit } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const options = {
      category,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      limit: limit ? parseInt(limit) : 10,
      providers: providers ? providers.split(',') : undefined
    };

    const results = await providerFactory.searchAll(q, options);

    // Track search analytics
    if (req.user) {
      // Log search history
    }

    res.status(200).json({
      success: true,
      query: q,
      options,
      results,
      mode: process.env.DATA_PROVIDER_MODE || 'mock'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Aggregated multi-provider search with dedupe and pagination
// @route   GET /api/products/search/aggregate?q=&providers=&brands=&sortBy=&page=&limit=
// @access  Public
exports.searchAggregated = async (req, res, next) => {
  try {
    const { q, providers, brands, sortBy, page, limit } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const options = {
      providers: providers ? providers.split(',').map(s => s.trim()) : undefined,
      brands: brands ? brands.split(',').map(s => s.trim()) : undefined,
      sortBy,
      page,
      limit
    };

    const { products, meta } = await providerFactory.aggregateSearch(q, options);
    res.status(200).json({ success: true, query: q, count: products.length, products, meta });
  } catch (error) {
    next(error);
  }
};

// @desc    Compare product across providers or by IDs
// @route   GET /api/products/compare?ids=sku1,sku2 OR q=query&providers=amazon,flipkart
// @access  Public
exports.compareProducts = async (req, res, next) => {
  try {
    const { q, providers, ids } = req.query;

    // IDs-based comparison using DB
    if (ids) {
      const idList = ids.split(',').map(s => s.trim()).filter(Boolean);
      if (!idList.length) return res.status(400).json({ success: false, message: 'No ids provided' });

      const docs = await Product.find({
        $or: [
          { sku: { $in: idList } },
          { 'providers.productId': { $in: idList } }
        ]
      });

      const columns = [
        'sku', 'providerSku', 'title', 'brand', 'priceINR', 'currency', 'rating', 'reviewsCount', 'availability', 'deliveryEstimate', 'shippingCost', 'productUrl', 'imageUrl'
      ];
      const rows = [];
      for (const doc of docs) {
        for (const p of (doc.providers || [])) {
          const imageUrl = doc.imageThumb || doc.images?.[0]?.url || null;
          rows.push({
            sku: doc.sku,
            providerSku: p.productId || doc.sku,
            title: doc.title,
            brand: doc.brand,
            priceINR: p.price?.current ?? 0,
            currency: 'INR',
            rating: p.rating ?? 0,
            reviewsCount: p.reviewCount ?? 0,
            availability: p.availability || 'in_stock',
            deliveryEstimate: p.shipping?.estimatedDays ? `${p.shipping.estimatedDays} days` : undefined,
            shippingCost: p.shipping?.cost ?? 0,
            productUrl: p.url || '#',
            imageUrl,
            provider: p.name
          });
        }
      }

      // Merge duplicates per provider+sku picking lowest total cost
      const bestMap = new Map();
      for (const r of rows) {
        const k = `${r.provider}-${r.providerSku}`;
        const totalCost = (r.priceINR || 0) + (r.shippingCost || 0);
        if (!bestMap.has(k) || totalCost < bestMap.get(k).totalCost) {
          bestMap.set(k, { ...r, totalCost });
        }
      }
      const merged = Array.from(bestMap.values()).sort((a, b) => a.totalCost - b.totalCost);
      const minCost = merged[0]?.totalCost || 0;
      const finalRows = merged.map(r => ({
        ...r,
        bestDeal: r.totalCost === minCost,
        priceDifferencePercent: minCost ? Math.round(((r.totalCost - minCost) / minCost) * 100) : 0
      }));

      return res.status(200).json({
        success: true,
        columns,
        rows: finalRows,
        meta: { bestDealSku: merged[0]?.providerSku || null, generatedAt: new Date().toISOString() }
      });
    }

    // Query-based provider comparison fallback
    if (!q) {
      return res.status(400).json({ success: false, message: 'Provide either ids or q for comparison' });
    }
    const options = { providers: providers ? providers.split(',') : undefined, limit: 5 };
    const comparison = await providerFactory.compareProduct(q, options);
    const bestDeal = comparison.length > 0 ? comparison[0] : null;
    res.status(200).json({ success: true, query: q, comparison, bestDeal, totalResults: comparison.length, mode: process.env.DATA_PROVIDER_MODE || 'mock' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { provider } = req.query;

    let product;

    if (provider) {
      // Get from specific provider
      product = await providerFactory.getProductDetails(provider, id);
    } else {
      // Try to find in database first
      const dbProduct = await Product.findOne({
        $or: [
          { sku: id },
          { 'providers.productId': id }
        ]
      });

      if (dbProduct) {
        const mockProvider = providerFactory.getProvider('amazon');
        product = mockProvider.normalizeProduct(dbProduct);
      }
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Increment view count
    await Product.updateOne(
      { sku: product.sku || id },
      { $inc: { viewCount: 1 } }
    );

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get products by category
// @route   GET /api/products/category/:category
// @access  Public
exports.getProductsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const { provider, limit } = req.query;

    const options = {
      limit: limit ? parseInt(limit) : 10
    };

    let products;

    if (provider) {
      const providerInstance = providerFactory.getProvider(provider);
      products = await providerInstance.getByCategory(category, options);
    } else {
      // Get from all providers
      const allProviders = providerFactory.getAllProviders();
      products = [];
      
      for (const providerName of allProviders) {
        const providerInstance = providerFactory.getProvider(providerName);
        const providerProducts = await providerInstance.getByCategory(category, options);
        products.push(...providerProducts);
      }
    }

    res.status(200).json({
      success: true,
      category,
      count: products.length,
      products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get trending products
// @route   GET /api/products/trending
// @access  Public
exports.getTrendingProducts = async (req, res, next) => {
  try {
    const { limit } = req.query;

    const products = await Product.find({ isActive: true })
      .sort({ viewCount: -1, purchaseCount: -1 })
      .limit(limit ? parseInt(limit) : 10);

    const mockProvider = providerFactory.getProvider('amazon');
    const normalized = products.map(p => mockProvider.normalizeProduct(p));

    res.status(200).json({
      success: true,
      count: normalized.length,
      products: normalized
    });
  } catch (error) {
    next(error);
  }
};
