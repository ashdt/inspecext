const out = document.getElementById('out');
document.getElementById('scan').onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const res = await chrome.runtime.sendMessage({ type: 'GET_LATEST_SCAN', tabId: tab.id });
  out.textContent = JSON.stringify(res.scan || { error: 'No scan yet' }, null, 2);
};
