const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  phone: {
    type: String,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  avatar: {
    type: String,
    default: null
  },
  addresses: [{
    label: String, // Home, Work, etc.
    fullName: String,
    phone: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' },
    isDefault: { type: Boolean, default: false }
  }],
  profiles: [{
    name: { type: String, required: true }, // e.g., "Me", "Mom", "Dad"
    age: Number,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    preferences: {
      categories: [String],
      brands: [String],
      priceRange: {
        min: Number,
        max: Number
      }
    },
    measurements: {
      height: Number, // in cm
      weight: Number, // in kg
      chest: Number,
      waist: Number,
      hips: Number,
      shoeSize: Number
    }
  }],
  activeProfile: {
    type: Number,
    default: 0 // Index of active profile
  },
  wallet: {
    balance: {
      type: Number,
      default: 0,
      min: 0
    },
    coins: {
      type: Number,
      default: 50, // Initial welcome coins
      min: 0
    }
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: {
    type: String,
    default: null
  },
  referralRewardClaimed: {
    type: Boolean,
    default: false
  },
  preferences: {
    voiceEnabled: { type: Boolean, default: true },
    voiceDataRetention: { type: Boolean, default: false },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    language: { type: String, default: 'en' },
    currency: { type: String, default: 'INR' }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Generate referral code before save
userSchema.pre('save', async function(next) {
  if (!this.referralCode) {
    this.referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  }
  next();
});

// Hash password before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Get active profile
userSchema.methods.getActiveProfile = function() {
  if (this.profiles && this.profiles.length > 0) {
    return this.profiles[this.activeProfile] || this.profiles[0];
  }
  return null;
};

module.exports = mongoose.model('User', userSchema);
