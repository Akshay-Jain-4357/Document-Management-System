import { CheckCircle, Clock, User, RotateCcw } from 'lucide-react';

export default function VersionTimeline({ versions, currentVersionId, selectedVersionId, onSelect, onCompareSelect, compareSelection }) {
  if (!versions || versions.length === 0) {
    return (
      <div className="p-4 text-sm text-slate-400 text-center">
        No versions yet.
      </div>
    );
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-1">
      {versions.map((v) => {
        const isSelected = v._id === selectedVersionId;
        const isCurrent = v._id === currentVersionId;
        const isCompareSelected = compareSelection?.includes(v._id);
        const isRollback = v.message?.startsWith('Rollback');

        return (
          <div
            key={v._id}
            className={`relative p-3 rounded-lg cursor-pointer transition-all border ${
              isSelected
                ? 'bg-brand-600/20 border-brand-500/50'
                : 'bg-slate-800/50 border-slate-700/30 hover:bg-slate-700/50 hover:border-slate-600/50'
            }`}
            onClick={() => onSelect(v._id)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-brand-300">v{v.versionNumber}</span>
                  {isCurrent && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-500/20 text-green-400 border border-green-500/30 rounded">
                      LATEST
                    </span>
                  )}
                  {v.isApproved && (
                    <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                  )}
                  {isRollback && (
                    <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-1 truncate">{v.message}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {v.author?.username || 'Unknown'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(v.createdAt)}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <input
                  type="checkbox"
                  checked={isCompareSelected || false}
                  onChange={(e) => {
                    e.stopPropagation();
                    onCompareSelect(v._id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 rounded border-slate-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-0 bg-slate-700 cursor-pointer"
                  title="Select for comparison"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
