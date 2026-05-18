let latestScanByTab = new Map();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'SCAN_RESULT') {
    if (sender.tab?.id != null) latestScanByTab.set(sender.tab.id, msg.payload);
  }
  if (msg?.type === 'GET_LATEST_SCAN') {
    const tabId = msg.tabId;
    sendResponse({ scan: latestScanByTab.get(tabId) || null });
    return true;
  }
});
