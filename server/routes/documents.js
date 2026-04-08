const express = require('express');
const router = express.Router();
const docController = require('../controllers/documentController');
const { authenticate, checkDocumentAccess } = require('../middlewares/auth');
const { validateCreateDocument, validateCreateVersion, upload } = require('../middlewares/validate');

// All document routes require authentication
router.use(authenticate);

// Create document (text content)
router.post('/', validateCreateDocument, docController.createDocument);

// Upload document (file: .txt or .pdf)
router.post('/upload', upload.single('file'), docController.uploadDocument);

// List user's documents
router.get('/', docController.listDocuments);

// Get single document
router.get('/:id', checkDocumentAccess('viewer'), docController.getDocument);

// Create new version
router.post('/:id/version', checkDocumentAccess('editor'), validateCreateVersion, docController.createNewVersion);

// Get version history
router.get('/:id/versions', checkDocumentAccess('viewer'), docController.getVersions);

// Update access control (owner only)
router.post('/:id/access', checkDocumentAccess('owner'), docController.updateAccess);

// Get audit log
router.get('/:id/audit', checkDocumentAccess('viewer'), docController.getAuditLog);

module.exports = router;
