const Document = require('../models/Document');
const Version = require('../models/Version');
const { logAction } = require('./auditService');

/**
 * Create the initial version when a document is first created
 */
async function createInitialVersion(documentId, content, authorId, message = 'Initial version') {
  const version = await Version.create({
    documentId,
    versionNumber: 1,
    content,
    author: authorId,
    parentVersionId: null,
    message,
  });

  await Document.findByIdAndUpdate(documentId, {
    currentVersionId: version._id,
    $push: { versions: version._id },
  });

  await logAction(documentId, 'CREATE', authorId, {
    versionId: version._id,
    versionNumber: 1,
    message,
  });

  return version;
}

/**
 * Create a new version for an existing document
 */
async function createVersion(documentId, content, authorId, message) {
  const doc = await Document.findById(documentId);
  if (!doc) throw new Error('Document not found');

  // Check for duplicate content
  if (doc.currentVersionId) {
    const currentVersion = await Version.findById(doc.currentVersionId);
    if (currentVersion && currentVersion.content === content) {
      const err = new Error('Content is identical to the current version');
      err.statusCode = 409;
      throw err;
    }
  }

  const latestVersion = await Version.findOne({ documentId })
    .sort({ versionNumber: -1 })
    .select('versionNumber');

  const nextNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

  const version = await Version.create({
    documentId,
    versionNumber: nextNumber,
    content,
    author: authorId,
    parentVersionId: doc.currentVersionId,
    message,
  });

  await Document.findByIdAndUpdate(documentId, {
    currentVersionId: version._id,
    $push: { versions: version._id },
  });

  await logAction(documentId, 'EDIT', authorId, {
    versionId: version._id,
    versionNumber: nextNumber,
    message,
  });

  return version;
}

/**
 * Rollback to a specific version (creates a NEW version with old content)
 */
async function rollbackToVersion(documentId, targetVersionId, userId) {
  const doc = await Document.findById(documentId);
  if (!doc) throw new Error('Document not found');

  const targetVersion = await Version.findById(targetVersionId);
  if (!targetVersion) throw new Error('Target version not found');
  if (targetVersion.documentId.toString() !== documentId) {
    throw new Error('Version does not belong to this document');
  }

  // Prevent rollback to current version
  if (doc.currentVersionId && doc.currentVersionId.toString() === targetVersionId) {
    const err = new Error('Cannot rollback to the current version');
    err.statusCode = 409;
    throw err;
  }

  const message = `Rollback to v${targetVersion.versionNumber}`;
  const newVersion = await createVersion(documentId, targetVersion.content, userId, message);

  await logAction(documentId, 'ROLLBACK', userId, {
    fromVersionId: doc.currentVersionId,
    toVersionId: targetVersionId,
    newVersionId: newVersion._id,
    versionNumber: newVersion.versionNumber,
  });

  return newVersion;
}

/**
 * Approve a specific version (approver only)
 */
async function approveVersion(versionId, userId) {
  const version = await Version.findById(versionId);
  if (!version) throw new Error('Version not found');

  if (version.isApproved) {
    const err = new Error('Version is already approved');
    err.statusCode = 409;
    throw err;
  }

  version.isApproved = true;
  await version.save();

  await logAction(version.documentId, 'APPROVE', userId, {
    versionId: version._id,
    versionNumber: version.versionNumber,
  });

  return version;
}

module.exports = {
  createInitialVersion,
  createVersion,
  rollbackToVersion,
  approveVersion,
};
