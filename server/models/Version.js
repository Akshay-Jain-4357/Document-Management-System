const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 1048576, // 1MB limit
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    parentVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Version',
      default: null,
    },
    message: {
      type: String,
      required: [true, 'Commit message is required'],
      trim: true,
      maxlength: 500,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    branchName: {
      type: String,
      default: 'main',
      trim: true,
    },
  },
  { timestamps: true }
);

// Compound index for efficient version listing
versionSchema.index({ documentId: 1, versionNumber: -1 });

module.exports = mongoose.model('Version', versionSchema);
