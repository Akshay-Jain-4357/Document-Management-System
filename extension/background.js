// Background service worker for OfficeGit Extension
// Using Manifest V3 requirements
chrome.runtime.onInstalled.addListener(() => {
  console.log("OfficeGit extension installed.");
});
