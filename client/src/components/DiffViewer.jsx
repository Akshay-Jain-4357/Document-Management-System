import { useState } from 'react';
import { Columns, AlignJustify } from 'lucide-react';

export default function DiffViewer({ diffData }) {
  const [viewMode, setViewMode] = useState('inline'); // 'inline' | 'split'

  if (!diffData || !diffData.changes) {
    return <div className="text-center text-slate-400 py-8">No diff data available.</div>;
  }

  const { changes, stats } = diffData;

  const escapeHtml = (str) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/30">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-400 font-medium">+{stats.additions} additions</span>
          <span className="text-red-400 font-medium">-{stats.deletions} deletions</span>
          <span className="text-slate-400">{stats.unchanged} unchanged</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('inline')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
              viewMode === 'inline' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlignJustify className="h-3 w-3" />
            Inline
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
              viewMode === 'split' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Columns className="h-3 w-3" />
            Split
          </button>
        </div>
      </div>

      {/* Diff Content */}
      <div className="rounded-lg border border-slate-700/30 overflow-hidden">
        {viewMode === 'inline' ? (
          <InlineDiff changes={changes} escapeHtml={escapeHtml} />
        ) : (
          <SplitDiff changes={changes} escapeHtml={escapeHtml} />
        )}
      </div>
    </div>
  );
}

function InlineDiff({ changes, escapeHtml }) {
  return (
    <div className="font-mono text-sm overflow-x-auto">
      {changes.map((change, i) => (
        <div key={i} className={`flex ${getDiffClass(change.type)}`}>
          <span className="w-12 flex-shrink-0 text-right pr-2 text-slate-500 select-none border-r border-slate-700/50 py-0.5 text-xs">
            {change.oldLineNumber || ''}
          </span>
          <span className="w-12 flex-shrink-0 text-right pr-2 text-slate-500 select-none border-r border-slate-700/50 py-0.5 text-xs">
            {change.newLineNumber || ''}
          </span>
          <span className="w-6 flex-shrink-0 text-center select-none py-0.5 text-xs font-bold">
            {change.type === 'added' ? '+' : change.type === 'removed' ? '-' : ' '}
          </span>
          <span className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all">
            {escapeHtml(change.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function SplitDiff({ changes, escapeHtml }) {
  const leftLines = [];
  const rightLines = [];

  let li = 0, ri = 0;
  while (li < changes.length || ri < changes.length) {
    const change = changes[li] || changes[ri];
    if (!change) break;

    if (change.type === 'unchanged') {
      leftLines.push(change);
      rightLines.push(change);
      li++; ri++;
    } else if (change.type === 'removed') {
      leftLines.push(change);
      // Check if next is added (pair them)
      const next = changes[li + 1];
      if (next && next.type === 'added') {
        rightLines.push(next);
        li += 2; ri += 2;
      } else {
        rightLines.push({ type: 'empty', value: '' });
        li++; ri++;
      }
    } else if (change.type === 'added') {
      leftLines.push({ type: 'empty', value: '' });
      rightLines.push(change);
      li++; ri++;
    } else {
      li++; ri++;
    }

    // Safety
    if (li > changes.length + 1 && ri > changes.length + 1) break;
  }

  // Simpler approach: separate removed/added/unchanged
  const left = [];
  const right = [];
  
  for (const c of changes) {
    if (c.type === 'removed') {
      left.push(c);
      right.push({ type: 'empty', value: '', oldLineNumber: null, newLineNumber: null });
    } else if (c.type === 'added') {
      left.push({ type: 'empty', value: '', oldLineNumber: null, newLineNumber: null });
      right.push(c);
    } else {
      left.push(c);
      right.push(c);
    }
  }

  return (
    <div className="font-mono text-sm flex">
      <div className="w-1/2 border-r border-slate-700/50 overflow-x-auto">
        <div className="text-xs font-semibold text-slate-400 px-3 py-2 bg-red-500/10 border-b border-slate-700/50">Old Version</div>
        {left.map((c, i) => (
          <div key={i} className={`flex ${getDiffClass(c.type)}`}>
            <span className="w-10 flex-shrink-0 text-right pr-2 text-slate-500 select-none py-0.5 text-xs">
              {c.oldLineNumber || ''}
            </span>
            <span className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all min-h-[1.5rem]">
              {c.type !== 'empty' ? escapeHtml(c.value) : ''}
            </span>
          </div>
        ))}
      </div>
      <div className="w-1/2 overflow-x-auto">
        <div className="text-xs font-semibold text-slate-400 px-3 py-2 bg-green-500/10 border-b border-slate-700/50">New Version</div>
        {right.map((c, i) => (
          <div key={i} className={`flex ${getDiffClass(c.type)}`}>
            <span className="w-10 flex-shrink-0 text-right pr-2 text-slate-500 select-none py-0.5 text-xs">
              {c.newLineNumber || ''}
            </span>
            <span className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all min-h-[1.5rem]">
              {c.type !== 'empty' ? escapeHtml(c.value) : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getDiffClass(type) {
  switch (type) {
    case 'added': return 'diff-added bg-green-500/5';
    case 'removed': return 'diff-removed bg-red-500/5';
    case 'empty': return 'bg-slate-800/30';
    default: return 'diff-unchanged';
  }
}
