export function toCSV(rows, columns, { includeLinks = false, delimiter = ',' } = {}) {
  const header = columns.map(c => esc(c, delimiter)).join(delimiter);
  const body = rows.map(r => columns.map(c => esc(formatCell(r[c], includeLinks), delimiter)).join(delimiter));
  return [header, ...body].join('\n');
}

function formatCell(v) {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v).replace(/\s+/g, ' ').trim();
}

function esc(v, d) {
  const s = String(v ?? '');
  if (s.includes('"') || s.includes('\n') || s.includes(d)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
