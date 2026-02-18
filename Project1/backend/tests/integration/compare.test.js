const request = require('supertest');
const mongoose = require('mongoose');
const { app, server } = require('../../server');
const Product = require('../../models/Product');

describe('GET /api/products/compare (ids)', () => {
  beforeAll(async () => {
    if (!process.env.MONGODB_URI) {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/nexbuy_test';
    }
    await mongoose.connect(process.env.MONGODB_URI);
    await Product.deleteMany({ sku: { $in: ['SKU_TEST_A', 'SKU_TEST_B'] } });
    await Product.create([
      {
        sku: 'SKU_TEST_A', title: 'Test A Camera', description: 'Desc', category: 'Electronics', brand: 'BrandA',
        images: [{ url: 'https://picsum.photos/seed/a/600/800', alt: 'A' }], imageThumb: 'https://picsum.photos/seed/a/300/400', imageLarge: 'https://picsum.photos/seed/a/900/1200',
        providers: [
          { name: 'amazon', productId: 'AMZ_A', url: '#', price: { current: 1000, original: 1200, discount: 200 }, availability: 'in_stock', rating: 4.2, reviewCount: 100, shipping: { cost: 50, estimatedDays: 3 } },
          { name: 'flipkart', productId: 'FLP_A', url: '#', price: { current: 950, original: 1150, discount: 200 }, availability: 'in_stock', rating: 4.0, reviewCount: 90, shipping: { cost: 100, estimatedDays: 4 } }
        ]
      },
      {
        sku: 'SKU_TEST_B', title: 'Test B Cover', description: 'Desc', category: 'Automotive', brand: 'BrandB',
        images: [{ url: 'https://picsum.photos/seed/b/600/800', alt: 'B' }], imageThumb: 'https://picsum.photos/seed/b/300/400', imageLarge: 'https://picsum.photos/seed/b/900/1200',
        providers: [
          { name: 'amazon', productId: 'AMZ_B', url: '#', price: { current: 500, original: 700, discount: 200 }, availability: 'in_stock', rating: 3.8, reviewCount: 50, shipping: { cost: 0, estimatedDays: 5 } }
        ]
      }
    ]);
  });

  afterAll(async () => {
    await Product.deleteMany({ sku: { $in: ['SKU_TEST_A', 'SKU_TEST_B'] } });
    await mongoose.disconnect();
    server.close();
  });

  it('returns columns, rows, and meta with best deal', async () => {
    const res = await request(app).get('/api/products/compare?ids=SKU_TEST_A,SKU_TEST_B').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.columns)).toBe(true);
    expect(Array.isArray(res.body.rows)).toBe(true);
    expect(res.body.meta).toHaveProperty('bestDealSku');
    const row = res.body.rows[0];
    expect(row).toHaveProperty('sku');
    expect(row).toHaveProperty('providerSku');
    expect(row).toHaveProperty('priceINR');
  });
});
