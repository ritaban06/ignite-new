const mongoose = require('mongoose');

const subfolderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Folder name is required'],
    trim: true,
    maxlength: [200, 'Folder name cannot exceed 200 characters']
  },
  gdriveId: {
    type: String,
    trim: true,
    required: false
  },
  baseFolderId: {
    type: String,
    trim: true,
    required: false
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  // Optional override fields - if not provided, will inherit from parent
  years: [{
    type: Number,
    min: 0,
    max: 4,
    default: 0
  }],
  departments: [{
    type: String,
    trim: true,
    enum: ['CSE', 'CSBS', 'AIML', 'CSDS', 'IT', 'CSCS', 'ECE', 'EIE', 'IOT', 'ECS', 'EE', 'CE', 'FT', 'ME', 'BCA', 'BBA', 'BHM', 'BMS']
  }],
  semesters: [{
    type: Number,
    min: 0,
    max: 8,
    default: 0
  }],
  tags: [{
    type: String,
    trim: true
  }],
  accessControlTags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Access control tag cannot exceed 50 characters']
  }],
  // Nested children for deeper hierarchy - defined in subfolderSchema.add() below
}, { _id: false, strict: false });

// Allow recursive nesting of subfolders
subfolderSchema.add({ 
  children: {
    type: [subfolderSchema],
    default: []
  }
});

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Folder name is required'],
    trim: true,
    maxlength: [200, 'Folder name cannot exceed 200 characters']
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null // null for root folders
  },
  gdriveId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
    required: false
  },
  baseFolderId: {
    type: String,
    trim: true,
    required: false,
    index: true // Index for faster queries by base folder
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  years: [{
    type: Number,
    min: 0,
    max: 4,
    default: 0
  }],
  departments: [{
    type: String,
    trim: true,
    enum: ['CSE', 'CSBS', 'AIML', 'CSDS', 'IT', 'CSCS', 'ECE', 'EIE', 'IOT', 'ECS', 'EE', 'CE', 'FT', 'ME', 'BCA', 'BBA', 'BHM', 'BMS']
  }],
  semesters: [{
    type: Number,
    min: 0,
    max: 8,
    default: 0
  }],
  tags: [{
    type: String,
    trim: true
  }],
  accessControlTags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Access control tag cannot exceed 50 characters']
  }],
  createdByName: {
    type: String,
    trim: true,
    required: false
  },
  access: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    canView: { type: Boolean, default: true },
    canEdit: { type: Boolean, default: false }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Add children field to store subfolders
  children: {
    type: [subfolderSchema],
    default: []
  }
});

module.exports = mongoose.model('Folder', folderSchema);
