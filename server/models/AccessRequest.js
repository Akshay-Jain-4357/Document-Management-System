const mongoose = require('mongoose');

const accessRequestSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestedRole: {
      type: String,
      enum: ['editor', 'approver', 'viewer'],
      default: 'editor',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Keep only one pending request per user per document
accessRequestSchema.index({ documentId: 1, userId: 1, status: 1 });

module.exports = mongoose.model('AccessRequest', accessRequestSchema);
