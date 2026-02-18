const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  analyzeSize,
  getSizeRecommendation
} = require('../controllers/sizeController');

router.post('/analyze', protect, analyzeSize);
router.get('/recommend/:productId', protect, getSizeRecommendation);

module.exports = router;
