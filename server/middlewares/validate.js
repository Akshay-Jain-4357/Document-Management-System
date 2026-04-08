const { body, query, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');

/**
 * Handle validation result — return 400 if errors exist
 */
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

// Validation rules
const validateRegister = [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['viewer', 'editor', 'approver']).withMessage('Invalid role'),
  handleValidation,
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation,
];

const validateCreateDocument = [
  body('title').trim().notEmpty().isLength({ max: 200 }).withMessage('Title required (max 200 chars)'),
  body('content').notEmpty().withMessage('Content is required'),
  body('content')
    .isLength({ max: 1048576 })
    .withMessage('Content exceeds 1MB limit'),
  body('message').optional().trim().isLength({ max: 500 }),
  handleValidation,
];

const validateCreateVersion = [
  body('content').notEmpty().withMessage('Content is required'),
  body('content')
    .isLength({ max: 1048576 })
    .withMessage('Content exceeds 1MB limit'),
  body('message').trim().notEmpty().isLength({ max: 500 }).withMessage('Commit message required (max 500 chars)'),
  handleValidation,
];

const validateDiffQuery = [
  query('version1').isMongoId().withMessage('Invalid version1 ID'),
  query('version2').isMongoId().withMessage('Invalid version2 ID'),
  handleValidation,
];

// File upload config
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 1048576 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.txt' || ext === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only .txt and .pdf files are allowed'));
    }
  },
});

module.exports = {
  validateRegister,
  validateLogin,
  validateCreateDocument,
  validateCreateVersion,
  validateDiffQuery,
  upload,
};
