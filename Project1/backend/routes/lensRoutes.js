const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');
const {
  searchByImage,
  processImageUpload
} = require('../controllers/lensController');

router.post('/search', protect, uploadLimiter, upload.single('image'), searchByImage);
router.post('/upload', protect, uploadLimiter, upload.single('image'), processImageUpload);

module.exports = router;
