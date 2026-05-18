const $ = (id) => document.getElementById(id);

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function inject() {
  const tab = await getActiveTab();
  if (!tab?.id) throw new Error('No active tab found.');
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['src/content.js'] });
  return tab;
}

async function send(action, payload = {}) {
  const tab = await inject();
  return await chrome.tabs.sendMessage(tab.id, { action, payload });
}

function renderStats(stats) {
  $('count').textContent = stats?.total ?? '0';
  $('native').textContent = stats?.native ?? '0';
  $('aria').textContent = stats?.aria ?? '0';
  $('divs').textContent = stats?.div ?? '0';
}

function setStatus(text) { $('status').textContent = text; }

async function loadSettings() {
  const s = await chrome.storage.local.get({ includeLinks: true, observe: true });
  $('includeLinks').checked = s.includeLinks;
  $('observe').checked = s.observe;
}

async function saveSettings() {
  await chrome.storage.local.set({ includeLinks: $('includeLinks').checked, observe: $('observe').checked });
}

$('scan').addEventListener('click', async () => {
  try {
    await saveSettings();
    setStatus('Scanning page…');
    const res = await send('SCAN', { includeLinks: $('includeLinks').checked, observe: $('observe').checked });
    renderStats(res?.stats);
    setStatus(res?.message || 'Scan complete.');
  } catch (e) { setStatus(e.message); }
});

$('exportAll').addEventListener('click', async () => {
  try {
    await saveSettings();
    setStatus('Exporting all detected tables…');
    const res = await send('EXPORT_ALL', { includeLinks: $('includeLinks').checked });
    renderStats(res?.stats);
    setStatus(res?.message || 'Export complete.');
  } catch (e) { setStatus(e.message); }
});

$('remove').addEventListener('click', async () => {
  try {
    setStatus('Removing injected controls…');
    const res = await send('REMOVE');
    renderStats(res?.stats);
    setStatus(res?.message || 'Controls removed.');
  } catch (e) { setStatus(e.message); }
});

(async () => {
  const tab = await getActiveTab();
  try { $('site').textContent = new URL(tab.url).hostname + ' · active tab only'; } catch {}
  await loadSettings();
})();
