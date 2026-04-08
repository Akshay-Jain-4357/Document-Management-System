import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocuments } from '../context/DocumentContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import FileUpload from '../components/FileUpload';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, FileText, Upload, Clock, User, CheckCircle, X, Search } from 'lucide-react';

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
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
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

  return (
    <div className="min-h-screen bg-brand-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Documents</h1>
            <p className="text-slate-400 text-sm mt-1">
              {pagination.total} document{pagination.total !== 1 ? 's' : ''} in your workspace
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors text-sm border border-slate-600"
            >
              <Upload className="h-4 w-4" />
              Upload
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-lg transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              New Document
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Documents List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-brand-400/30 border-t-brand-400 rounded-full" />
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">
              {searchQuery ? 'No matching documents' : 'No documents yet'}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {searchQuery ? 'Try a different search term.' : 'Create your first document to get started.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-lg transition-colors text-sm"
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
                className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-5 hover:bg-slate-800/70 hover:border-slate-600/50 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-brand-400 flex-shrink-0" />
                      <h3 className="text-base font-semibold text-white group-hover:text-brand-300 transition-colors truncate">
                        {doc.title}
                      </h3>
                      {doc.currentVersionId?.isApproved && (
                        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {doc.createdBy?.username || 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(doc.updatedAt)}
                      </span>
                      <span className="text-brand-400/70">
                        {doc.versions?.length || 0} version{doc.versions?.length !== 1 ? 's' : ''}
                      </span>
                      {doc.currentVersionId?.versionNumber && (
                        <span className="text-slate-400">
                          Latest: v{doc.currentVersionId.versionNumber}
                        </span>
                      )}
                    </div>
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
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  p === pagination.page
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">New Document</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-slate-700 rounded-lg">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateDocument} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Title</label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="My Document"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Content</label>
                <textarea
                  required
                  rows={8}
                  value={createForm.content}
                  onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-mono resize-none"
                  placeholder="Enter your document content here..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Commit Message</label>
                <input
                  type="text"
                  value={createForm.message}
                  onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="Initial version (optional)"
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors text-sm"
              >
                {creating ? 'Creating...' : 'Create Document'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Upload Document</h3>
              <button onClick={() => setShowUploadModal(false)} className="p-1 hover:bg-slate-700 rounded-lg">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <FileUpload onUpload={handleUpload} />
          </div>
        </div>
      )}
    </div>
  );
}
