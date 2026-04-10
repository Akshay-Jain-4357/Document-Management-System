import { useState } from 'react';
import { Columns, AlignJustify } from 'lucide-react';

export default function DiffViewer({ diffData }) {
  const [viewMode, setViewMode] = useState('inline'); // 'inline' | 'split'

  if (!diffData || !diffData.changes || diffData.changes.length === 0) {
    return (
      <div className="text-center text-gray-400 py-12 bg-gray-50 border border-gray-200 rounded-xl">
        No diff data available.
      </div>
    );
  }

  const { changes, stats } = diffData;

  return (
    <div>
      {/* ── Stats + View Toggle ─────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 p-3.5 bg-white rounded-xl border border-gray-200 shadow-card">
        <div className="flex items-center gap-5 text-sm font-medium">
          <span className="flex items-center gap-2 text-emerald-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            +{stats.additions} additions
          </span>
          <span className="flex items-center gap-2 text-red-700">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
            -{stats.deletions} deletions
          </span>
          <span className="text-gray-400 text-xs">{stats.unchanged} unchanged</span>
        </div>

        {/* View mode selector */}
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('inline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === 'inline'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <AlignJustify className="h-3.5 w-3.5" />
            Inline
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === 'split'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Columns className="h-3.5 w-3.5" />
            Side by Side
          </button>
        </div>
      </div>

      {/* ── Diff Content ───────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-card">
        {viewMode === 'inline'
          ? <InlineDiff changes={changes} />
          : <SplitDiff changes={changes} />
        }
      </div>
    </div>
  );
}

/* ── Inline View ───────────────────────────────────────────── */
function InlineDiff({ changes }) {
  return (
    <div className="font-mono text-xs overflow-x-auto">
      {/* Header */}
      <div className="grid bg-gray-50 border-b border-gray-200 text-gray-400 text-[10px] font-semibold uppercase tracking-wider px-2 py-2">
        <div className="grid grid-cols-[48px_48px_24px_1fr]">
          <span className="text-center">Old</span>
          <span className="text-center">New</span>
          <span></span>
          <span className="pl-2">Content</span>
        </div>
      </div>

      {changes.map((change, i) => (
        <div
          key={i}
          className={`grid grid-cols-[48px_48px_24px_1fr] items-stretch ${getLineBg(change.type)}`}
        >
          <span className="text-right pr-3 py-0.5 text-gray-400 select-none border-r border-gray-100 text-[11px] leading-5">
            {change.oldLineNumber ?? ''}
          </span>
          <span className="text-right pr-3 py-0.5 text-gray-400 select-none border-r border-gray-100 text-[11px] leading-5">
            {change.newLineNumber ?? ''}
          </span>
          <span className={`text-center py-0.5 font-bold text-[11px] leading-5 select-none ${getLineSymbolColor(change.type)}`}>
            {change.type === 'added' ? '+' : change.type === 'removed' ? '-' : ' '}
          </span>
          <span className="pl-3 py-0.5 whitespace-pre-wrap break-all leading-5 text-[12px] text-gray-800">
            {change.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Split View ────────────────────────────────────────────── */
function SplitDiff({ changes }) {
  // Build paired left (old) / right (new) lines
  const leftLines = [];
  const rightLines = [];

  let i = 0;
  while (i < changes.length) {
    const c = changes[i];

    if (c.type === 'unchanged') {
      leftLines.push(c);
      rightLines.push(c);
      i++;
    } else if (c.type === 'removed') {
      // Peek ahead — if next line is 'added', pair them
      const next = changes[i + 1];
      if (next && next.type === 'added') {
        leftLines.push(c);
        rightLines.push(next);
        i += 2;
      } else {
        leftLines.push(c);
        rightLines.push({ type: 'empty', value: '' });
        i++;
      }
    } else if (c.type === 'added') {
      leftLines.push({ type: 'empty', value: '' });
      rightLines.push(c);
      i++;
    } else {
      i++;
    }
  }

  return (
    <div className="font-mono text-xs flex divide-x divide-gray-200 overflow-x-auto">
      {/* Left (Old) */}
      <div className="w-1/2 min-w-0">
        <div className="bg-red-50 border-b border-gray-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-red-600/70">
          Old Version
        </div>
        {leftLines.map((c, idx) => (
          <SplitLine key={idx} change={c} side="left" />
        ))}
      </div>
      {/* Right (New) */}
      <div className="w-1/2 min-w-0">
        <div className="bg-emerald-50 border-b border-gray-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-600/70">
          New Version
        </div>
        {rightLines.map((c, idx) => (
          <SplitLine key={idx} change={c} side="right" />
        ))}
      </div>
    </div>
  );
}

function SplitLine({ change, side }) {
  const lineNum = side === 'left' ? change.oldLineNumber : change.newLineNumber;
  if (change.type === 'empty') {
    return (
      <div className="flex bg-gray-50/50 min-h-[22px]">
        <span className="w-10 flex-shrink-0 text-right pr-2 text-gray-300 select-none border-r border-gray-100 text-[11px] leading-5 py-0.5">
        </span>
        <span className="flex-1 px-2 py-0.5 leading-5" />
      </div>
    );
  }
  return (
    <div className={`flex ${getLineBg(change.type)} min-h-[22px]`}>
      <span className="w-10 flex-shrink-0 text-right pr-2 text-gray-400 select-none border-r border-gray-100 text-[11px] leading-5 py-0.5">
        {lineNum ?? ''}
      </span>
      <span className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all leading-5 text-[12px] text-gray-800">
        {change.value}
      </span>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────── */
function getLineBg(type) {
  switch (type) {
    case 'added':   return 'bg-emerald-50 border-l-2 border-emerald-500';
    case 'removed': return 'bg-red-50 border-l-2 border-red-500';
    default:        return 'border-l-2 border-transparent';
  }
}

function getLineSymbolColor(type) {
  switch (type) {
    case 'added':   return 'text-emerald-600';
    case 'removed': return 'text-red-600';
    default:        return 'text-gray-300';
  }
}
