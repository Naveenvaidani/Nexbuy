require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const http = require('http');
const socketIo = require('socket.io');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { initializeSocket } = require('./services/socketService');

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const profileRoutes = require('./routes/profileRoutes');
const walletRoutes = require('./routes/walletRoutes');
const assistantRoutes = require('./routes/assistantRoutes');
const lensRoutes = require('./routes/lensRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const sizeRoutes = require('./routes/sizeRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);

// CORS allowed origins
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:5001', // Voice service
  'http://127.0.0.1:5001',
  'http://localhost:5002', // Visual service
  'http://127.0.0.1:5002'
]);
if (process.env.CORS_ORIGIN) allowedOrigins.add(process.env.CORS_ORIGIN);
if (process.env.SOCKET_IO_CORS_ORIGIN) allowedOrigins.add(process.env.SOCKET_IO_CORS_ORIGIN);

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Initialize socket service
initializeSocket(io);

// Make io available to routes
app.set('io', io);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: (origin, callback) => {
    // In development, allow any origin to avoid IP/host-specific issues
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Body parsing - webhook routes need raw body
app.use('/api/webhooks', webhookRoutes);

// Body parsing for other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mode: process.env.DATA_PROVIDER_MODE || 'mock'
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/lens', lensRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/sizes', sizeRoutes);
app.use('/api/admin', adminRoutes);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/lens', lensRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/size', sizeRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use(errorHandler);

// MongoDB connection
const connectDB = async () => {
  try {
    if (process.env.MONGODB_URI) {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      logger.info(`MongoDB Connected: ${conn.connection.host}`);
    } else {
      logger.warn('MongoDB URI not provided - running in demo mode without database');
    }
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    logger.warn('Continuing without MongoDB - some features will be limited');
  }
};

// Start server
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    server.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      logger.info(`Data Provider Mode: ${process.env.DATA_PROVIDER_MODE || 'mock'}`);
      logger.info(`Access the application at: http://localhost:${PORT}`);
    });
  }).catch(() => {
    // Start server even if DB connection fails
    server.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT} (No DB)`);
      logger.info(`Data Provider Mode: ${process.env.DATA_PROVIDER_MODE || 'mock'}`);
      logger.info(`Access the application at: http://localhost:${PORT}`);
    });
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = { app, server, io };
