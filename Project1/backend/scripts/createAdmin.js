require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function run(){
  try{
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexbuy';
    await mongoose.connect(uri);
    const email = process.argv[2] || 'admin@demo.com';
    const password = process.argv[3] || 'admin123';
    let user = await User.findOne({ email }).select('+password');
    if (!user) {
      user = new User({ name: 'Admin', email, password, role: 'admin', isVerified: true });
      await user.save();
      console.log('Created admin user:', email);
    } else {
      user.role = 'admin';
      if (password) user.password = password; // will be hashed by pre-save
      await user.save();
      console.log('Updated existing user to admin:', email);
    }
    process.exit(0);
  } catch (e){
    console.error('Admin create error:', e);
    process.exit(1);
  }
}
run();
