// OfficeGit Chrome Extension — Background Service Worker (Manifest V3)

const DEFAULT_API_URL = 'http://localhost:5000/api';

chrome.runtime.onInstalled.addListener(async () => {
  const { officegit_api_url } = await chrome.storage.local.get(['officegit_api_url']);
  if (!officegit_api_url) {
    await chrome.storage.local.set({ officegit_api_url: DEFAULT_API_URL });
  }
  console.log('OfficeGit extension installed.');
});

// Listen for messages from popup to update badge
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'UPDATE_BADGE') {
    chrome.action.setBadgeText({ text: msg.count > 0 ? String(msg.count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#4f46e5' });
  }
});
