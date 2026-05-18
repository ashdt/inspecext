function downloadText(content, filename, mime, sendResponse) {
  const blob = new Blob([content || ''], { type: mime || 'text/plain;charset=utf-8' });
  const reader = new FileReader();
  reader.onload = () => {
    chrome.downloads.download({ url: reader.result, filename, saveAs: true }, (downloadId) => {
      sendResponse({ ok: !chrome.runtime.lastError, downloadId, error: chrome.runtime.lastError?.message });
    });
  };
  reader.onerror = () => sendResponse({ ok: false, error: 'Failed to prepare download.' });
  reader.readAsDataURL(blob);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'DOWNLOAD_CSV') {
    downloadText(message.csv, message.filename || `table-export-${Date.now()}.csv`, 'text/csv;charset=utf-8', sendResponse);
    return true;
  }
  if (message?.type === 'DOWNLOAD_TEXT') {
    downloadText(message.content, message.filename || `export-${Date.now()}.txt`, message.mime, sendResponse);
    return true;
  }
});
