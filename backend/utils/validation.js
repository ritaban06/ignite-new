// Input validation helpers
const { body, query, param } = require('express-validator');

// Common validation rules
const emailValidation = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Please provide a valid email address');

const passwordValidation = body('password')
  .isLength({ min: 6 })
  .withMessage('Password must be at least 6 characters long')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number');

const nameValidation = body('name')
  .trim()
  .isLength({ min: 2, max: 50 })
  .withMessage('Name must be between 2 and 50 characters');

const departmentValidation = (field = 'department') => 
  body(field)
    .isIn(['CSE', 'CSBS', 'AIML', 'CSDS', 'IT', 'CSCS', 'ECE', 'EIE', 'IOT', 'ECS', 'EE', 'CE', 'FT', 'ME', 'BCA', 'BBA', 'BHM', 'BMS'])
    .withMessage('Invalid department');

const yearValidation = (field = 'year') =>
  body(field)
    .isInt({ min: 1, max: 4 })
    .withMessage('Year must be between 1 and 4');

const mongoIdValidation = (field) =>
  param(field)
    .isMongoId()
    .withMessage(`Invalid ${field} format`);

// PDF validation rules
const pdfTitleValidation = body('title')
  .trim()
  .isLength({ min: 1, max: 200 })
  .withMessage('Title must be between 1 and 200 characters');

const pdfDescriptionValidation = body('description')
  .optional()
  .trim()
  .isLength({ max: 1000 })
  .withMessage('Description cannot exceed 1000 characters');

const subjectValidation = body('subject')
  .trim()
  .isLength({ min: 1, max: 100 })
  .withMessage('Subject must be between 1 and 100 characters');

const tagsValidation = body('tags')
  .optional()
  .isArray()
  .withMessage('Tags must be an array')
  .custom((tags) => {
    if (tags && tags.length > 10) {
      throw new Error('Maximum 10 tags allowed');
    }
    if (tags && tags.some(tag => typeof tag !== 'string' || tag.length > 50)) {
      throw new Error('Each tag must be a string with maximum 50 characters');
    }
    return true;
  });

// Query validation rules
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage('Limit must be between 1 and 100')
];

const sortValidation = [
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'title', 'viewCount', 'department', 'year', 'subject'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// File validation helpers
const validateFileSize = (maxSize) => (req, res, next) => {
  if (req.file && req.file.size > maxSize) {
    return res.status(400).json({
      error: 'File too large',
      maxSize: `${maxSize / (1024 * 1024)}MB`
    });
  }
  next();
};

const validateFileType = (allowedTypes) => (req, res, next) => {
  if (req.file && !allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      error: 'Invalid file type',
      allowedTypes
    });
  }
  next();
};

// Security validation
const sanitizeInput = (field) => 
  body(field)
    .trim()
    .escape()
    .withMessage(`${field} contains invalid characters`);

const validateUserAgent = (req, res, next) => {
  const userAgent = req.get('User-Agent');
  if (!userAgent || userAgent.length < 10) {
    return res.status(400).json({
      error: 'Invalid or missing User-Agent header'
    });
  }
  next();
};

// Custom validation functions
const isValidDepartmentYear = (department, year) => {
  // Add any specific department-year validation logic here
  return true;
};

const isValidPdfAccess = async (userId, pdfId) => {
  // This would be implemented in middleware
  return true;
};

module.exports = {
  // Basic validation rules
  emailValidation,
  passwordValidation,
  nameValidation,
  departmentValidation,
  yearValidation,
  mongoIdValidation,
  
  // PDF validation rules
  pdfTitleValidation,
  pdfDescriptionValidation,
  subjectValidation,
  tagsValidation,
  
  // Query validation rules
  paginationValidation,
  sortValidation,
  
  // File validation
  validateFileSize,
  validateFileType,
  
  // Security validation
  sanitizeInput,
  validateUserAgent,
  
  // Custom validation
  isValidDepartmentYear,
  isValidPdfAccess,
  
  // Validation rule sets for common operations
  registerValidation: [
    emailValidation,
    passwordValidation,
    nameValidation,
    departmentValidation(),
    yearValidation()
  ],
  
  loginValidation: [
    emailValidation,
    body('password').exists().withMessage('Password is required')
  ],
  
  pdfUploadValidation: [
    pdfTitleValidation,
    pdfDescriptionValidation,
    departmentValidation(),
    yearValidation(),
    subjectValidation,
    tagsValidation
  ],
  
  pdfUpdateValidation: [
    pdfTitleValidation.optional(),
    pdfDescriptionValidation,
    departmentValidation().optional(),
    yearValidation().optional(),
    subjectValidation.optional(),
    tagsValidation,
    body('isActive').optional().isBoolean()
  ],
  
  userUpdateValidation: [
    nameValidation.optional(),
    departmentValidation().optional(),
    yearValidation().optional(),
    body('isActive').optional().isBoolean()
  ]
};
