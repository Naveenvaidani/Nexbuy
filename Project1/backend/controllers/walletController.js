const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');

// @desc    Get wallet balance
// @route   GET /api/wallet/balance
// @access  Private
exports.getWalletBalance = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      wallet: user.wallet
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get wallet transactions
// @route   GET /api/wallet/transactions
// @access  Private
exports.getTransactions = async (req, res, next) => {
  try {
    const { currency, limit, page } = req.query;

    const query = { user: req.user.id };
    if (currency) {
      query.currency = currency;
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const transactions = await WalletTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('relatedOrder', 'orderNumber status');

    const total = await WalletTransaction.countDocuments(query);

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      transactions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add money to wallet
// @route   POST /api/wallet/add-money
// @access  Private
exports.addMoney = async (req, res, next) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    const user = await User.findById(req.user.id);
    const balanceBefore = user.wallet.balance;

    user.wallet.balance += amount;
    await user.save();

    await WalletTransaction.create({
      user: user._id,
      type: 'credit',
      amount,
      currency: 'wallet',
      reason: 'manual_credit',
      description: 'Money added to wallet',
      balanceBefore,
      balanceAfter: user.wallet.balance
    });

    res.status(200).json({
      success: true,
      message: `₹${amount} added to wallet`,
      wallet: user.wallet
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Transfer coins (for testing)
// @route   POST /api/wallet/transfer-coins
// @access  Private
exports.transferCoins = async (req, res, next) => {
  try {
    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    const user = await User.findById(req.user.id);
    const balanceBefore = user.wallet.coins;

    if (amount < 0 && Math.abs(amount) > user.wallet.coins) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient coins'
      });
    }

    user.wallet.coins += amount;
    await user.save();

    await WalletTransaction.create({
      user: user._id,
      type: amount > 0 ? 'credit' : 'debit',
      amount: Math.abs(amount),
      currency: 'coins',
      reason: reason || 'manual_credit',
      balanceBefore,
      balanceAfter: user.wallet.coins
    });

    res.status(200).json({
      success: true,
      message: `${amount} coins ${amount > 0 ? 'added' : 'deducted'}`,
      wallet: user.wallet
    });
  } catch (error) {
    next(error);
  }
};
