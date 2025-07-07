// Database connection utility
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Ensure admin user exists
    await ensureAdminUser();
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Ensure the special admin user exists in the database
const ensureAdminUser = async () => {
  try {
    const User = require('../models/User');
    
    // Use the same ObjectId as defined in auth middleware
    const ADMIN_OBJECT_ID = new mongoose.Types.ObjectId('000000000000000000000001');
    
    // Check if admin user already exists
    const existingAdmin = await User.findById(ADMIN_OBJECT_ID);
    
    if (!existingAdmin) {
      // Create the admin user document with the specific ObjectId
      const adminUser = new User({
        _id: ADMIN_OBJECT_ID,
        name: 'System Administrator',
        email: process.env.ADMIN_EMAIL || 'admin@ignite.local',
        role: 'admin',
        isActive: true,
        isLocked: false
        // Note: department and year are not required for admin role
      });
      
      await adminUser.save();
      console.log('✅ Created system admin user in database');
    } else {
      console.log('✅ System admin user already exists');
    }
  } catch (error) {
    console.error('❌ Failed to ensure admin user exists:', error);
    // Don't exit - this is not critical for app startup
  }
};

module.exports = connectDB;
