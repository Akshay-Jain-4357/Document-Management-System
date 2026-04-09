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
  FileText, Shield, Edit3, Eye, X,
} from 'lucide-react';

export default function DocumentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    currentDocument,
    versions,
    fetchDocument,
    fetchVersions,
  } = useDocuments();

  // The version currently displayed in the content panel (can be any version from timeline)
  const [displayedVersion, setDisplayedVersion] = useState(null);
  // The latest version of the document (always the HEAD)
  const [latestVersion, setLatestVersion] = useState(null);

  const [editContent, setEditContent] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [compareSelection, setCompareSelection] = useState([]);
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Load document and versions, set initial displayed version to the latest
  const loadDocument = useCallback(async () => {
    try {
      const data = await fetchDocument(id);
      const versionData = await fetchVersions(id);

      // Set the latest (current HEAD) version
      const head = data.currentVersion;
      setLatestVersion(head);

      // Default display is the latest version
      if (head) {
        setDisplayedVersion(head);
        setEditContent(head.content || '');
      }
    } catch (err) {
      toast.error('Failed to load document');
      navigate('/');
    }
  }, [id, fetchDocument, fetchVersions, navigate]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // When user clicks a version in the timeline — fetch full version content and display it
  const handleSelectVersion = async (versionId) => {
    try {
      const res = await api.get(`/versions/${versionId}`);
      const v = res.data.version;
      setDisplayedVersion(v);
      setEditContent(v.content || '');
      setIsEditing(false); // switching versions exits editing mode
    } catch (err) {
      toast.error('Failed to fetch version');
    }
  };

  const handleCompareSelect = (versionId) => {
    setCompareSelection((prev) => {
      if (prev.includes(versionId)) return prev.filter((vid) => vid !== versionId);
      if (prev.length >= 2) return [prev[1], versionId];
      return [...prev, versionId];
    });
  };

  const handleCompare = () => {
    if (compareSelection.length === 2) {
      navigate(`/diff?version1=${compareSelection[0]}&version2=${compareSelection[1]}&docId=${id}`);
    }
  };

  // Creates a NEW version from current editor content
  const handleSaveVersion = async () => {
    if (!editContent.trim()) {
      toast.error('Content cannot be empty');
      return;
    }
    if (!commitMessage.trim()) {
      toast.error('A commit message is required to save a new version');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post(`/documents/${id}/version`, {
        content: editContent,
        message: commitMessage,
      });
      toast.success(`✅ Version v${res.data.version.versionNumber} created!`);
      setCommitMessage('');
      setIsEditing(false);
      await loadDocument(); // refresh to show new version in timeline
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save version';
      // 409 = identical content — give a helpful message
      if (err.response?.status === 409) {
        toast.error('⚠️ No changes detected. Edit the content before committing.');
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  // Rollback creates a NEW version with the SELECTED (displayed) version's content
  const handleRollback = async () => {
    if (!displayedVersion) return;
    try {
      const res = await api.post(`/versions/${displayedVersion._id}/rollback`);
      toast.success(`↩️ Rolled back! New version v${res.data.version.versionNumber} created.`);
      setShowRollbackModal(false);
      await loadDocument();
    } catch (err) {
      const msg = err.response?.data?.error || 'Rollback failed';
      toast.error(msg);
    }
  };

  // Approve the SELECTED (displayed) version
  const handleApprove = async () => {
    if (!displayedVersion) return;
    try {
      await api.post(`/versions/${displayedVersion._id}/approve`);
      toast.success(`✅ Version v${displayedVersion.versionNumber} approved!`);
      // Update displayed version locally to show approved badge immediately
      setDisplayedVersion((v) => ({ ...v, isApproved: true }));
      await loadDocument();
    } catch (err) {
      const msg = err.response?.data?.error || 'Approval failed';
      toast.error(msg);
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
    if (activeTab === 'audit') loadAuditLog();
  }, [activeTab]);

  // Permission checks — liberal: owner, admin, or any listed editor/approver
  const isOwner =
    currentDocument?.accessControl?.owner?._id === user?.id ||
    currentDocument?.accessControl?.owner === user?.id;
  const isEditor =
    isOwner ||
    user?.role === 'admin' ||
    user?.role === 'editor' ||
    currentDocument?.accessControl?.editors?.some((e) => (e._id || e) === user?.id);
  const isApprover =
    isOwner ||
    user?.role === 'admin' ||
    user?.role === 'approver' ||
    currentDocument?.accessControl?.approvers?.some((a) => (a._id || a) === user?.id);

  // Determine if displayed version is the latest HEAD
  const isLatestVersion =
    displayedVersion?._id === (latestVersion?._id || currentDocument?.currentVersionId?._id || currentDocument?.currentVersionId);

  const isDisplayedApproved = displayedVersion?.isApproved;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const getActionColor = (action) => {
    const map = {
      CREATE: 'text-green-400 bg-green-500/10',
      EDIT: 'text-blue-400 bg-blue-500/10',
      ROLLBACK: 'text-amber-400 bg-amber-500/10',
      APPROVE: 'text-purple-400 bg-purple-500/10',
      ACCESS_CHANGE: 'text-cyan-400 bg-cyan-500/10',
    };
    return map[action] || 'text-slate-400 bg-slate-500/10';
  };

  if (!currentDocument) {
    return (
      <div className="min-h-screen bg-brand-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin h-8 w-8 border-2 border-brand-400/30 border-t-brand-400 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-950">
      <Navbar />

      {/* ── Top Bar ────────────────────────────────────────────── */}
      <div className="bg-slate-800/40 border-b border-slate-700/30 sticky top-16 z-40">
        <div className="max-w-[1600px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => navigate('/')}
                className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5 text-slate-400" />
              </button>
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-white flex items-center gap-2 truncate">
                  <FileText className="h-4 w-4 text-brand-400 flex-shrink-0" />
                  {currentDocument.title}
                </h1>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                  <span>by {currentDocument.createdBy?.username}</span>
                  {displayedVersion && (
                    <span className="text-brand-400 font-medium">
                      Viewing v{displayedVersion.versionNumber}
                      {isLatestVersion && <span className="ml-1 text-green-400">(latest)</span>}
                    </span>
                  )}
                  {isDisplayedApproved && (
                    <span className="flex items-center gap-1 text-green-400">
                      <CheckCircle className="h-3 w-3" /> Approved
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons — all operate on the DISPLAYED (selected) version */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Compare — shown when 2 versions ticked */}
              {compareSelection.length === 2 && (
                <button
                  onClick={handleCompare}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <GitCompare className="h-4 w-4" />
                  Compare Selected
                </button>
              )}

              {/* Approve — shown when displayed version is NOT yet approved and user is approver */}
              {isApprover && displayedVersion && !isDisplayedApproved && (
                <button
                  onClick={handleApprove}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
                  title={`Approve version v${displayedVersion.versionNumber}`}
                >
                  <Shield className="h-4 w-4" />
                  Approve v{displayedVersion.versionNumber}
                </button>
              )}

              {/* Rollback — shown for editors when viewing a non-latest version */}
              {isEditor && displayedVersion && !isLatestVersion && (
                <button
                  onClick={() => setShowRollbackModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
                  title={`Rollback to v${displayedVersion.versionNumber}`}
                >
                  <RotateCcw className="h-4 w-4" />
                  Rollback to v{displayedVersion.versionNumber}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────── */}
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="flex gap-6">

          {/* ── SIDEBAR: Version Timeline ──────────────────────── */}
          <div className="w-72 flex-shrink-0">
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl overflow-hidden sticky top-32">
              <div className="p-3 border-b border-slate-700/30 bg-slate-800/50">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <History className="h-4 w-4 text-brand-400" />
                  Version History
                  <span className="ml-auto text-xs text-slate-500">{versions.length} versions</span>
                </h2>
                {compareSelection.length > 0 && (
                  <p className="text-[11px] text-purple-400 mt-1.5">
                    {compareSelection.length}/2 selected — {compareSelection.length < 2 ? 'pick one more to compare' : 'ready to compare!'}
                  </p>
                )}
                {compareSelection.length > 0 && (
                  <button
                    onClick={() => setCompareSelection([])}
                    className="text-[11px] text-slate-500 hover:text-red-400 mt-0.5 flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Clear selection
                  </button>
                )}
              </div>
              <div className="max-h-[calc(100vh-260px)] overflow-y-auto p-2">
                <VersionTimeline
                  versions={versions}
                  currentVersionId={currentDocument.currentVersionId?._id || currentDocument.currentVersionId}
                  selectedVersionId={displayedVersion?._id}
                  onSelect={handleSelectVersion}
                  onCompareSelect={handleCompareSelect}
                  compareSelection={compareSelection}
                />
              </div>
            </div>
          </div>

          {/* ── MAIN PANEL ──────────────────────────────────────── */}
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
                {/* Edit mode toggle — only for editors viewing the LATEST version */}
                {isEditor && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (!isLatestVersion && !isEditing) {
                          toast('ℹ️ You are editing an old version. Committing will create a new version from this content.', {
                            duration: 4000,
                            icon: '📋',
                          });
                        }
                        setIsEditing(!isEditing);
                      }}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all border ${
                        isEditing
                          ? 'bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-900/30'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {isEditing
                        ? <><Edit3 className="h-4 w-4" /> Editing Mode</>
                        : <><Eye className="h-4 w-4" /> View Mode — Click to Edit</>}
                    </button>

                    {!isLatestVersion && (
                      <span className="text-xs px-2 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-md">
                        Viewing v{displayedVersion?.versionNumber} — not the latest
                      </span>
                    )}
                  </div>
                )}

                {/* Content Area */}
                <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl overflow-hidden">
                  {isEditing ? (
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full min-h-[520px] p-5 bg-transparent text-slate-200 text-sm font-mono resize-y focus:outline-none leading-relaxed"
                      placeholder="Enter document content..."
                      autoFocus
                    />
                  ) : (
                    <pre className="p-5 text-sm text-slate-300 font-mono whitespace-pre-wrap break-words min-h-[520px] leading-relaxed">
                      {editContent || 'No content.'}
                    </pre>
                  )}
                </div>

                {/* Commit Controls — shown in edit mode */}
                {isEditing && (
                  <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-4">
                    <p className="text-xs text-slate-400 mb-3">
                      Committing will create a <span className="text-brand-400 font-medium">new version</span> of this document.
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="Describe your changes (e.g., 'Fixed typo in section 2')"
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        className="flex-1 px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSaveVersion(); }}
                      />
                      <button
                        onClick={handleSaveVersion}
                        disabled={saving || !commitMessage.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm whitespace-nowrap"
                      >
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Commit New Version'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditContent(displayedVersion?.content || '');
                        }}
                        className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                        title="Cancel editing"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Audit Log Tab */
              <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl overflow-hidden">
                <div className="p-3 border-b border-slate-700/30 bg-slate-800/50 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Full Audit Trail</h3>
                  <button
                    onClick={loadAuditLog}
                    className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    Refresh
                  </button>
                </div>
                {loadingAudit ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin h-6 w-6 border-2 border-brand-400/30 border-t-brand-400 rounded-full" />
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">No audit entries yet.</div>
                ) : (
                  <div className="divide-y divide-slate-700/30">
                    {auditLogs.map((log) => (
                      <div key={log._id} className="flex items-start gap-4 px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-md flex-shrink-0 mt-0.5 ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-300">
                            <span className="font-medium text-white">{log.performedBy?.username || 'System'}</span>
                            {' '}·{' '}
                            {log.action === 'CREATE' && 'Created document'}
                            {log.action === 'EDIT' && `Committed new version`}
                            {log.action === 'ROLLBACK' && `Rolled back`}
                            {log.action === 'APPROVE' && `Approved version`}
                            {log.action === 'ACCESS_CHANGE' && 'Changed access control'}
                            {log.metadata?.versionNumber && (
                              <span className="text-brand-400 ml-1">v{log.metadata.versionNumber}</span>
                            )}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500 flex-shrink-0 mt-0.5">{formatDate(log.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rollback Confirmation Modal */}
      <ConfirmModal
        isOpen={showRollbackModal}
        title={`Rollback to v${displayedVersion?.versionNumber}?`}
        message={`This will create a NEW version with the content from v${displayedVersion?.versionNumber} (authored by ${displayedVersion?.author?.username}). The action is recorded in the audit log.`}
        confirmText={`Rollback to v${displayedVersion?.versionNumber}`}
        danger
        onConfirm={handleRollback}
        onCancel={() => setShowRollbackModal(false)}
      />
    </div>
  );
}
