const { spawn } = require('child_process');
const path = require('path');
const Product = require('../models/Product');

// POST /api/admin/seed5000
exports.seed5000 = async (req, res, next) => {
  try {
    const scriptPath = path.join(__dirname, '..', 'scripts', 'seed5000Products.js');
    const child = spawn(process.execPath, [scriptPath], { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) return res.status(200).json({ success: true, message: 'Seeding complete' });
      return res.status(500).json({ success: false, message: `Seeding exited with code ${code}` });
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/verify-images
exports.verifyImages = async (req, res, next) => {
  try {
    const scriptPath = path.join(__dirname, '..', 'scripts', 'verifyImages.js');
    const child = spawn(process.execPath, [scriptPath], { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) return res.status(200).json({ success: true, message: 'Image verification passed' });
      return res.status(500).json({ success: false, message: `Image verification failed with code ${code}` });
    });
  } catch (error) {
    next(error);
  }
};

// Basic metrics for admin dashboard
// GET /api/admin/metrics
exports.metrics = async (req, res, next) => {
  try {
    // If no DB connection, return safe defaults so the dashboard can render
    const connected = Product.db?.readyState === 1;
    if (!connected) {
      return res.status(200).json({
        success: true,
        data: { totalProducts: 0, inStock: 0, categoriesCount: 0, timestamp: new Date().toISOString(), dbConnected: false }
      });
    }
    const totalProducts = await Product.countDocuments();
    const inStock = await Product.countDocuments({ 'providers.availability': 'in_stock' });
    const categories = await Product.distinct('category');
    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        inStock,
        categoriesCount: categories.length,
        timestamp: new Date().toISOString(),
        dbConnected: true
      }
    });
  } catch (error) {
    next(error);
  }
};

// CRUD: Product Update (simplified)
// PUT /api/admin/products/:sku
exports.updateProduct = async (req, res, next) => {
  try {
    const { sku } = req.params;
    const updates = req.body || {};
    const doc = await Product.findOneAndUpdate({ sku }, updates, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, product: doc });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/products/bulk (accepts JSON array)
exports.bulkUpsert = async (req, res, next) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [];
    if (!items.length) return res.status(400).json({ success: false, message: 'No items' });
    const ops = items.map(item => ({ updateOne: { filter: { sku: item.sku }, update: { $set: item }, upsert: true } }));
    const result = await Product.bulkWrite(ops, { ordered: false });
    res.status(200).json({ success: true, result });
  } catch (error) {
    next(error);
  }
};
