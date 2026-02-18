const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  searchProducts,
  searchAggregated,
  getProductById,
  compareProducts,
  getProductsByCategory,
  getTrendingProducts,
  listProducts
} = require('../controllers/productController');

// Paginated listing from DB
router.get('/', optionalAuth, apiLimiter, listProducts);
router.get('/search', optionalAuth, apiLimiter, searchProducts);
router.get('/search/aggregate', optionalAuth, apiLimiter, searchAggregated);
router.get('/compare', optionalAuth, apiLimiter, compareProducts);
router.get('/trending', optionalAuth, getTrendingProducts);
router.get('/category/:category', optionalAuth, getProductsByCategory);
router.get('/:id', optionalAuth, getProductById);

module.exports = router;
