import { useNavigate } from 'react-router-dom';
import { FileText, User as OwnerIcon, Edit2, Eye, ShieldCheck, Users, Clock, Globe } from 'lucide-react';

export default function DocumentCard({ doc, isExplore }) {
  const navigate = useNavigate();

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const { accessStats, contributorsCount } = doc;

  return (
    <div
      onClick={() => navigate(`/document/${doc.id}`)}
      className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-card-hover hover:border-gray-300 cursor-pointer transition-all flex flex-col group shadow-card h-full"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">
            <FileText className="h-4.5 w-4.5 text-brand-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 transition-colors truncate">
              {doc.title}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              by <span className="font-medium text-gray-600">{doc.owner}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 text-right">
          {isExplore && doc.visibility === 'public' && (
            <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-[11px] font-medium rounded-md border border-blue-200">
              <Globe className="h-3 w-3" />
              Public
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] text-gray-400 ml-1">
            <Clock className="h-3 w-3" />
            {formatDate(doc.updatedAt)}
          </span>
        </div>
      </div>

      <div className="mt-auto">
        <div className="flex items-center gap-4 text-xs font-medium text-gray-500 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
          <div className="flex items-center gap-1.5" title="Owner">
            <OwnerIcon className="h-3.5 w-3.5 text-emerald-600" />
            <span>1</span>
          </div>
          <div className="flex items-center gap-1.5" title="Editors">
            <Edit2 className="h-3.5 w-3.5 text-blue-600" />
            <span>{accessStats?.editors || 0}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Viewers">
            <Eye className="h-3.5 w-3.5 text-purple-600" />
            <span>{accessStats?.viewers || 0}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Approvers">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
            <span>{accessStats?.approvers || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md" title="Total Contributors">
            <Users className="h-3.5 w-3.5" />
            <span>{contributorsCount || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
