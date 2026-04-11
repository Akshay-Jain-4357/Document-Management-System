// OfficeGit Chrome Extension — Background Service Worker (Manifest V3)

const DEFAULT_API_URL = 'http://localhost:5000/api';

chrome.runtime.onInstalled.addListener(async () => {
  const { officegit_api_url } = await chrome.storage.local.get(['officegit_api_url']);
  if (!officegit_api_url) {
    await chrome.storage.local.set({ officegit_api_url: DEFAULT_API_URL });
  }
  console.log('OfficeGit extension installed.');
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
});
