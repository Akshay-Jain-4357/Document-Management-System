import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocuments } from '../context/DocumentContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import VersionTimeline from '../components/VersionTimeline';
import ConfirmModal from '../components/ConfirmModal';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Save, RotateCcw, CheckCircle, GitCompare, History,
  FileText, Shield, Edit3, Eye,
} from 'lucide-react';

export default function DocumentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentDocument, currentVersion, versions, fetchDocument, fetchVersions, selectVersion } = useDocuments();

  const [editContent, setEditContent] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [compareSelection, setCompareSelection] = useState([]);
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState(null);
  const [activeTab, setActiveTab] = useState('content'); // 'content' | 'audit'
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const loadDocument = useCallback(async () => {
    try {
      const data = await fetchDocument(id);
      if (data.currentVersion) {
        setEditContent(data.currentVersion.content || '');
      }
      await fetchVersions(id);
    } catch (err) {
      toast.error('Failed to load document');
      navigate('/');
    }
  }, [id, fetchDocument, fetchVersions, navigate]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const handleSelectVersion = async (versionId) => {
    const version = await selectVersion(versionId);
    if (version) {
      setEditContent(version.content || '');
      setIsEditing(false);
    }
  };

  const handleCompareSelect = (versionId) => {
    setCompareSelection((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((id) => id !== versionId);
      }
      if (prev.length >= 2) {
        return [prev[1], versionId]; // Replace oldest selection
      }
      return [...prev, versionId];
    });
  };

  const handleCompare = () => {
    if (compareSelection.length === 2) {
      navigate(`/diff?version1=${compareSelection[0]}&version2=${compareSelection[1]}&docId=${id}`);
    }
  };

  const handleSaveVersion = async () => {
    if (!editContent.trim()) {
      toast.error('Content cannot be empty');
      return;
    }
    if (!commitMessage.trim()) {
      toast.error('Commit message is required');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/documents/${id}/version`, {
        content: editContent,
        message: commitMessage,
      });
      toast.success('New version created!');
      setCommitMessage('');
      setIsEditing(false);
      await loadDocument();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleRollback = async () => {
    if (!rollbackTarget) return;
    try {
      await api.post(`/versions/${rollbackTarget}/rollback`);
      toast.success('Rolled back successfully!');
      setShowRollbackModal(false);
      setRollbackTarget(null);
      await loadDocument();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Rollback failed');
    }
  };

  const handleApprove = async (versionId) => {
    try {
      await api.post(`/versions/${versionId}/approve`);
      toast.success('Version approved!');
      await loadDocument();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Approval failed');
    }
  };

  const loadAuditLog = async () => {
    setLoadingAudit(true);
    try {
      const res = await api.get(`/documents/${id}/audit`);
      setAuditLogs(res.data.logs || []);
    } catch (err) {
      toast.error('Failed to load audit log');
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLog();
    }
  }, [activeTab]);

  // Permission checks
  const isOwner = currentDocument?.accessControl?.owner?._id === user?.id ||
    currentDocument?.accessControl?.owner === user?.id;
  const isEditor = isOwner || user?.role === 'admin' ||
    currentDocument?.accessControl?.editors?.some(
      (e) => (e._id || e) === user?.id
    );
  const isApprover = isOwner || user?.role === 'admin' || user?.role === 'approver' ||
    currentDocument?.accessControl?.approvers?.some(
      (a) => (a._id || a) === user?.id
    );

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE': return 'text-green-400 bg-green-500/10';
      case 'EDIT': return 'text-blue-400 bg-blue-500/10';
      case 'ROLLBACK': return 'text-amber-400 bg-amber-500/10';
      case 'APPROVE': return 'text-purple-400 bg-purple-500/10';
      case 'ACCESS_CHANGE': return 'text-cyan-400 bg-cyan-500/10';
      default: return 'text-slate-400 bg-slate-500/10';
    }
  };

  if (!currentDocument) {
    return (
      <div className="min-h-screen bg-brand-950">
        <Navbar />
        <div className="flex justify-center pt-20">
          <div className="animate-spin h-8 w-8 border-2 border-brand-400/30 border-t-brand-400 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-950">
      <Navbar />

      {/* Top Bar */}
      <div className="bg-slate-800/40 border-b border-slate-700/30">
        <div className="max-w-[1600px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-slate-400" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-400" />
                  {currentDocument.title}
                </h1>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span>by {currentDocument.createdBy?.username}</span>
                  {currentVersion && (
                    <span className="text-brand-400">v{currentVersion.versionNumber}</span>
                  )}
                  {currentVersion?.isApproved && (
                    <span className="flex items-center gap-1 text-green-400">
                      <CheckCircle className="h-3 w-3" /> Approved
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {compareSelection.length === 2 && (
                <button
                  onClick={handleCompare}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <GitCompare className="h-4 w-4" />
                  Compare Selected
                </button>
              )}
              {isApprover && currentVersion && !currentVersion.isApproved && (
                <button
                  onClick={() => handleApprove(currentVersion._id)}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Shield className="h-4 w-4" />
                  Approve
                </button>
              )}
              {isEditor && currentVersion && (
                <button
                  onClick={() => {
                    setRollbackTarget(currentVersion._id);
                    setShowRollbackModal(true);
                  }}
                  disabled={versions.length < 2}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                  title={versions.length < 2 ? 'Need at least 2 versions to rollback' : 'Rollback to this version'}
                >
                  <RotateCcw className="h-4 w-4" />
                  Rollback
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar — Version Timeline */}
          <div className="w-72 flex-shrink-0">
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl overflow-hidden sticky top-24">
              <div className="p-3 border-b border-slate-700/30 bg-slate-800/50">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <History className="h-4 w-4 text-brand-400" />
                  Version History
                </h2>
                {compareSelection.length > 0 && (
                  <p className="text-[11px] text-brand-400 mt-1">
                    {compareSelection.length}/2 selected for comparison
                  </p>
                )}
              </div>
              <div className="max-h-[calc(100vh-220px)] overflow-y-auto p-2">
                <VersionTimeline
                  versions={versions}
                  currentVersionId={currentDocument.currentVersionId?._id || currentDocument.currentVersionId}
                  selectedVersionId={currentVersion?._id}
                  onSelect={handleSelectVersion}
                  onCompareSelect={handleCompareSelect}
                  compareSelection={compareSelection}
                />
              </div>
            </div>
          </div>

          {/* Main Panel */}
          <div className="flex-1 min-w-0">
            {/* Tab Switcher */}
            <div className="flex items-center gap-1 mb-4 bg-slate-800/30 p-1 rounded-lg border border-slate-700/30 w-fit">
              <button
                onClick={() => setActiveTab('content')}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors ${
                  activeTab === 'content' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="h-4 w-4" />
                Content
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors ${
                  activeTab === 'audit' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <History className="h-4 w-4" />
                Audit Log
              </button>
            </div>

            {activeTab === 'content' ? (
              <div className="space-y-4">
                {/* Editor Toggle */}
                {isEditor && (
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isEditing
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {isEditing ? <><Edit3 className="h-4 w-4" /> Editing</> : <><Eye className="h-4 w-4" /> Viewing</>}
                    </button>
                  </div>
                )}

                {/* Content Area */}
                <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl overflow-hidden">
                  {isEditing ? (
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full min-h-[500px] p-4 bg-transparent text-slate-200 text-sm font-mono resize-y focus:outline-none"
                      placeholder="Enter document content..."
                    />
                  ) : (
                    <pre className="p-4 text-sm text-slate-200 font-mono whitespace-pre-wrap break-words min-h-[500px]">
                      {editContent || 'No content.'}
                    </pre>
                  )}
                </div>

                {/* Save Version Controls */}
                {isEditing && (
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Commit message (e.g., 'Fixed typo in section 2')"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveVersion();
                      }}
                    />
                    <button
                      onClick={handleSaveVersion}
                      disabled={saving || !commitMessage.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? 'Saving...' : 'Commit Version'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Audit Log Tab */
              <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl overflow-hidden">
                {loadingAudit ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin h-6 w-6 border-2 border-brand-400/30 border-t-brand-400 rounded-full" />
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">No audit entries yet.</div>
                ) : (
                  <div className="divide-y divide-slate-700/30">
                    {auditLogs.map((log) => (
                      <div key={log._id} className="flex items-center gap-4 px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-md ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-300">
                            <span className="font-medium text-white">{log.performedBy?.username || 'System'}</span>
                            {' '}performed {log.action.toLowerCase()}
                            {log.metadata?.versionNumber && ` on v${log.metadata.versionNumber}`}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500 flex-shrink-0">{formatDate(log.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rollback Modal */}
      <ConfirmModal
        isOpen={showRollbackModal}
        title="Rollback Version"
        message="This will create a NEW version with the content from the selected version. This action is recorded in the audit log."
        confirmText="Rollback"
        danger
        onConfirm={handleRollback}
        onCancel={() => { setShowRollbackModal(false); setRollbackTarget(null); }}
      />
    </div>
  );
}
