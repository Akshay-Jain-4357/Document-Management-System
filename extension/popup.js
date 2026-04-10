// ═══════════════════════════════════════════════════════════
//  OfficeGit Chrome Extension — Popup Logic
//  Features: Login, Dashboard, Upload, New Version
// ═══════════════════════════════════════════════════════════

let API_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', async () => {
  // ── Resolve API URL from storage ──
  const { officegit_api_url } = await chrome.storage.local.get(['officegit_api_url']);
  if (officegit_api_url) API_URL = officegit_api_url;

  // ── DOM references ──
  const views = {
    loading: document.getElementById('loading-view'),
    login: document.getElementById('login-view'),
    dashboard: document.getElementById('dashboard-view'),
  };
  const headerActions = document.getElementById('header-actions');

  // ── Check auth state ──
  const { officegit_token, officegit_user } = await chrome.storage.local.get([
    'officegit_token',
    'officegit_user',
  ]);

  if (officegit_token) {
    try {
      const me = await apiGet('/auth/me', officegit_token);
      const user = me.user || me;
      await chrome.storage.local.set({ officegit_user: JSON.stringify(user) });
      showDashboard(officegit_token, user);
    } catch {
      // Token invalid
      await chrome.storage.local.remove(['officegit_token', 'officegit_user']);
      showView('login');
    }
  } else {
    showView('login');
  }

  // ═══════════════════ HELPERS ═══════════════════

  function showView(name) {
    Object.values(views).forEach((v) => v.classList.add('hidden'));
    views[name]?.classList.remove('hidden');
  }

  function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type}`;
    toast.classList.remove('hidden');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.add('hidden'), 3500);
  }

  function setButtonLoading(btn, loading) {
    const textEl = btn.querySelector('.btn-text');
    const spinnerEl = btn.querySelector('.btn-spinner');
    if (loading) {
      btn.disabled = true;
      if (textEl) textEl.style.opacity = '0.5';
      if (spinnerEl) spinnerEl.classList.remove('hidden');
    } else {
      btn.disabled = false;
      if (textEl) textEl.style.opacity = '1';
      if (spinnerEl) spinnerEl.classList.add('hidden');
    }
  }

  // ═══════════════════ API LAYER ═══════════════════

  async function apiGet(path, token) {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function apiPost(path, body, token) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function apiUpload(path, formData, token) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        await chrome.storage.local.remove(['officegit_token', 'officegit_user']);
        showView('login');
        throw new Error('Session expired — please log in again');
      }
      throw new Error(data.error || 'Upload failed');
    }
    return data;
  }

  // ═══════════════════ LOGIN ═══════════════════

  const loginForm = document.getElementById('login-form');
  const loginBtn = document.getElementById('login-btn');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) return showToast('Please fill both fields', 'error');

    setButtonLoading(loginBtn, true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      const token = data.token;

      // Fetch user profile
      const me = await apiGet('/auth/me', token);
      const user = me.user || me;

      await chrome.storage.local.set({
        officegit_token: token,
        officegit_user: JSON.stringify(user),
      });

      showToast('Welcome back!');
      showDashboard(token, user);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setButtonLoading(loginBtn, false);
    }
  });

  // ═══════════════════ DASHBOARD ═══════════════════

  async function showDashboard(token, user) {
    showView('dashboard');
    renderHeaderUser(user);
    await loadDocuments(token);
    setupUpload(token);
    setupVersioning(token);
    setupTabs();
  }

  function renderHeaderUser(user) {
    const initial = (user.username || user.email || '?')[0];
    headerActions.innerHTML = `
      <div class="user-badge">
        <div class="user-avatar">${initial}</div>
        ${user.username || user.email}
      </div>
      <button class="logout-btn" id="logout-btn" title="Logout">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    `;
    document.getElementById('logout-btn').addEventListener('click', async () => {
      await chrome.storage.local.remove(['officegit_token', 'officegit_user']);
      headerActions.innerHTML = '';
      showView('login');
      showToast('Logged out', 'info');
    });
  }

  // ── Load Documents ──
  async function loadDocuments(token) {
    const listEl = document.getElementById('doc-list');
    const emptyEl = document.getElementById('doc-empty');
    const docSelect = document.getElementById('version-doc');

    listEl.innerHTML = '<div class="spinner-wrap" style="padding:20px 0"><div class="spinner"></div></div>';
    emptyEl.classList.add('hidden');

    try {
      const data = await apiGet('/documents?limit=50', token);
      const docs = data.documents || [];

      // Update badge
      chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', count: docs.length });

      if (docs.length === 0) {
        listEl.innerHTML = '';
        emptyEl.classList.remove('hidden');
      } else {
        emptyEl.classList.add('hidden');
        listEl.innerHTML = docs
          .map((doc) => {
            const ver = doc.currentVersionId;
            const vNum = ver?.versionNumber || 1;
            const approved = ver?.isApproved;
            const date = new Date(doc.updatedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            });
            const badgeClass = approved ? 'badge-approved' : 'badge-pending';
            const badgeText = approved ? '✓ Approved' : 'Pending';

            return `
              <div class="doc-card" data-id="${doc._id}">
                <div class="doc-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div class="doc-info">
                  <div class="doc-title" title="${doc.title}">${doc.title}</div>
                  <div class="doc-meta">
                    <span>v${vNum}</span>
                    <span>•</span>
                    <span>${date}</span>
                    <span class="version-badge ${badgeClass}">${badgeText}</span>
                  </div>
                </div>
                <button class="doc-open" title="Open in OfficeGit" data-id="${doc._id}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </button>
              </div>
            `;
          })
          .join('');

        // Open in main app
        listEl.querySelectorAll('.doc-open').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const docId = btn.dataset.id;
            // Try production URL first, fallback to localhost
            const baseUrl =
              API_URL.includes('localhost')
                ? 'http://localhost:5173'
                : 'https://document-management-system-nine-beryl.vercel.app';
            chrome.tabs.create({ url: `${baseUrl}/documents/${docId}` });
          });
        });
      }

      // Populate version-doc select
      docSelect.innerHTML = '<option value="">— Choose a document —</option>';
      docs.forEach((doc) => {
        const opt = document.createElement('option');
        opt.value = doc._id;
        opt.textContent = doc.title;
        docSelect.appendChild(opt);
      });
    } catch (err) {
      listEl.innerHTML = `<div class="empty-state"><p style="color:var(--danger)">${err.message}</p></div>`;
    }
  }

  // ── Refresh Button ──
  document.getElementById('refresh-btn').addEventListener('click', async () => {
    const { officegit_token } = await chrome.storage.local.get(['officegit_token']);
    if (officegit_token) await loadDocuments(officegit_token);
  });

  // ═══════════════════ TABS ═══════════════════

  function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const panels = {
      upload: document.getElementById('upload-panel'),
      version: document.getElementById('version-panel'),
    };

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        Object.values(panels).forEach((p) => p.classList.add('hidden'));
        panels[tab.dataset.tab]?.classList.remove('hidden');
      });
    });
  }

  // ═══════════════════ FILE UPLOAD ═══════════════════

  function setupUpload(token) {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file');
    const filePreview = document.getElementById('file-preview');
    const fileName = document.getElementById('file-name');
    const fileRemove = document.getElementById('file-remove');
    const uploadBtn = document.getElementById('upload-btn');
    const titleInput = document.getElementById('upload-title');
    const messageInput = document.getElementById('upload-message');

    // Click to browse
    dropZone.addEventListener('click', () => fileInput.click());

    // Drag & drop
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        showFilePreview(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) showFilePreview(fileInput.files[0]);
    });

    function showFilePreview(file) {
      fileName.textContent = file.name;
      filePreview.classList.remove('hidden');
      dropZone.classList.add('hidden');
    }

    fileRemove.addEventListener('click', () => {
      fileInput.value = '';
      filePreview.classList.add('hidden');
      dropZone.classList.remove('hidden');
    });

    uploadBtn.addEventListener('click', async () => {
      const file = fileInput.files[0];
      if (!file) return showToast('Please select a file', 'error');

      setButtonLoading(uploadBtn, true);

      const formData = new FormData();
      formData.append('file', file);
      if (titleInput.value.trim()) formData.append('title', titleInput.value.trim());
      if (messageInput.value.trim()) formData.append('message', messageInput.value.trim());

      try {
        await apiUpload('/documents/upload', formData, token);
        showToast('Document uploaded successfully!');
        fileInput.value = '';
        titleInput.value = '';
        messageInput.value = '';
        filePreview.classList.add('hidden');
        dropZone.classList.remove('hidden');
        await loadDocuments(token);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setButtonLoading(uploadBtn, false);
      }
    });
  }

  // ═══════════════════ NEW VERSION ═══════════════════

  function setupVersioning(token) {
    const versionBtn = document.getElementById('version-btn');
    const versionDoc = document.getElementById('version-doc');
    const versionFile = document.getElementById('version-file');
    const versionMessage = document.getElementById('version-message');

    versionBtn.addEventListener('click', async () => {
      const docId = versionDoc.value;
      const file = versionFile.files[0];
      const message = versionMessage.value.trim();

      if (!docId) return showToast('Select a document', 'error');
      if (!file) return showToast('Select an updated file', 'error');
      if (!message) return showToast('Enter a commit message', 'error');

      setButtonLoading(versionBtn, true);

      try {
        // Read file content
        const content = await readFileContent(file);

        if (!content || content.trim().length === 0) {
          throw new Error('File is empty or could not be read');
        }

        await apiPost(`/documents/${docId}/version`, { content, message }, token);
        showToast('New version created!');
        versionFile.value = '';
        versionMessage.value = '';
        await loadDocuments(token);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setButtonLoading(versionBtn, false);
      }
    });
  }

  /** Read a text-based file (txt, md) on the client side */
  async function readFileContent(file) {
    const ext = file.name.split('.').pop().toLowerCase();

    if (['txt', 'md'].includes(ext)) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });
    }

    // For pdf/doc/docx — we must upload to server for parsing.
    // Use the upload endpoint with FormData instead.
    throw new Error(
      `For .${ext} files, use the "Upload File" tab instead. New versions from .${ext} files require server-side parsing.`
    );
  }
});
