const mongoose = require('mongoose');

const accessTagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tag name is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Tag name cannot exceed 50 characters'],
    minlength: [2, 'Tag name must be at least 2 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['academic', 'department', 'special-group', 'course', 'project', 'research', 'temporary', 'other'],
      message: 'Category must be one of: academic, department, special-group, course, project, research, temporary, other'
    },
    default: 'other'
  },
  color: {
    type: String,
    default: '#3B82F6', // Default blue color
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hex color code']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  // Track which users have this tag
  assignedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Track which folders use this tag
  assignedFolders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder'
  }]
}, {
  timestamps: true
});

// Indexes for better performance
accessTagSchema.index({ name: 1 });
accessTagSchema.index({ category: 1 });
accessTagSchema.index({ isActive: 1 });
accessTagSchema.index({ createdBy: 1 });

// Virtual for getting assigned count
accessTagSchema.virtual('assignedCount').get(function() {
  return (this.assignedUsers?.length || 0) + (this.assignedFolders?.length || 0);
});

// Pre-save middleware to update usage count
accessTagSchema.pre('save', function(next) {
  if (this.isModified('assignedUsers') || this.isModified('assignedFolders')) {
    this.usageCount = (this.assignedUsers?.length || 0) + (this.assignedFolders?.length || 0);
  }
  next();
});

// Static method to get tags by category
accessTagSchema.statics.getByCategory = function(category) {
  return this.find({ category, isActive: true }).sort({ name: 1 });
};

// Static method to get popular tags
accessTagSchema.statics.getPopularTags = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ usageCount: -1, name: 1 })
    .limit(limit);
};

// Instance method to add user assignment
accessTagSchema.methods.addUserAssignment = function(userId) {
  if (!this.assignedUsers.includes(userId)) {
    this.assignedUsers.push(userId);
    this.usageCount = (this.assignedUsers?.length || 0) + (this.assignedFolders?.length || 0);
  }
  return this.save();
};

// Instance method to remove user assignment
accessTagSchema.methods.removeUserAssignment = function(userId) {
  this.assignedUsers = this.assignedUsers.filter(id => !id.equals(userId));
  this.usageCount = (this.assignedUsers?.length || 0) + (this.assignedFolders?.length || 0);
  return this.save();
};

// Instance method to add folder assignment
accessTagSchema.methods.addFolderAssignment = function(folderId) {
  if (!this.assignedFolders.includes(folderId)) {
    this.assignedFolders.push(folderId);
    this.usageCount = (this.assignedUsers?.length || 0) + (this.assignedFolders?.length || 0);
  }
  return this.save();
};

// Instance method to remove folder assignment
accessTagSchema.methods.removeFolderAssignment = function(folderId) {
  this.assignedFolders = this.assignedFolders.filter(id => !id.equals(folderId));
  this.usageCount = (this.assignedUsers?.length || 0) + (this.assignedFolders?.length || 0);
  return this.save();
};

module.exports = mongoose.model('AccessTag', accessTagSchema);