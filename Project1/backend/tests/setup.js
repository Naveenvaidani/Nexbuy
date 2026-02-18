// Test setup file
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/nexbuy_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.DATA_PROVIDER_MODE = 'mock';

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
