const sharp = require('sharp');
const imageHash = require('image-hash');
const fs = require('fs').promises;
const path = require('path');
const Product = require('../models/Product');
const providerFactory = require('../providers/ProviderFactory');

// Lazy load TensorFlow.js (heavy dependency)
let tf, mobilenet;
const initializeTensorFlow = async () => {
  if (!tf) {
    try {
      tf = require('@tensorflow/tfjs-node');
      const mobilenetModule = require('@tensorflow-models/mobilenet');
      mobilenet = await mobilenetModule.load({ version: 2, alpha: 1.0 });
      console.log('✅ TensorFlow.js and MobileNet initialized');
    } catch (error) {
      console.warn('⚠️  TensorFlow.js not available, using hash-based matching only');
    }
  }
  return { tf, mobilenet };
};

// Standardized image dimensions for processing
const STANDARD_WIDTH = 900;
const STANDARD_HEIGHT = 1200;
const THUMBNAIL_SIZE = 200;

// Minimum quality thresholds
const MIN_FILE_SIZE = 30000; // 30KB
const MIN_CONFIDENCE = 0.6;

// @desc    Search products by image
// @route   POST /api/lens/search
// @access  Private
exports.searchByImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const imagePath = req.file.path;
    
    // Validate image quality
    const stats = await fs.stat(imagePath);
    if (stats.size < MIN_FILE_SIZE) {
      await fs.unlink(imagePath).catch(() => {});
      return res.status(400).json({
        success: false,
        message: 'Image quality too low. Please upload a clearer image (min 30KB)'
      });
    }

    // Process image: resize, standardize
    const processedPath = await processAndStandardizeImage(imagePath);
    
    // Generate perceptual hash
    const pHash = await generateImageHash(processedPath);
    
    // Extract feature embeddings (if TensorFlow available)
    let embeddings = null;
    try {
      const { mobilenet: model } = await initializeTensorFlow();
      if (model) {
        embeddings = await extractImageEmbeddings(processedPath, model);
      }
    } catch (error) {
      console.warn('Embeddings extraction failed, using hash-based search only');
    }
    
    // Search database for similar products
    const similarProducts = await findSimilarProducts(pHash, embeddings);
    
    // Clean up uploaded files
    await fs.unlink(imagePath).catch(err => console.error('Cleanup error:', err));
    if (processedPath !== imagePath) {
      await fs.unlink(processedPath).catch(err => console.error('Cleanup error:', err));
    }

    res.status(200).json({
      success: true,
      results: similarProducts,
      count: similarProducts.length,
      metadata: {
        imageHash: pHash,
        hasEmbeddings: !!embeddings,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    // Clean up file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(err => console.error('Cleanup error:', err));
    }
    next(error);
  }
};

// @desc    Process image upload and extract features
// @route   POST /api/lens/upload
// @access  Private
exports.processImageUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const imagePath = req.file.path;

    // Optimize image
    const optimizedPath = await optimizeImage(imagePath);

    // Generate hash
    const hash = await generateImageHash(optimizedPath);

    // Generate thumbnail
    const thumbnailPath = await generateThumbnail(optimizedPath);

    res.status(200).json({
      success: true,
      image: {
        path: optimizedPath,
        thumbnail: thumbnailPath,
        hash: hash
      }
    });
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(err => console.error('Cleanup error:', err));
    }
    next(error);
  }
};

/**
 * Generate perceptual hash of image
 */
async function generateImageHash(imagePath) {
  return new Promise((resolve, reject) => {
    imageHash(imagePath, 16, true, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * Process and standardize image (resize to standard dimensions)
 */
async function processAndStandardizeImage(imagePath) {
  const processedPath = imagePath.replace(/(\.\w+)$/, '-processed$1');
  
  await sharp(imagePath)
    .resize(STANDARD_WIDTH, STANDARD_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 85 })
    .toFile(processedPath);
  
  return processedPath;
}

/**
 * Extract image embeddings using MobileNet
 */
async function extractImageEmbeddings(imagePath, model) {
  if (!model) return null;
  
  try {
    // Load image as tensor
    const imageBuffer = await fs.readFile(imagePath);
    const tfimage = tf.node.decodeImage(imageBuffer, 3);
    
    // Resize to MobileNet input size (224x224)
    const resized = tf.image.resizeBilinear(tfimage, [224, 224]);
    const normalized = resized.div(255.0);
    const batched = normalized.expandDims(0);
    
    // Get embeddings (activation from second-to-last layer)
    const activation = model.infer(batched, true);
    const embeddings = await activation.data();
    
    // Cleanup tensors
    tfimage.dispose();
    resized.dispose();
    normalized.dispose();
    batched.dispose();
    activation.dispose();
    
    return Array.from(embeddings);
  } catch (error) {
    console.error('Embedding extraction error:', error);
    return null;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculate Hamming distance between two hashes
 */
function hammingDistance(hash1, hash2) {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return Infinity;
  
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
}

/**
 * Find similar products using hash and/or embeddings
 */
async function findSimilarProducts(pHash, embeddings, limit = 10) {
  try {
    // Get all products with images
    const products = await Product.find({
      'images.0': { $exists: true },
      imageHash: { $exists: true }
    })
    .select('sku title brand category priceINR originalPriceINR discountPercent rating images imageHash imageFeatures providers')
    .lean();
    
    if (products.length === 0) {
      return [];
    }
    
    // Calculate similarity scores
    const scoredProducts = products.map(product => {
      let score = 0;
      let confidence = 0;
      
      // Hash-based similarity (normalized to 0-1, higher is better)
      if (product.imageHash && pHash) {
        const hammingDist = hammingDistance(pHash, product.imageHash);
        const maxDist = pHash.length; // Maximum possible distance
        const hashSimilarity = 1 - (hammingDist / maxDist);
        score += hashSimilarity * 0.4; // 40% weight
      }
      
      // Embedding-based similarity (if available)
      if (embeddings && product.imageFeatures && product.imageFeatures.length > 0) {
        const embeddingSimilarity = cosineSimilarity(embeddings, product.imageFeatures);
        score += embeddingSimilarity * 0.6; // 60% weight
        confidence = embeddingSimilarity;
      } else {
        confidence = score;
      }
      
      return {
        ...product,
        similarityScore: score,
        confidence: confidence,
        // Format price for display
        priceFormatted: new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR'
        }).format(product.priceINR)
      };
    });
    
    // Sort by similarity score and filter by confidence threshold
    const results = scoredProducts
      .filter(p => p.confidence >= MIN_CONFIDENCE)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);
    
    return results;
  } catch (error) {
    console.error('Similar products search error:', error);
    return [];
  }
}

/**
 * Optimize image for storage
 */
async function optimizeImage(imagePath) {
  const optimizedPath = imagePath.replace(/(\.\w+)$/, '-optimized.jpg');
  
  await sharp(imagePath)
    .resize(1200, 1200, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 85, progressive: true })
    .toFile(optimizedPath);
  
  return optimizedPath;
}

/**
 * Generate thumbnail
 */
async function generateThumbnail(imagePath) {
  const thumbnailPath = imagePath.replace(/(\.\w+)$/, '-thumb.jpg');
  
  await sharp(imagePath)
    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
      fit: 'cover'
    })
    .jpeg({ quality: 80 })
    .toFile(thumbnailPath);
  
  return thumbnailPath;
}

/**
 * Optimize image for storage and processing
 */
async function optimizeImage(imagePath) {
  const filename = path.basename(imagePath);
  const optimizedPath = path.join('uploads', 'images', `optimized-${filename}`);

  await sharp(imagePath)
    .resize(800, 800, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 85 })
    .toFile(optimizedPath);

  return optimizedPath;
}

/**
 * Generate thumbnail
 */
async function generateThumbnail(imagePath) {
  const filename = path.basename(imagePath);
  const thumbnailPath = path.join('uploads', 'images', `thumb-${filename}`);

  await sharp(imagePath)
    .resize(200, 200, {
      fit: 'cover'
    })
    .jpeg({ quality: 80 })
    .toFile(thumbnailPath);

  return thumbnailPath;
}
