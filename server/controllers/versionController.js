const Version = require('../models/Version');
const { rollbackToVersion, approveVersion } = require('../services/versionService');
const { computeDiff } = require('../utils/diffEngine');

/**
 * POST /api/versions/:id/rollback — Rollback to a specific version
 */
exports.rollback = async (req, res, next) => {
  try {
    const version = await Version.findById(req.params.id);
    if (!version) return res.status(404).json({ error: 'Version not found' });

    const newVersion = await rollbackToVersion(
      version.documentId.toString(),
      req.params.id,
      req.user._id
    );

    await newVersion.populate('author', 'username');
    res.status(201).json({ version: newVersion });
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ error: err.message });
    }
    next(err);
  }
};

/**
 * POST /api/versions/:id/approve — Approve a version
 */
exports.approve = async (req, res, next) => {
  try {
    const version = await approveVersion(req.params.id, req.user._id);
    await version.populate('author', 'username');
    res.json({ version });
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ error: err.message });
    }
    next(err);
  }
};

/**
 * GET /api/diff?version1=&version2= — Compare two versions
 */
exports.getDiff = async (req, res, next) => {
  try {
    const { version1, version2 } = req.query;

    const [v1, v2] = await Promise.all([
      Version.findById(version1).populate('author', 'username'),
      Version.findById(version2).populate('author', 'username'),
    ]);

    if (!v1 || !v2) {
      return res.status(404).json({ error: 'One or both versions not found' });
    }

    if (v1.documentId.toString() !== v2.documentId.toString()) {
      return res.status(400).json({ error: 'Versions must belong to the same document' });
    }

    const diff = computeDiff(v1.content, v2.content);

    res.json({
      diff,
      version1: {
        id: v1._id,
        versionNumber: v1.versionNumber,
        author: v1.author,
        message: v1.message,
        createdAt: v1.createdAt,
      },
      version2: {
        id: v2._id,
        versionNumber: v2.versionNumber,
        author: v2.author,
        message: v2.message,
        createdAt: v2.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/versions/:id — Get a single version with content
 */
exports.getVersion = async (req, res, next) => {
  try {
    const version = await Version.findById(req.params.id).populate('author', 'username');
    if (!version) return res.status(404).json({ error: 'Version not found' });
    res.json({ version });
  } catch (err) {
    next(err);
  }
};
