export function detectTables(doc = document) {
  const nativeTables = [...doc.querySelectorAll('table')];
  const ariaTables = [...doc.querySelectorAll('[role="table"], [role="grid"]')];
  const divGrids = [...doc.querySelectorAll('[class*="grid" i], [class*="table" i], [data-testid*="table" i]')]
    .filter(el => el.children.length > 3);

  const datasets = [
    ...nativeTables.map(t => summarizeTable(t, 'html-table', 0.95)),
    ...ariaTables.map(t => summarizeTable(t, 'aria-grid', 0.85)),
    ...divGrids.slice(0, 20).map(t => summarizeDivGrid(t))
  ];

  return dedupeDatasets(datasets);
}

function summarizeTable(table, sourceType, confidence) {
  const headers = [...table.querySelectorAll('th')].map(th => clean(th.textContent));
  const rows = [...table.querySelectorAll('tbody tr, tr')];
  return {
    name: inferName(table) || 'Detected Table',
    sourceType,
    confidence,
    columns: headers.length ? headers : inferColumnsFromFirstRow(rows[0]),
    visibleRows: rows.length,
    loadedRows: rows.length,
    possibleTotalRows: rows.length,
    elementPath: cssPath(table)
  };
}

function summarizeDivGrid(el) {
  const rows = [...el.querySelectorAll('[role="row"], .row, [class*="row" i]')];
  const cols = [...el.querySelectorAll('[role="columnheader"], [class*="header" i]')].map(x => clean(x.textContent));
  return {
    name: inferName(el) || 'Detected Grid',
    sourceType: 'div-grid',
    confidence: rows.length > 3 ? 0.72 : 0.55,
    columns: cols,
    visibleRows: rows.length,
    loadedRows: rows.length,
    possibleTotalRows: rows.length,
    elementPath: cssPath(el)
  };
}

function inferName(el) {
  const heading = el.closest('section,div')?.querySelector('h1,h2,h3,[role="heading"]');
  return clean(heading?.textContent || '');
}

function inferColumnsFromFirstRow(row) {
  if (!row) return [];
  return [...row.querySelectorAll('td')].map((_, i) => `column_${i+1}`);
}

function dedupeDatasets(items) {
  const seen = new Set();
  return items.filter(i => {
    const key = `${i.elementPath}|${i.name}|${i.sourceType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cssPath(el) { return el.id ? `#${el.id}` : el.tagName.toLowerCase(); }
function clean(s='') { return s.replace(/\s+/g, ' ').trim(); }
