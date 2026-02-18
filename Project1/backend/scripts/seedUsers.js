const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');

const seedUsers = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nexbuy');
        console.log('Connected to MongoDB');

        // Check if demo user already exists
        const existingUser = await User.findOne({ email: 'user@demo.com' });
        
        if (existingUser) {
            console.log('Demo user already exists');
            process.exit(0);
        }

        // Create demo user
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        const demoUser = new User({
            name: 'Demo User',
            email: 'user@demo.com',
            phone: '9876543210',
            password: hashedPassword,
            addresses: [{
                street: '123 Demo Street',
                city: 'Demo City',
                state: 'Demo State',
                pincode: '123456',
                country: 'India',
                isDefault: true
            }],
            wallet: {
                balance: 1000,
                coins: 100
            }
        });

        await demoUser.save();
        console.log('✅ Demo user created successfully!');
        console.log('Email: user@demo.com');
        console.log('Password: password123');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding users:', error);
        process.exit(1);
    }
};

seedUsers();
