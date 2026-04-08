const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['CREATE', 'EDIT', 'ROLLBACK', 'APPROVE', 'ACCESS_CHANGE'],
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ documentId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
