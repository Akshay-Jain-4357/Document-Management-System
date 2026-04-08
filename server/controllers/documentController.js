const Document = require('../models/Document');
const Version = require('../models/Version');
const AuditLog = require('../models/AuditLog');
const { createInitialVersion, createVersion } = require('../services/versionService');
const { logAction } = require('../services/auditService');
const pdfParse = require('pdf-parse');

/**
 * POST /api/documents — Create a new document with initial content
 */
exports.createDocument = async (req, res, next) => {
  try {
    const { title, content, message } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Cannot create a document with empty content' });
    }

    const doc = await Document.create({
      title,
      createdBy: req.user._id,
      accessControl: {
        owner: req.user._id,
        editors: [],
        viewers: [],
        approvers: [],
      },
    });

    const version = await createInitialVersion(
      doc._id,
      content,
      req.user._id,
      message || 'Initial version'
    );

    res.status(201).json({
      document: doc,
      version,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/documents/upload — Upload .txt or .pdf file as a new document
 */
exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let content = '';
    const ext = req.file.originalname.split('.').pop().toLowerCase();

    if (ext === 'txt') {
      content = req.file.buffer.toString('utf-8');
    } else if (ext === 'pdf') {
      try {
        const pdfData = await pdfParse(req.file.buffer);
        content = pdfData.text;
      } catch (pdfErr) {
        return res.status(400).json({ error: 'Failed to parse PDF file' });
      }
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Uploaded file is empty or unreadable' });
    }

    if (content.length > (parseInt(process.env.MAX_FILE_SIZE) || 1048576)) {
      return res.status(400).json({ error: 'Extracted content exceeds 1MB limit' });
    }

    const title = req.body.title || req.file.originalname.replace(/\.[^/.]+$/, '');
    const message = req.body.message || `Uploaded ${req.file.originalname}`;

    const doc = await Document.create({
      title,
      createdBy: req.user._id,
      fileType: ext === 'pdf' ? 'pdf' : 'text',
      accessControl: {
        owner: req.user._id,
        editors: [],
        viewers: [],
        approvers: [],
      },
    });

    const version = await createInitialVersion(doc._id, content, req.user._id, message);

    res.status(201).json({ document: doc, version });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/documents — List documents accessible to the user
 */
exports.listDocuments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;
    const userId = req.user._id;

    const filter = {
      $or: [
        { 'accessControl.owner': userId },
        { 'accessControl.editors': userId },
        { 'accessControl.viewers': userId },
        { 'accessControl.approvers': userId },
      ],
    };

    const [documents, total] = await Promise.all([
      Document.find(filter)
        .populate('createdBy', 'username')
        .populate('currentVersionId', 'versionNumber message author isApproved createdAt')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Document.countDocuments(filter),
    ]);

    res.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/documents/:id — Get document with current version
 */
exports.getDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate('createdBy', 'username email')
      .populate('accessControl.owner', 'username')
      .populate('accessControl.editors', 'username')
      .populate('accessControl.viewers', 'username')
      .populate('accessControl.approvers', 'username');

    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const currentVersion = doc.currentVersionId
      ? await Version.findById(doc.currentVersionId).populate('author', 'username')
      : null;

    res.json({ document: doc, currentVersion });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/documents/:id/version — Create new version
 */
exports.createNewVersion = async (req, res, next) => {
  try {
    const { content, message } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    const version = await createVersion(req.params.id, content, req.user._id, message);
    await version.populate('author', 'username');

    res.status(201).json({ version });
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ error: err.message });
    }
    next(err);
  }
};

/**
 * GET /api/documents/:id/versions — List version history (paginated)
 */
exports.getVersions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const [versions, total] = await Promise.all([
      Version.find({ documentId: req.params.id })
        .populate('author', 'username')
        .sort({ versionNumber: -1 })
        .skip(skip)
        .limit(limit)
        .select('-content')
        .lean(),
      Version.countDocuments({ documentId: req.params.id }),
    ]);

    res.json({
      versions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/documents/:id/access — Update document access control
 */
exports.updateAccess = async (req, res, next) => {
  try {
    const { editors, viewers, approvers } = req.body;
    const doc = await Document.findById(req.params.id);

    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (editors) doc.accessControl.editors = editors;
    if (viewers) doc.accessControl.viewers = viewers;
    if (approvers) doc.accessControl.approvers = approvers;

    await doc.save();

    await logAction(doc._id, 'ACCESS_CHANGE', req.user._id, { editors, viewers, approvers });

    res.json({ document: doc });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/documents/:id/audit — Get audit log for document
 */
exports.getAuditLog = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find({ documentId: req.params.id })
        .populate('performedBy', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments({ documentId: req.params.id }),
    ]);

    res.json({
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};
