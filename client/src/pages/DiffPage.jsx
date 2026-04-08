import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import DiffViewer from '../components/DiffViewer';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, GitCompare, User, Clock } from 'lucide-react';

export default function DiffPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const version1 = searchParams.get('version1');
  const version2 = searchParams.get('version2');
  const docId = searchParams.get('docId');

  const [diffData, setDiffData] = useState(null);
  const [v1Info, setV1Info] = useState(null);
  const [v2Info, setV2Info] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!version1 || !version2) {
      toast.error('Two versions required for comparison');
      navigate(-1);
      return;
    }

    const fetchDiff = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/versions/diff?version1=${version1}&version2=${version2}`);
        setDiffData(res.data.diff);
        setV1Info(res.data.version1);
        setV2Info(res.data.version2);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to load diff');
      } finally {
        setLoading(false);
      }
    };

    fetchDiff();
  }, [version1, version2, navigate]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-brand-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => docId ? navigate(`/document/${docId}`) : navigate(-1)}
            className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-400" />
          </button>
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-purple-400" />
            <h1 className="text-lg font-semibold text-white">Version Comparison</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-brand-400/30 border-t-brand-400 rounded-full" />
          </div>
        ) : (
          <>
            {/* Version Info Cards */}
            {v1Info && v2Info && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                  <div className="flex items-center gap-2 text-red-400 font-semibold text-sm mb-2">
                    <span>v{v1Info.versionNumber}</span>
                    <span className="text-xs font-normal text-red-300/60">— Old</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mb-1">{v1Info.message}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{v1Info.author?.username}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(v1Info.createdAt)}</span>
                  </div>
                </div>
                <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                  <div className="flex items-center gap-2 text-green-400 font-semibold text-sm mb-2">
                    <span>v{v2Info.versionNumber}</span>
                    <span className="text-xs font-normal text-green-300/60">— New</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mb-1">{v2Info.message}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{v2Info.author?.username}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(v2Info.createdAt)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Diff */}
            <DiffViewer diffData={diffData} />
          </>
        )}
      </div>
    </div>
  );
}
