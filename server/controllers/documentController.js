const Document = require('../models/Document');
const Version = require('../models/Version');
const AuditLog = require('../models/AuditLog');
const { createInitialVersion, createVersion } = require('../services/versionService');
const { logAction } = require('../services/auditService');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const WordExtractor = require('word-extractor');

/**
 * POST /api/documents — Create a new document with initial content
 */
exports.createDocument = async (req, res, next) => {
  try {
    const { title, content, message, visibility } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Cannot create a document with empty content' });
    }

    const doc = await Document.create({
      title,
      visibility: visibility || 'private',
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
 * POST /api/documents/upload — Upload file as a new document
 * Supports: .txt, .pdf, .md, .doc, .docx
 */
exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let content = '';
    const ext = req.file.originalname.split('.').pop().toLowerCase();

    if (ext === 'txt' || ext === 'md') {
      content = req.file.buffer.toString('utf-8');
    } else if (ext === 'pdf') {
      try {
        const pdfData = await pdfParse(req.file.buffer);
        content = pdfData.text;
      } catch (pdfErr) {
        console.error('PDF parse error:', pdfErr.message);
        return res.status(400).json({ error: 'Failed to parse PDF. It may be corrupted or password-protected.' });
      }
    } else if (ext === 'docx') {
      // .docx — Modern Word format (XML-based)
      try {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        content = result.value;
      } catch (docxErr) {
        console.error('DOCX parse error:', docxErr.message);
        return res.status(400).json({ error: 'Failed to parse .docx file. It may be corrupted.' });
      }
    } else if (ext === 'doc') {
      // .doc — Legacy Word format (binary, Word 97-2003)
      try {
        const extractor = new WordExtractor();
        const doc = await extractor.extract(req.file.buffer);
        content = doc.getBody();
      } catch (docErr) {
        console.error('DOC parse error:', docErr.message);
        return res.status(400).json({ error: 'Failed to parse .doc file. It may be corrupted.' });
      }
    } else {
      return res.status(400).json({ error: `Unsupported file type: .${ext}` });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Uploaded file is empty or unreadable' });
    }

    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760;
    if (content.length > maxSize) {
      return res.status(400).json({ error: `Content exceeds ${Math.round(maxSize / 1048576)}MB limit` });
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
 * GET /api/documents/my — List user's owned and shared documents
 */
exports.listMyDocuments = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const filter = {
      $or: [
        { createdBy: userId },
        { 'accessControl.owner': userId },
        { 'accessControl.editors': userId },
        { 'accessControl.viewers': userId },
        { 'accessControl.approvers': userId },
      ],
    };

    const documents = await Document.find(filter)
      .populate('createdBy', 'username')
      .populate('accessControl.owner', 'username')
      .populate('currentVersionId', 'versionNumber message author isApproved createdAt')
      .populate('versions', 'author')
      .sort({ updatedAt: -1 })
      .lean();

    const formattedDocs = documents.map(doc => {
      const uniqueAuthors = new Set();
      if (doc.versions) {
        doc.versions.forEach(v => {
          if (v.author) uniqueAuthors.add(v.author.toString());
        });
      }

      return {
        id: doc._id,
        _id: doc._id,
        title: doc.title,
        owner: doc.accessControl?.owner?.username || doc.createdBy?.username || 'Unknown',
        updatedAt: doc.updatedAt,
        accessStats: {
          editors: doc.accessControl?.editors?.length || 0,
          viewers: doc.accessControl?.viewers?.length || 0,
          approvers: doc.accessControl?.approvers?.length || 0,
        },
        contributorsCount: uniqueAuthors.size,
        currentVersionId: doc.currentVersionId,
        createdBy: doc.createdBy,
        versions: doc.versions
      };
    });

    res.json(formattedDocs);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/documents/public — List public documents
 */
exports.listPublicDocuments = async (req, res, next) => {
  try {
    const documents = await Document.find({ visibility: 'public' })
      .populate('createdBy', 'username')
      .populate('accessControl.owner', 'username')
      .populate('currentVersionId', 'versionNumber message author isApproved createdAt')
      .populate('versions', 'author')
      .sort({ updatedAt: -1 })
      .lean();

    const formattedDocs = documents.map(doc => {
      const uniqueAuthors = new Set();
      if (doc.versions) {
        doc.versions.forEach(v => {
          if (v.author) uniqueAuthors.add(v.author.toString());
        });
      }

      return {
        id: doc._id,
        _id: doc._id,
        title: doc.title,
        owner: doc.accessControl?.owner?.username || doc.createdBy?.username || 'Unknown',
        updatedAt: doc.updatedAt,
        visibility: 'public',
        contributorsCount: uniqueAuthors.size,
        currentVersionId: doc.currentVersionId,
        createdBy: doc.createdBy,
        versions: doc.versions
      };
    });

    res.json(formattedDocs);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/documents/:id/insights — Expose document collaboration signals
 */
exports.getDocumentInsights = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id).populate('versions', 'author').lean();
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    
    // Basic access check: public docs or user has role
    const userId = req.user._id.toString();
    const isPublic = doc.visibility === 'public';
    const hasRole = 
      doc.createdBy?.toString() === userId ||
      doc.accessControl?.owner?.toString() === userId ||
      doc.accessControl?.editors?.some(id => id.toString() === userId) ||
      doc.accessControl?.viewers?.some(id => id.toString() === userId) ||
      doc.accessControl?.approvers?.some(id => id.toString() === userId);
      
    if (!isPublic && !hasRole) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const uniqueAuthors = new Set();
    if (doc.versions) {
      doc.versions.forEach(v => {
        if (v.author) uniqueAuthors.add(v.author.toString());
      });
    }

    res.json({
      owner: 1,
      editors: doc.accessControl?.editors?.length || 0,
      viewers: doc.accessControl?.viewers?.length || 0,
      approvers: doc.accessControl?.approvers?.length || 0,
      contributors: uniqueAuthors.size
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
