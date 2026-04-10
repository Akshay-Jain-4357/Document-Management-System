import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocuments } from '../context/DocumentContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import FileUpload from '../components/FileUpload';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, FileText, Upload, Clock, User, CheckCircle, X, Search, FolderOpen, GitBranch, Shield } from 'lucide-react';

export default function DashboardPage() {
  const { documents, pagination, loading, fetchDocuments } = useDocuments();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', content: '', message: '' });
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleCreateDocument = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    setCreating(true);
    try {
      await api.post('/documents', {
        title: createForm.title,
        content: createForm.content,
        message: createForm.message || 'Initial version',
      });
      toast.success('Document created!');
      setShowCreateModal(false);
      setCreateForm({ title: '', content: '', message: '' });
      fetchDocuments();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create');
    } finally {
      setCreating(false);
    }
  };

  const handleUpload = async (formData) => {
    try {
      // DO NOT manually set Content-Type for multipart/form-data
      // Axios auto-generates the boundary when it detects FormData
      await api.post('/documents/upload', formData);
      toast.success('Document uploaded!');
      setShowUploadModal(false);
      fetchDocuments();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    }
  };

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  // Stats
  const totalDocs = pagination.total || 0;
  const approvedDocs = documents.filter(d => d.currentVersionId?.isApproved).length;
  const totalVersions = documents.reduce((sum, d) => sum + (d.versions?.length || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">

        {/* ── Welcome + Stats ────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.username || 'User'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Here's an overview of your document workspace.
          </p>
        </div>

        {/* ── Summary Cards ──────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                <FolderOpen className="h-5 w-5 text-brand-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalDocs}</p>
                <p className="text-xs text-gray-500 font-medium">Total Documents</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{approvedDocs}</p>
                <p className="text-xs text-gray-500 font-medium">Approved</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <GitBranch className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalVersions}</p>
                <p className="text-xs text-gray-500 font-medium">Total Versions</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Toolbar: Search + Actions ──────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all shadow-card"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-all text-sm border border-gray-300 shadow-card active:scale-[0.98]"
            >
              <Upload className="h-4 w-4 text-gray-500" />
              Upload
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-all text-sm shadow-sm shadow-brand-200 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              New Document
            </button>
          </div>
        </div>

        {/* ── Documents List ─────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin h-8 w-8 border-2 border-brand-200 border-t-brand-600 rounded-full" />
              <span className="text-sm text-gray-400">Loading documents...</span>
            </div>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
              <FileText className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {searchQuery ? 'No matching documents' : 'No documents yet'}
            </h3>
            <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
              {searchQuery ? 'Try a different search term.' : 'Create your first document to get started with version control.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-all text-sm shadow-sm shadow-brand-200 active:scale-[0.98]"
              >
                Create Document
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredDocs.map((doc) => (
              <div
                key={doc._id}
                onClick={() => navigate(`/document/${doc._id}`)}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-card-hover hover:border-gray-300 cursor-pointer transition-all group shadow-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">
                        <FileText className="h-4.5 w-4.5 text-brand-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 transition-colors truncate">
                          {doc.title}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {doc.createdBy?.username || 'Unknown'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(doc.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    {doc.currentVersionId?.isApproved && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-medium rounded-md border border-emerald-200">
                        <CheckCircle className="h-3 w-3" />
                        Approved
                      </span>
                    )}
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[11px] font-medium rounded-md">
                      {doc.versions?.length || 0} version{doc.versions?.length !== 1 ? 's' : ''}
                    </span>
                    {doc.currentVersionId?.versionNumber && (
                      <span className="text-[11px] text-gray-400 font-medium">
                        v{doc.currentVersionId.versionNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => fetchDocuments(p)}
                className={`px-3.5 py-2 text-sm rounded-xl transition-all font-medium ${
                  p === pagination.page
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-200'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px] animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-modal animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">New Document</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreateDocument} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
                  placeholder="My Document"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Content</label>
                <textarea
                  required
                  rows={8}
                  value={createForm.content}
                  onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 font-mono resize-none transition-all"
                  placeholder="Enter your document content here..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Commit Message</label>
                <input
                  type="text"
                  value={createForm.message}
                  onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
                  placeholder="Initial version (optional)"
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all active:scale-[0.98] text-sm shadow-sm shadow-brand-200"
              >
                {creating ? 'Creating...' : 'Create Document'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px] animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-modal animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Upload Document</h3>
              <button onClick={() => setShowUploadModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <FileUpload onUpload={handleUpload} />
          </div>
        </div>
      )}
    </div>
  );
}
