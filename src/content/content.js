import { detectTables } from '../lib/detectors.js';

function scanPage() {
  const datasets = detectTables(document);
  const pageMap = {
    url: location.href,
    title: document.title,
    tables: datasets.length,
    forms: document.querySelectorAll('form').length,
    filters: document.querySelectorAll('select,input[type="search"],input[placeholder*="filter" i]').length,
    pagination: document.querySelectorAll('[class*="pagination" i],[aria-label*="pagination" i]').length,
    datasets
  };
  chrome.runtime.sendMessage({ type: 'SCAN_RESULT', payload: pageMap });
}

scanPage();
new MutationObserver(() => scanPage()).observe(document.body, { childList: true, subtree: true });
