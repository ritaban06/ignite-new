const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: function() {
      return this.loginMethod !== 'google';
    },
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  role: {
    type: String,
    enum: ['client', 'admin'],
    default: 'client'
  },
  department: {
    type: String,
    required: function() { 
      return this.role === 'client'; 
    },
    enum: ['CSE', 'CSBS', 'AIML', 'CSDS', 'IT', 'CSCS', 'ECE', 'EIE', 'IOT', 'ECS', 'EE', 'CE', 'FT', 'ME', 'BCA', 'BBA', 'BHM', 'BMS']
  },
  year: {
    type: Number,
    required: function() { 
      return this.role === 'client'; 
    },
    min: [0, 'Year must be between 0 and 4'],
    max: [4, 'Year must be between 0 and 4'],
    default: 0
  },
  semester: {
    type: Number,
    required: function() { 
      return this.role === 'client'; 
    },
    min: [0, 'Semester must be between 0 and 8'],
    max: [8, 'Semester must be between 0 and 8'],
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  deviceId: {
    type: String,
    default: null // Tracks most recent device for reference
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  // Google OAuth fields
  googleId: {
    type: String,
    sparse: true // Allow null values, but ensure uniqueness when present
  },
  picture: {
    type: String,
    default: null
  },
  loginMethod: {
    type: String,
    enum: ['traditional', 'google'],
    default: 'traditional'
  },
  // Access control tags for fine-grained folder permissions
  accessTags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Access tag cannot exceed 50 characters']
  }]
}, {
  timestamps: true
});

// Indexes
userSchema.index({ department: 1, year: 1, semester: 1 });
userSchema.index({ role: 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to handle failed login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Remove sensitive data from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.loginAttempts;
  delete user.lockUntil;
  return user;
};

module.exports = mongoose.model('User', userSchema);
