const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: 200,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    currentVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Version',
      default: null,
    },
    versions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Version',
      },
    ],
    accessControl: {
      owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      editors: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      viewers: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      approvers: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
    },
    fileType: {
      type: String,
      enum: ['text', 'pdf'],
      default: 'text',
    },
  },
  { timestamps: true }
);

// Index for listing user's documents
documentSchema.index({ 'accessControl.owner': 1 });
documentSchema.index({ 'accessControl.editors': 1 });
documentSchema.index({ 'accessControl.viewers': 1 });
documentSchema.index({ 'accessControl.approvers': 1 });
documentSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Document', documentSchema);
