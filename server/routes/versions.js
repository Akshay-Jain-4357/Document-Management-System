const express = require('express');
const router = express.Router();
const versionController = require('../controllers/versionController');
const { authenticate } = require('../middlewares/auth');
const { validateDiffQuery } = require('../middlewares/validate');

router.use(authenticate);

// Get diff between two versions
router.get('/diff', validateDiffQuery, versionController.getDiff);

// Get a single version (with content)
router.get('/:id', versionController.getVersion);

// Rollback to a version
router.post('/:id/rollback', versionController.rollback);

// Approve a version
router.post('/:id/approve', versionController.approve);

module.exports = router;
