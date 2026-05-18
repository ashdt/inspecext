chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'DOWNLOAD_CSV') {
    const blob = new Blob([message.csv || ''], { type: 'text/csv;charset=utf-8' });
    const reader = new FileReader();
    reader.onload = () => {
      chrome.downloads.download({
        url: reader.result,
        filename: message.filename || `table-export-${Date.now()}.csv`,
        saveAs: true
      }, (downloadId) => {
        sendResponse({ ok: !chrome.runtime.lastError, downloadId, error: chrome.runtime.lastError?.message });
      });
    };
    reader.onerror = () => sendResponse({ ok: false, error: 'Failed to prepare CSV download.' });
    reader.readAsDataURL(blob);
    return true;
  }
});
