const Diff = require('diff');

/**
 * Compute a line-by-line diff between two content strings
 * Returns structured data for frontend rendering
 */
function computeDiff(oldContent, newContent) {
  if (!oldContent && !newContent) {
    return { changes: [], stats: { additions: 0, deletions: 0, unchanged: 0 } };
  }

  // Fallback for non-text content
  if (isBinaryLike(oldContent) || isBinaryLike(newContent)) {
    return {
      changes: [
        {
          type: 'unchanged',
          value: '⚠️ Cannot display diff for non-text content',
          lineNumber: 1,
        },
      ],
      stats: { additions: 0, deletions: 0, unchanged: 1 },
    };
  }

  const rawDiff = Diff.diffLines(oldContent || '', newContent || '');

  const changes = [];
  let oldLineNum = 1;
  let newLineNum = 1;
  let stats = { additions: 0, deletions: 0, unchanged: 0 };

  for (const part of rawDiff) {
    const lines = part.value.replace(/\n$/, '').split('\n');

    for (const line of lines) {
      if (part.added) {
        changes.push({
          type: 'added',
          value: line,
          newLineNumber: newLineNum++,
          oldLineNumber: null,
        });
        stats.additions++;
      } else if (part.removed) {
        changes.push({
          type: 'removed',
          value: line,
          oldLineNumber: oldLineNum++,
          newLineNumber: null,
        });
        stats.deletions++;
      } else {
        changes.push({
          type: 'unchanged',
          value: line,
          oldLineNumber: oldLineNum++,
          newLineNumber: newLineNum++,
        });
        stats.unchanged++;
      }
    }
  }

  return { changes, stats };
}

/**
 * Simple heuristic to detect binary-like content
 */
function isBinaryLike(content) {
  if (!content) return false;
  // Check for high ratio of null bytes or control characters
  const controlChars = content.slice(0, 1000).split('').filter((c) => {
    const code = c.charCodeAt(0);
    return code < 8 || (code > 13 && code < 32);
  });
  return controlChars.length > 10;
}

module.exports = { computeDiff };
