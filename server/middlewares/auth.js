const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Document = require('../models/Document');

/**
 * Authenticate — verify JWT and attach user to request
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next(err);
  }
}

/**
 * Authorize — check global user role
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * Check per-document access control
 * accessLevel: 'viewer' | 'editor' | 'approver' | 'owner'
 */
function checkDocumentAccess(accessLevel) {
  return async (req, res, next) => {
    try {
      const docId = req.params.id || req.params.docId;
      const doc = await Document.findById(docId);

      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const userId = req.user._id.toString();
      const isOwner = doc.accessControl.owner.toString() === userId;
      const isEditor = doc.accessControl.editors.map((e) => e.toString()).includes(userId);
      const isViewer = doc.accessControl.viewers.map((v) => v.toString()).includes(userId);
      const isApprover = doc.accessControl.approvers.map((a) => a.toString()).includes(userId);
      const isAdmin = req.user.role === 'admin';

      let hasAccess = false;

      switch (accessLevel) {
        case 'viewer':
          hasAccess = isOwner || isEditor || isViewer || isApprover || isAdmin;
          break;
        case 'editor':
          hasAccess = isOwner || isEditor || isAdmin;
          break;
        case 'approver':
          hasAccess = isOwner || isApprover || isAdmin;
          break;
        case 'owner':
          hasAccess = isOwner || isAdmin;
          break;
        default:
          hasAccess = false;
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have access to this document' });
      }

      req.document = doc;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { authenticate, authorize, checkDocumentAccess };
