const BaseProvider = require('./BaseProvider');
const axios = require('axios');
const crypto = require('crypto');

/**
 * Amazon Product Advertising API 5.0 Provider
 * Documentation: https://webservices.amazon.com/paapi5/documentation/
 * Implements AWS Signature Version 4 authentication
 */
class AmazonProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.name = 'amazon';
    this.accessKey = config.accessKey || process.env.AMAZON_ACCESS_KEY;
    this.secretKey = config.secretKey || process.env.AMAZON_SECRET_KEY;
    this.associateTag = config.associateTag || process.env.AMAZON_ASSOC_TAG;
    this.region = config.region || process.env.AMAZON_REGION || 'us-east-1';
    this.marketplace = config.marketplace || process.env.AMAZON_MARKETPLACE || 'www.amazon.com';
    this.host = `webservices.amazon.com`;
    this.path = '/paapi5/searchitems';
    this.service = 'ProductAdvertisingAPI';
    
    // Rate limiting
    this.lastRequestTime = 0;
    this.minRequestInterval = 1000; // 1 request per second
  }

  /**
   * AWS Signature Version 4 helpers
   */
  getCanonicalRequest(method, canonicalUri, canonicalQueryString, canonicalHeaders, signedHeaders, hashedPayload) {
    return [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      hashedPayload
    ].join('\n');
  }

  getStringToSign(timestamp, credentialScope, canonicalRequestHash) {
    return [
      'AWS4-HMAC-SHA256',
      timestamp,
      credentialScope,
      canonicalRequestHash
    ].join('\n');
  }

  getSignature(secretKey, dateStamp, region, service, stringToSign) {
    const kDate = crypto.createHmac('sha256', `AWS4${secretKey}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    return crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  }

  /**
   * Generate AWS Signature Version 4 headers
   */
  generateAWSHeaders(payload, target) {
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = timestamp.substr(0, 8);
    
    const canonicalUri = this.path;
    const canonicalQueryString = '';
    
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    
    const headers = {
      'content-encoding': 'amz-1.0',
      'content-type': 'application/json; charset=utf-8',
      'host': this.host,
      'x-amz-date': timestamp,
      'x-amz-target': `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${target}`
    };
    
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map(key => `${key}:${headers[key]}\n`)
      .join('');
    
    const signedHeaders = Object.keys(headers).sort().join(';');
    
    const canonicalRequest = this.getCanonicalRequest(
      'POST',
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash
    );
    
    const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
    const credentialScope = `${dateStamp}/${this.region}/${this.service}/aws4_request`;
    
    const stringToSign = this.getStringToSign(timestamp, credentialScope, canonicalRequestHash);
    const signature = this.getSignature(this.secretKey, dateStamp, this.region, this.service, stringToSign);
    
    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    return {
      ...headers,
      'Authorization': authorizationHeader
    };
  }

  /**
   * Make API request with rate limiting and retry logic
   */
  async makeRequest(operation, payload) {
    if (!this.accessKey || !this.secretKey || !this.associateTag) {
      throw new Error('Amazon API credentials not configured. Set AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, and AMAZON_ASSOC_TAG in .env');
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
    }

    const requestPayload = {
      PartnerTag: this.associateTag,
      PartnerType: 'Associates',
      Marketplace: this.marketplace,
      ...payload
    };

    const headers = this.generateAWSHeaders(requestPayload, operation);

    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        this.lastRequestTime = Date.now();
        
        const response = await axios.post(
          `https://${this.host}/paapi5/${operation.toLowerCase()}`,
          requestPayload,
          { headers, timeout: 10000 }
        );

        return response.data;
      } catch (error) {
        lastError = error;
        retries--;

        if (error.response?.status === 429) {
          // Rate limit exceeded
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else if (error.response?.status >= 500) {
          // Server error, retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // Client error, don't retry
          break;
        }
      }
    }

    throw lastError;
  }

  /**
   * Search for products
   */
  async search(query, options = {}) {
    try {
      const params = {
        Keywords: query,
        Resources: [
          'Images.Primary.Large',
          'ItemInfo.Title',
          'ItemInfo.Features',
          'ItemInfo.ByLineInfo',
          'Offers.Listings.Price',
          'Offers.Listings.Availability',
          'CustomerReviews.StarRating'
        ],
        SearchIndex: options.category || 'All',
        ItemCount: Math.min(options.limit || 10, 10) // Max 10 items per request
      };

      if (options.minPrice) {
        params.MinPrice = Math.round(options.minPrice * 100); // Amazon uses cents
      }
      if (options.maxPrice) {
        params.MaxPrice = Math.round(options.maxPrice * 100);
      }
      if (options.sortBy) {
        params.SortBy = options.sortBy; // e.g., 'Price:LowToHigh', 'Relevance'
      }

      const response = await this.makeRequest('SearchItems', params);
      
      if (response.SearchResult && response.SearchResult.Items) {
        return response.SearchResult.Items.map(item => this.normalizeProduct(item));
      }

      return [];
    } catch (error) {
      console.error('Amazon search error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get product details by ASIN
   */
  async getProductDetails(asin) {
    try {
      const params = {
        ItemIds: [asin],
        Resources: [
          'Images.Primary.Large',
          'Images.Variants.Large',
          'ItemInfo.Title',
          'ItemInfo.Features',
          'ItemInfo.ProductInfo',
          'ItemInfo.ByLineInfo',
          'ItemInfo.ManufactureInfo',
          'Offers.Listings.Price',
          'Offers.Listings.Availability',
          'Offers.Listings.DeliveryInfo',
          'CustomerReviews.StarRating'
        ]
      };

      const response = await this.makeRequest('GetItems', params);
      
      if (response.ItemsResult && response.ItemsResult.Items && response.ItemsResult.Items.length > 0) {
        return this.normalizeProduct(response.ItemsResult.Items[0]);
      }

      return null;
    } catch (error) {
      console.error('Amazon product details error:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Normalize Amazon product to unified schema
   */
  normalizeProduct(item) {
    const listing = item.Offers?.Listings?.[0];
    const price = listing?.Price;
    const savings = listing?.SavingBasis;

    return {
      provider: 'amazon',
      sku: item.ASIN,
      productId: item.ASIN,
      title: item.ItemInfo?.Title?.DisplayValue || 'Unknown Product',
      brand: item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue || '',
      description: item.ItemInfo?.Features?.DisplayValues?.join(' ') || '',
      price: {
        currency: price?.Currency || 'USD',
        current: price?.Amount || 0,
        original: savings?.Amount || price?.Amount || 0,
        discount: savings?.Amount ? (savings.Amount - price.Amount) : 0,
        displayPrice: price?.DisplayAmount || '$0.00'
      },
      images: [
        {
          url: item.Images?.Primary?.Large?.URL || item.Images?.Primary?.Medium?.URL || '',
          width: item.Images?.Primary?.Large?.Width || 0,
          height: item.Images?.Primary?.Height || 0
        },
        ...(item.Images?.Variants?.map(variant => ({
          url: variant.Large?.URL || variant.Medium?.URL || '',
          width: variant.Large?.Width || 0,
          height: variant.Large?.Height || 0
        })) || [])
      ],
      rating: parseFloat(item.CustomerReviews?.StarRating?.Value || 0),
      reviewCount: item.CustomerReviews?.Count || 0,
      availability: listing?.Availability?.Message || 'Unknown',
      inStock: listing?.Availability?.Type === 'Now',
      url: item.DetailPageURL || `https://www.amazon.com/dp/${item.ASIN}?tag=${this.associateTag}`,
      deliveryInfo: listing?.DeliveryInfo?.IsFreeShippingEligible ? 'Free Shipping' : '',
      features: item.ItemInfo?.Features?.DisplayValues || [],
      category: item.BrowseNodeInfo?.BrowseNodes?.[0]?.DisplayName || '',
      metadata: {
        manufacturer: item.ItemInfo?.ManufactureInfo?.Model?.DisplayValue || '',
        partNumber: item.ItemInfo?.ManufactureInfo?.ItemPartNumber?.DisplayValue || '',
        modelNumber: item.ItemInfo?.ProductInfo?.Model?.DisplayValue || ''
      }
    };
  }

  /**
   * Check product availability
   */
  async checkAvailability(asin) {
    const product = await this.getProductDetails(asin);
    return product ? product.inStock : false;
  }
}

module.exports = AmazonProvider;
