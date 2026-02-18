const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth');
const { assistantLimiter } = require('../middleware/rateLimiter');
const {
  processVoiceCommand,
  chatWithAssistant,
  executeAction
} = require('../controllers/assistantController');

router.post('/voice', protect, assistantLimiter, processVoiceCommand);
router.post('/chat', optionalAuth, assistantLimiter, chatWithAssistant);
router.post('/action', protect, executeAction);

module.exports = router;
