const AuditLog = require('../models/AuditLog');

/**
 * Log an action to the audit trail
 */
async function logAction(documentId, action, performedBy, metadata = {}) {
  try {
    const log = await AuditLog.create({
      documentId,
      action,
      performedBy,
      metadata,
    });
    return log;
  } catch (err) {
    // Audit logging should not break the main flow
    console.error('Audit log error:', err.message);
    return null;
  }
}

module.exports = { logAction };
