/*
  Image Verification & Auto-replacement Script
  Usage: node scripts/verifyImages.js [--limit=100] [--threshold=0.2]

  - Loads products from DB
  - For each product image, attempts to get top labels via MobileNet (optional)
  - Compares labels to tokens from title/brand/category
  - Marks imageQuality: 'poor' if overlap score < threshold
  - For poor images, replaces with Unsplash/Picsum placeholder using brand/category
  - Optionally generates thumb/large URLs if CLOUDINARY/CDN configured or leaves for CDN pattern
*/

require('dotenv').config();
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const Product = require('../models/Product');
const logger = require('../utils/logger');

const THUMB_SIZE = { w: 300, h: 400 };
const LARGE_SIZE = { w: 900, h: 1200 };

let mobilenet; let tf;
async function loadModel() {
  try {
    tf = require('@tensorflow/tfjs-node');
    mobilenet = require('@tensorflow-models/mobilenet');
    return await mobilenet.load({ version: 2, alpha: 1.0 });
  } catch (e) {
    logger.warn('Mobilenet not available. Skipping visual labeling step.');
    return null;
  }
}

function tokenize(str = '') {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function scoreOverlap(labels, tokens) {
  const set = new Set(tokens);
  const hits = labels.filter(l => set.has(l.toLowerCase()));
  return hits.length / Math.max(labels.length || 1, 1);
}

function buildPlaceholder(brand, category) {
  const seed = encodeURIComponent(`${brand || 'product'} ${category || 'item'}`);
  // 3:4 ratio
  return {
    thumb: `https://picsum.photos/seed/${seed}/${THUMB_SIZE.w}/${THUMB_SIZE.h}`,
    large: `https://picsum.photos/seed/${seed}/${LARGE_SIZE.w}/${LARGE_SIZE.h}`
  };
}

async function verifyAndFix(limit = 200, threshold = 0.2) {
  const model = await loadModel();
  const query = { isActive: true };
  const products = await Product.find(query).limit(limit);
  let updated = 0;

  for (const p of products) {
    try {
      const imageUrl = p.imageLarge || p.imageThumb || p.images?.[0]?.url;
      if (!imageUrl) continue;

      let labels = [];
      if (model && tf) {
        // Fetch image buffer
        const resp = await fetch(imageUrl);
        const buf = await resp.buffer();
        const decoded = tf.node.decodeImage(buf);
        const predictions = await model.classify(decoded);
        decoded.dispose();
        labels = predictions.map(pr => pr.className.split(',')[0].toLowerCase());
      } else {
        // Heuristic: derive tokens from URL if no model
        labels = tokenize(imageUrl).slice(0, 5);
      }

      const tokens = [
        ...tokenize(p.title),
        ...tokenize(p.brand),
        ...tokenize(p.category)
      ];
      const overlap = scoreOverlap(labels, tokens);
      const poor = overlap < threshold;

      let updates = {};
      if (poor) {
        const ph = buildPlaceholder(p.brand, p.category);
        updates.imageQuality = 'poor';
        if (!p.imageThumb) updates.imageThumb = ph.thumb;
        if (!p.imageLarge) updates.imageLarge = ph.large;
        if (!p.images || !p.images.length) updates.images = [{ url: ph.large, alt: p.title }];
      } else if (p.imageQuality !== 'good') {
        updates.imageQuality = 'good';
      }

      if (Object.keys(updates).length) {
        await Product.updateOne({ _id: p._id }, { $set: updates });
        updated++;
        logger.info(`Updated ${p.sku}: quality=${updates.imageQuality || p.imageQuality}`);
      }
    } catch (e) {
      logger.warn(`Verify image failed for ${p.sku}: ${e.message}`);
    }
  }

  return updated;
}

(async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI not set');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const limitArg = process.argv.find(a => a.startsWith('--limit='));
    const thrArg = process.argv.find(a => a.startsWith('--threshold='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 200;
    const threshold = thrArg ? parseFloat(thrArg.split('=')[1]) : 0.2;
    const updated = await verifyAndFix(limit, threshold);
    console.log(`verifyImages complete. Updated: ${updated}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('verifyImages error:', err);
    process.exit(1);
  }
})();
