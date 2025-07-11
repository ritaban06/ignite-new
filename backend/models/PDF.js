const mongoose = require('mongoose');

const pdfSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'PDF title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  fileName: {
    type: String,
    required: [true, 'File name is required']
  },
  originalName: {
    type: String,
    required: [true, 'Original file name is required']
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required']
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
    enum: ['application/pdf']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: ['AIML', 'CSE', 'ECE', 'EEE', 'IT']
  },
  year: {
    type: Number,
    required: false, // Allow year to be optional for orphaned/unknown PDFs
    min: [1, 'Year must be between 1 and 4'],
    max: [4, 'Year must be between 1 and 4'],
    default: null // Default to null if not provided
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [100, 'Subject cannot exceed 100 characters']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader is required']
  },
  googleDriveFileId: {
    type: String,
    required: [true, 'Google Drive file ID is required']
  },
  googleDriveFolderId: {
    type: String,
    required: false,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  lastAccessed: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
pdfSchema.index({ department: 1, year: 1 });
pdfSchema.index({ subject: 1 });
pdfSchema.index({ tags: 1 });
pdfSchema.index({ uploadedBy: 1 });
pdfSchema.index({ isActive: 1 });
pdfSchema.index({ createdAt: -1 });

// Compound index for user access queries
pdfSchema.index({ department: 1, year: 1, isActive: 1 });

// Text search index
pdfSchema.index({ 
  title: 'text', 
  description: 'text', 
  subject: 'text',
  tags: 'text'
});

// Virtual for file URL (will be generated dynamically)
pdfSchema.virtual('fileUrl').get(function() {
  // This will be populated with signed URL when needed
  return null;
});

// Method to increment view count
pdfSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  this.lastAccessed = new Date();
  return this.save();
};

// Method to check if user can access this PDF
pdfSchema.methods.canUserAccess = function(user) {
  if (user.role === 'admin') return true;
  
  return this.department === user.department && 
         this.year === user.year && 
         this.isActive;
};

// Static method to find PDFs for a specific user
pdfSchema.statics.findForUser = function(user, filters = {}) {
  const query = {
    isActive: true
  };
  
  // Non-admin users can only see PDFs for their department and year
  if (user.role !== 'admin') {
    query.department = user.department;
    query.year = user.year;
  }
  
  // Apply additional filters
  if (filters.subject) {
    query.subject = new RegExp(filters.subject, 'i');
  }
  
  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }
  
  if (filters.search) {
    query.$text = { $search: filters.search };
  }
  
  return this.find(query)
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: -1 });
};

// Static method to find all PDFs for admin
pdfSchema.statics.findAllForAdmin = function(filters = {}) {
  const query = {};
  // Apply filters if provided
  if (filters.subject) {
    query.subject = new RegExp(filters.subject, 'i');
  }
  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }
  if (filters.search) {
    query.$text = { $search: filters.search };
  }
  return this.find(query)
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: -1 });
};

// Remove sensitive data from JSON output
pdfSchema.methods.toJSON = function() {
  const pdf = this.toObject();
  delete pdf.googleDriveFileId; // Don't expose Google Drive file ID in API responses
  return pdf;
};

module.exports = mongoose.model('PDF', pdfSchema);
