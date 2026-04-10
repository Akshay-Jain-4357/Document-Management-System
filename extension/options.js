// OfficeGit Chrome Extension — Options Page

document.addEventListener('DOMContentLoaded', async () => {
  const apiUrlInput = document.getElementById('api-url');
  const frontendUrlInput = document.getElementById('frontend-url');
  const saveBtn = document.getElementById('save-btn');
  const statusEl = document.getElementById('status');

  // Load saved values
  const { officegit_api_url, officegit_frontend_url } = await chrome.storage.local.get([
    'officegit_api_url',
    'officegit_frontend_url',
  ]);

  apiUrlInput.value = officegit_api_url || 'http://localhost:5000/api';
  frontendUrlInput.value = officegit_frontend_url || '';

  saveBtn.addEventListener('click', async () => {
    const apiUrl = apiUrlInput.value.trim().replace(/\/+$/, ''); // Remove trailing slash
    const frontendUrl = frontendUrlInput.value.trim().replace(/\/+$/, '');

    if (!apiUrl) {
      statusEl.textContent = '⚠ API URL cannot be empty';
      statusEl.style.color = '#dc2626';
      return;
    }

    await chrome.storage.local.set({
      officegit_api_url: apiUrl,
      officegit_frontend_url: frontendUrl || '',
    });

    statusEl.textContent = '✓ Settings saved successfully';
    statusEl.style.color = '#059669';
    setTimeout(() => { statusEl.textContent = ''; }, 3000);
  });
});
