const API_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', async () => {
  const loginView = document.getElementById('login-view');
  const uploadView = document.getElementById('upload-view');
  const statusEl = document.getElementById('status');

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('login-btn');

  const fileInput = document.getElementById('file');
  const titleInput = document.getElementById('title');
  const messageInput = document.getElementById('message');
  const uploadBtn = document.getElementById('upload-btn');
  const logoutLink = document.getElementById('logout-link');

  // Check auth state
  const { officegit_token } = await chrome.storage.local.get(['officegit_token']);
  
  if (officegit_token) {
    showUpload();
  } else {
    showLogin();
  }

  function showStatus(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.className = isError ? 'error' : 'success';
    setTimeout(() => { statusEl.textContent = ''; }, 4000);
  }

  function showLogin() {
    loginView.classList.remove('hidden');
    uploadView.classList.add('hidden');
  }

  function showUpload() {
    loginView.classList.add('hidden');
    uploadView.classList.remove('hidden');
  }

  loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) return showStatus('Enter both fields', true);

    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Login failed');

      await chrome.storage.local.set({ officegit_token: data.token });
      showUpload();
      showStatus('Logged in successfully!');
    } catch (err) {
      showStatus(err.message, true);
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Log In';
    }
  });

  logoutLink.addEventListener('click', async (e) => {
    e.preventDefault();
    await chrome.storage.local.remove(['officegit_token']);
    showLogin();
  });

  uploadBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return showStatus('Please select a file', true);

    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';

    const formData = new FormData();
    formData.append('file', file);
    if (titleInput.value) formData.append('title', titleInput.value);
    if (messageInput.value) formData.append('message', messageInput.value);

    const { officegit_token } = await chrome.storage.local.get(['officegit_token']);

    try {
      const res = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${officegit_token}` },
        body: formData
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          await chrome.storage.local.remove(['officegit_token']);
          showLogin();
          throw new Error('Session expired');
        }
        throw new Error(data.error || 'Upload failed');
      }

      showStatus('Document uploaded successfully!');
      fileInput.value = '';
      titleInput.value = '';
      messageInput.value = '';
    } catch (err) {
      showStatus(err.message, true);
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = 'Upload to OfficeGit';
    }
  });
});
