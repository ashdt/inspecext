(() => {
  if (window.__LOCAL_TABLE_EXPORTER_LOADED__) return;
  window.__LOCAL_TABLE_EXPORTER_LOADED__ = true;

  const NS = 'lte';
  const BTN_CLASS = `${NS}-export-btn`;
  const WRAP_CLASS = `${NS}-control-wrap`;
  const MARK = 'data-lte-id';
  let observer = null;
  let candidates = [];
  let candidateSeq = 0;

  const style = document.createElement('style');
  style.id = 'lte-style';
  style.textContent = `
    .${WRAP_CLASS}{position:absolute;z-index:2147483000;display:flex;gap:6px;align-items:center;background:#fff;border:1px solid #cbd5e1;border-radius:999px;box-shadow:0 6px 18px rgba(15,23,42,.18);padding:4px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:12px;}
    .${BTN_CLASS}{border:0;border-radius:999px;background:#2563eb;color:white;font-weight:700;font-size:12px;line-height:1;padding:7px 10px;cursor:pointer;white-space:nowrap;}
    .${BTN_CLASS}:hover{background:#1d4ed8;}
    .lte-chip{color:#334155;font-size:11px;padding:0 6px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  `;
  document.documentElement.appendChild(style);

  function visible(el) {
    if (!el || !(el instanceof Element)) return false;
    const st = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return st.display !== 'none' && st.visibility !== 'hidden' && rect.width > 8 && rect.height > 8;
  }

  function clean(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function escapeCsv(value) {
    const s = String(value ?? '');
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function toCsv(headers, rows) {
    const normalizedHeaders = headers.length ? headers : rows[0]?.map((_, i) => `Column ${i + 1}`) || [];
    const lines = [normalizedHeaders.map(escapeCsv).join(',')];
    for (const row of rows) {
      const padded = normalizedHeaders.map((_, i) => row[i] ?? '');
      lines.push(padded.map(escapeCsv).join(','));
    }
    return lines.join('\n');
  }

  function filenameFor(name) {
    const host = location.hostname.replace(/[^a-z0-9.-]+/gi, '-');
    const safe = clean(name || 'table').replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').slice(0, 50) || 'table';
    const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
    return `table-export-${host}-${safe}-${ts}.csv`;
  }

  function downloadCsv(csv, filename) {
    chrome.runtime.sendMessage({ type: 'DOWNLOAD_CSV', csv, filename });
  }

  function textWithLinks(cell, includeLinks) {
    let t = clean(cell.innerText || cell.textContent || '');
    if (includeLinks) {
      const links = [...cell.querySelectorAll('a[href]')]
        .map(a => a.href)
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i);
      if (links.length) t += ` ${links.join(' ')}`;
    }
    return t;
  }

  function extractNative(root, includeLinks = true) {
    const headerCells = [...root.querySelectorAll('thead th, thead td')].filter(visible);
    let headers = headerCells.map(th => clean(th.innerText || th.textContent));
    const bodyRows = [...root.querySelectorAll('tbody tr')].filter(visible);
    const rowsSource = bodyRows.length ? bodyRows : [...root.querySelectorAll('tr')].filter(visible).slice(headers.length ? 0 : 1);
    if (!headers.length) {
      const first = [...root.querySelectorAll('tr')].find(visible);
      if (first) {
        const cells = [...first.children].filter(visible);
        const ths = cells.filter(c => c.tagName === 'TH');
        if (ths.length) headers = cells.map(c => clean(c.innerText || c.textContent));
      }
    }
    const rows = rowsSource.map(tr => [...tr.children].filter(visible).map(td => textWithLinks(td, includeLinks))).filter(r => r.some(Boolean));
    const maxCols = Math.max(headers.length, ...rows.map(r => r.length), 0);
    if (!headers.length) headers = Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`);
    return { headers, rows };
  }

  function extractAria(root, includeLinks = true) {
    const allRows = [...root.querySelectorAll('[role="row"]')].filter(visible);
    let headerRow = allRows.find(r => r.querySelector('[role="columnheader"]'));
    let headers = headerRow ? [...headerRow.querySelectorAll('[role="columnheader"], [role="cell"], [role="gridcell"]')].filter(visible).map(c => clean(c.innerText || c.textContent)) : [];
    const dataRows = allRows.filter(r => r !== headerRow && r.querySelector('[role="cell"], [role="gridcell"]'));
    const rows = dataRows.map(r => [...r.querySelectorAll('[role="cell"], [role="gridcell"]')].filter(visible).map(c => textWithLinks(c, includeLinks))).filter(r => r.some(Boolean));
    const maxCols = Math.max(headers.length, ...rows.map(r => r.length), 0);
    if (!headers.length) headers = Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`);
    return { headers, rows };
  }

  function childSignature(el) {
    const kids = [...el.children].filter(visible).slice(0, 8);
    return kids.map(k => `${k.tagName}.${[...k.classList].slice(0,2).join('.')}`).join('|') || clean(el.textContent).length;
  }

  function findRepeatedContainers() {
    const results = [];
    const parents = [...document.body.querySelectorAll('main *, section *, div, ul, ol')].filter(visible);
    for (const parent of parents) {
      if (parent.closest(`.${WRAP_CLASS}`)) continue;
      const children = [...parent.children].filter(visible);
      if (children.length < 4 || children.length > 300) continue;
      const sigs = children.map(childSignature);
      const buckets = new Map();
      sigs.forEach((s, i) => buckets.set(s, [...(buckets.get(s) || []), children[i]]));
      const best = [...buckets.values()].sort((a,b)=>b.length-a.length)[0];
      if (!best || best.length < 4) continue;
      const rect = parent.getBoundingClientRect();
      if (rect.height < 80 || rect.width < 160) continue;
      results.push({ root: parent, rows: best, confidence: Math.min(90, 35 + best.length * 4) });
    }
    return results;
  }

  function extractRepeated(root, includeLinks = true) {
    const children = [...root.children].filter(visible);
    const buckets = new Map();
    children.forEach(ch => {
      const s = childSignature(ch);
      buckets.set(s, [...(buckets.get(s) || []), ch]);
    });
    const rowsEls = [...buckets.values()].sort((a,b)=>b.length-a.length)[0] || [];
    const sample = rowsEls[0];
    const childCount = sample ? [...sample.children].filter(visible).length : 0;
    let headers = [];
    let rows = [];
    if (childCount >= 2) {
      headers = Array.from({ length: childCount }, (_, i) => `Column ${i + 1}`);
      rows = rowsEls.map(row => [...row.children].filter(visible).map(c => textWithLinks(c, includeLinks))).filter(r => r.some(Boolean));
    } else {
      headers = ['Item'];
      rows = rowsEls.map(row => [textWithLinks(row, includeLinks)]).filter(r => r[0]);
    }
    return { headers, rows };
  }

  function likelyName(root, type) {
    const aria = root.getAttribute('aria-label') || root.getAttribute('data-testid') || root.id;
    if (aria) return aria;
    const prev = root.previousElementSibling;
    if (prev && visible(prev)) {
      const txt = clean(prev.innerText || prev.textContent);
      if (txt && txt.length < 80) return txt;
    }
    return type.replace('-', ' ');
  }

  function scanCandidates() {
    const found = [];
    const seen = new Set();

    for (const table of [...document.querySelectorAll('table')].filter(visible)) {
      if (seen.has(table) || table.closest(`.${WRAP_CLASS}`)) continue;
      seen.add(table);
      const data = extractNative(table, false);
      if (data.rows.length) found.push({ id: table.getAttribute(MARK) || `lte-${++candidateSeq}`, type: 'native-table', root: table, confidence: 95, name: likelyName(table, 'native-table') });
    }

    for (const grid of [...document.querySelectorAll('[role="table"], [role="grid"]')].filter(visible)) {
      if (seen.has(grid) || grid.closest('table') || grid.closest(`.${WRAP_CLASS}`)) continue;
      const data = extractAria(grid, false);
      if (data.rows.length >= 2) {
        seen.add(grid);
        found.push({ id: grid.getAttribute(MARK) || `lte-${++candidateSeq}`, type: 'aria-grid', root: grid, confidence: 85, name: likelyName(grid, 'aria-grid') });
      }
    }

    for (const rep of findRepeatedContainers()) {
      if (seen.has(rep.root) || rep.root.closest('table,[role="grid"],[role="table"]') || rep.root.closest(`.${WRAP_CLASS}`)) continue;
      const nestedKnown = [...seen].some(el => rep.root.contains(el));
      if (nestedKnown) continue;
      seen.add(rep.root);
      found.push({ id: rep.root.getAttribute(MARK) || `lte-${++candidateSeq}`, type: 'repeated-list', root: rep.root, confidence: rep.confidence, name: likelyName(rep.root, 'repeated-list') });
    }

    found.forEach(c => c.root.setAttribute(MARK, c.id));
    candidates = found;
    return found;
  }

  function extractCandidate(candidate, includeLinks = true) {
    if (candidate.type === 'native-table') return extractNative(candidate.root, includeLinks);
    if (candidate.type === 'aria-grid') return extractAria(candidate.root, includeLinks);
    return extractRepeated(candidate.root, includeLinks);
  }

  function placeControl(candidate) {
    if (document.querySelector(`.${WRAP_CLASS}[data-for="${candidate.id}"]`)) return;
    const rect = candidate.root.getBoundingClientRect();
    const wrap = document.createElement('div');
    wrap.className = WRAP_CLASS;
    wrap.setAttribute('data-for', candidate.id);
    wrap.style.top = `${Math.max(8, rect.top + window.scrollY + 8)}px`;
    wrap.style.left = `${Math.max(8, rect.right + window.scrollX - 190)}px`;
    wrap.innerHTML = `<span class="lte-chip" title="${candidate.type}, confidence ${candidate.confidence}%">${candidate.name || candidate.type}</span><button class="${BTN_CLASS}" type="button">Export CSV</button>`;
    wrap.querySelector('button').addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const settings = await chrome.storage.local.get({ includeLinks: true });
      const fresh = candidates.find(c => c.id === candidate.id) || candidate;
      const { headers, rows } = extractCandidate(fresh, settings.includeLinks);
      if (!rows.length) return alert('No exportable rows found in this table.');
      downloadCsv(toCsv(headers, rows), filenameFor(fresh.name || fresh.type));
    });
    document.body.appendChild(wrap);
  }

  function repositionControls() {
    for (const candidate of candidates) {
      const wrap = document.querySelector(`.${WRAP_CLASS}[data-for="${candidate.id}"]`);
      if (!wrap || !document.documentElement.contains(candidate.root)) continue;
      const rect = candidate.root.getBoundingClientRect();
      wrap.style.top = `${Math.max(8, rect.top + window.scrollY + 8)}px`;
      wrap.style.left = `${Math.max(8, rect.right + window.scrollX - 190)}px`;
    }
  }

  function stats() {
    return {
      total: candidates.length,
      native: candidates.filter(c => c.type === 'native-table').length,
      aria: candidates.filter(c => c.type === 'aria-grid').length,
      div: candidates.filter(c => c.type === 'repeated-list').length
    };
  }

  function removeControls() {
    document.querySelectorAll(`.${WRAP_CLASS}`).forEach(el => el.remove());
    if (observer) { observer.disconnect(); observer = null; }
  }

  function scanAndDecorate({ observe = true } = {}) {
    removeControls();
    scanCandidates().forEach(placeControl);
    if (observe) startObserver();
    repositionControls();
    return stats();
  }

  function startObserver() {
    if (observer) observer.disconnect();
    let timer = null;
    observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const before = candidates.length;
        scanCandidates();
        candidates.forEach(placeControl);
        if (candidates.length !== before) repositionControls();
      }, 800);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.addEventListener('scroll', () => requestAnimationFrame(repositionControls), { passive: true });
  window.addEventListener('resize', () => requestAnimationFrame(repositionControls));

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
      if (message.action === 'SCAN') {
        const s = scanAndDecorate({ observe: message.payload?.observe !== false });
        sendResponse({ ok: true, stats: s, message: `Detected ${s.total} exportable table/grid/list candidate(s).` });
      } else if (message.action === 'EXPORT_ALL') {
        if (!candidates.length) scanCandidates();
        const includeLinks = message.payload?.includeLinks !== false;
        let exported = 0;
        for (const candidate of candidates) {
          const { headers, rows } = extractCandidate(candidate, includeLinks);
          if (!rows.length) continue;
          downloadCsv(toCsv(headers, rows), filenameFor(candidate.name || candidate.type));
          exported++;
        }
        sendResponse({ ok: true, stats: stats(), message: `Started ${exported} CSV export(s).` });
      } else if (message.action === 'PREVIEW') {
        if (!candidates.length) scanCandidates();
        const includeLinks = message.payload?.includeLinks !== false;
        const maxRows = Math.max(1, Math.min(20, Number(message.payload?.maxRows || 10)));
        const previews = candidates.map((candidate) => {
          const { headers, rows } = extractCandidate(candidate, includeLinks);
          return {
            id: candidate.id,
            name: candidate.name || candidate.type,
            type: candidate.type,
            confidence: candidate.confidence,
            totalRows: rows.length,
            headers,
            sampleRows: rows.slice(0, maxRows)
          };
        }).filter(p => p.totalRows > 0);
        sendResponse({ ok: true, stats: stats(), previews, message: `Prepared preview for ${previews.length} dataset(s).` });
      } else if (message.action === 'REMOVE') {
        removeControls();
        candidates = [];
        sendResponse({ ok: true, stats: stats(), message: 'Injected controls removed.' });
      }
    })();
    return true;
  });
})();
