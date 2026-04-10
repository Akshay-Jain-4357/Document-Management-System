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
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8 page-enter">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => docId ? navigate(`/document/${docId}`) : navigate(-1)}
            className="p-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-all shadow-sm active:scale-[0.98]"
            title="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <GitCompare className="h-4.5 w-4.5 text-purple-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Version Comparison</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin h-8 w-8 border-2 border-brand-200 border-t-brand-600 rounded-full" />
              <span className="text-sm text-gray-400">Loading comparison...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Version Info Cards */}
            {v1Info && v2Info && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* Old Version Card */}
                <div className="p-4 bg-white border border-red-200/60 rounded-2xl shadow-card relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-400"></div>
                  <div className="flex justify-between items-start mb-2pl-1">
                    <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                      <span>v{v1Info.versionNumber}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-red-50 text-red-600 rounded-md uppercase tracking-wider">Old</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 truncate mb-3 font-medium">{v1Info.message}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-gray-400" />{v1Info.author?.username}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-gray-400" />{formatDate(v1Info.createdAt)}</span>
                  </div>
                </div>

                {/* New Version Card */}
                <div className="p-4 bg-white border border-emerald-200/60 rounded-2xl shadow-card relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400"></div>
                  <div className="flex justify-between items-start mb-2pl-1">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                      <span>v{v2Info.versionNumber}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md uppercase tracking-wider">New</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 truncate mb-3 font-medium">{v2Info.message}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-gray-400" />{v2Info.author?.username}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-gray-400" />{formatDate(v2Info.createdAt)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Diff View Container */}
            <div className="animate-slide-up">
              <DiffViewer diffData={diffData} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
