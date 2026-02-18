const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getWalletBalance,
  getTransactions,
  addMoney,
  transferCoins
} = require('../controllers/walletController');

router.get('/balance', protect, getWalletBalance);
router.get('/transactions', protect, getTransactions);
router.post('/add-money', protect, addMoney);
router.post('/transfer-coins', protect, transferCoins);

module.exports = router;
