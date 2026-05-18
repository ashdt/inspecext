export function renderPreviewTable(previews, query = '') {
  const q = String(query || '').toLowerCase();
  const filtered = (previews || []).filter(p => JSON.stringify(p).toLowerCase().includes(q));
  if (!filtered.length) return '<p>No preview data.</p>';
  return filtered.map((p, idx) => {
    const headers = (p.headers || []).slice(0, 10);
    const rows = (p.sampleRows || []).slice(0, 20);
    const thead = `<tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
    const tbody = rows.map(r => `<tr>${headers.map((_,i)=>`<td>${escapeHtml(r[i] ?? '')}</td>`).join('')}</tr>`).join('');
    return `<section style="margin:12px 0"><h4>${idx+1}. ${escapeHtml(p.name)} <small>[${escapeHtml(p.type)} | rows ${p.totalRows}]</small></h4><div style="overflow:auto"><table border="1" cellpadding="4" cellspacing="0">${thead}${tbody}</table></div></section>`;
  }).join('');
}

export function toExcelHtml(previews) {
  const sheets = (previews || []).map((p, idx) => {
    const headers = p.headers || [];
    const rows = p.sampleRows || [];
    const head = `<tr>${headers.map(h=>`<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
    const body = rows.map(r=>`<tr>${headers.map((_,i)=>`<td>${escapeHtml(r[i] ?? '')}</td>`).join('')}</tr>`).join('');
    return `<h3>${idx+1}. ${escapeHtml(p.name)}</h3><table border="1">${head}${body}</table><br/>`;
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8"></head><body>${sheets}</body></html>`;
}

function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
