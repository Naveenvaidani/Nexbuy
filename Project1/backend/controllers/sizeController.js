const User = require('../models/User');
const Product = require('../models/Product');

// Size conversion tables
const SIZE_CHARTS = {
  shirt: {
    S: { chest: [86, 91], waist: [71, 76], height: [165, 175] },
    M: { chest: [91, 97], waist: [76, 81], height: [170, 180] },
    L: { chest: [97, 102], waist: [81, 86], height: [175, 185] },
    XL: { chest: [102, 107], waist: [86, 91], height: [180, 190] },
    XXL: { chest: [107, 112], waist: [91, 97], height: [185, 195] }
  },
  pants: {
    28: { waist: [66, 71], hips: [86, 91], height: [165, 175] },
    30: { waist: [71, 76], hips: [91, 97], height: [170, 180] },
    32: { waist: [76, 81], hips: [97, 102], height: [175, 185] },
    34: { waist: [81, 86], hips: [102, 107], height: [180, 190] },
    36: { waist: [86, 91], hips: [107, 112], height: [185, 195] }
  },
  shoe: {
    6: { length: [23, 24] },
    7: { length: [24, 25] },
    8: { length: [25, 26] },
    9: { length: [26, 27] },
    10: { length: [27, 28] },
    11: { length: [28, 29] },
    12: { length: [29, 30] }
  }
};

// @desc    Analyze user measurements and recommend size
// @route   POST /api/size/analyze
// @access  Private
exports.analyzeSize = async (req, res, next) => {
  try {
    const { category, measurements } = req.body;

    if (!category || !measurements) {
      return res.status(400).json({
        success: false,
        message: 'Category and measurements are required'
      });
    }

    const recommendation = calculateSizeRecommendation(category, measurements);

    res.status(200).json({
      success: true,
      category,
      measurements,
      recommendation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get size recommendation for a product
// @route   GET /api/size/recommend/:productId
// @access  Private
exports.getSizeRecommendation = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const user = await User.findById(req.user.id);
    const product = await Product.findOne({
      $or: [
        { sku: productId },
        { 'providers.productId': productId }
      ]
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get active profile measurements
    const profile = user.getActiveProfile();
    if (!profile || !profile.measurements) {
      return res.status(400).json({
        success: false,
        message: 'Please add your measurements to get size recommendations'
      });
    }

    // Determine category type
    const category = determineCategory(product.category);
    const recommendation = calculateSizeRecommendation(category, profile.measurements);

    res.status(200).json({
      success: true,
      product: {
        id: product.sku,
        title: product.title,
        category: product.category
      },
      userMeasurements: profile.measurements,
      recommendation,
      availableSizes: product.sizes || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate size recommendation based on measurements
 */
function calculateSizeRecommendation(category, measurements) {
  const chart = SIZE_CHARTS[category.toLowerCase()];

  if (!chart) {
    return {
      size: null,
      confidence: 0,
      message: 'Size chart not available for this category',
      suggestedAction: 'Please refer to product size chart'
    };
  }

  let bestMatch = null;
  let bestScore = 0;

  Object.keys(chart).forEach(size => {
    const sizeRange = chart[size];
    let score = 0;
    let checks = 0;

    // Check each measurement
    Object.keys(sizeRange).forEach(measurement => {
      if (measurements[measurement]) {
        checks++;
        const [min, max] = sizeRange[measurement];
        const userValue = measurements[measurement];

        if (userValue >= min && userValue <= max) {
          score += 1;
        } else {
          // Partial score for close matches
          const distance = Math.min(
            Math.abs(userValue - min),
            Math.abs(userValue - max)
          );
          if (distance <= 5) {
            score += 0.5;
          }
        }
      }
    });

    const confidence = checks > 0 ? (score / checks) * 100 : 0;

    if (confidence > bestScore) {
      bestScore = confidence;
      bestMatch = size;
    }
  });

  let message = '';
  let suggestedAction = '';

  if (bestScore >= 80) {
    message = `Perfect fit! Size ${bestMatch} is recommended for you.`;
    suggestedAction = 'add_to_cart';
  } else if (bestScore >= 60) {
    message = `Size ${bestMatch} should fit you well.`;
    suggestedAction = 'add_to_cart';
  } else if (bestScore >= 40) {
    message = `Size ${bestMatch} might work, but please check the size chart.`;
    suggestedAction = 'check_size_chart';
  } else {
    message = 'We recommend checking the detailed size chart for this product.';
    suggestedAction = 'check_size_chart';
  }

  return {
    size: bestMatch,
    confidence: Math.round(bestScore),
    message,
    suggestedAction,
    alternativeSizes: getAlternativeSizes(category, bestMatch)
  };
}

/**
 * Get alternative sizes
 */
function getAlternativeSizes(category, recommendedSize) {
  const chart = SIZE_CHARTS[category.toLowerCase()];
  if (!chart) return [];

  const sizes = Object.keys(chart);
  const index = sizes.indexOf(recommendedSize);

  const alternatives = [];
  if (index > 0) alternatives.push(sizes[index - 1]); // Smaller
  if (index < sizes.length - 1) alternatives.push(sizes[index + 1]); // Larger

  return alternatives;
}

/**
 * Determine category type from product category
 */
function determineCategory(productCategory) {
  const lower = productCategory.toLowerCase();

  if (lower.includes('shirt') || lower.includes('top') || lower.includes('tshirt')) {
    return 'shirt';
  } else if (lower.includes('pant') || lower.includes('jean') || lower.includes('trouser')) {
    return 'pants';
  } else if (lower.includes('shoe') || lower.includes('sneaker') || lower.includes('boot')) {
    return 'shoe';
  }

  return 'general';
}
