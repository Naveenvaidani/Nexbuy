const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  seed5000,
  verifyImages,
  metrics,
  updateProduct,
  bulkUpsert
} = require('../controllers/adminController');

router.use(protect, requireAdmin, apiLimiter);

router.post('/seed5000', seed5000);
router.post('/verify-images', verifyImages);
router.get('/metrics', metrics);
router.put('/products/:sku', updateProduct);
router.post('/products/bulk', bulkUpsert);

module.exports = router;
