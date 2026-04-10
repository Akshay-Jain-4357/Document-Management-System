import { CheckCircle, Clock, User, RotateCcw } from 'lucide-react';

export default function VersionTimeline({ versions, currentVersionId, selectedVersionId, onSelect, onCompareSelect, compareSelection }) {
  if (!versions || versions.length === 0) {
    return (
      <div className="p-6 text-sm text-gray-400 text-center">
        <div className="w-10 h-10 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
          <Clock className="h-5 w-5 text-gray-300" />
        </div>
        No versions yet.
      </div>
    );
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-1.5">
      {versions.map((v) => {
        const isSelected = v._id === selectedVersionId;
        const isCurrent = v._id === currentVersionId;
        const isCompareSelected = compareSelection?.includes(v._id);
        const isRollback = v.message?.startsWith('Rollback');

        return (
          <div
            key={v._id}
            className={`relative p-3 rounded-xl cursor-pointer transition-all border ${
              isSelected
                ? 'bg-brand-50 border-brand-200 shadow-sm'
                : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200'
            }`}
            onClick={() => onSelect(v._id)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${isSelected ? 'text-brand-700' : 'text-gray-900'}`}>v{v.versionNumber}</span>
                  {isCurrent && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md">
                      LATEST
                    </span>
                  )}
                  {v.isApproved && (
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                  {isRollback && (
                    <RotateCcw className="h-3.5 w-3.5 text-amber-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 truncate">{v.message}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-400">
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
              <div className="flex-shrink-0 pt-0.5">
                <input
                  type="checkbox"
                  checked={isCompareSelected || false}
                  onChange={(e) => {
                    e.stopPropagation();
                    onCompareSelect(v._id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 focus:ring-offset-0 cursor-pointer accent-brand-600"
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
