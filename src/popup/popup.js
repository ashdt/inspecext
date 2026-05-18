import { renderPreviewTable, toExcelHtml } from '../lib/preview.js';

const $ = (id) => document.getElementById(id);
let lastPreviews = [];

async function getActiveTab() { const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); return tab; }
async function inject() { const tab = await getActiveTab(); await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['src/content/content.js'] }); return tab; }
async function send(action, payload={}) { const tab = await inject(); return chrome.tabs.sendMessage(tab.id, { action, payload }); }
const setStatus = (t) => $('status').textContent = t;
const setPreview = (t) => $('previewOut').textContent = t;

function renderStats(s={}){ $('count').textContent=s.total??0; $('native').textContent=s.native??0; $('aria').textContent=s.aria??0; $('divs').textContent=s.div??0; }

function summarize(previews){
  return (previews||[]).slice(0,3).map((p,i)=>`${i+1}) ${p.name} [${p.type}] rows=${p.totalRows} conf=${p.confidence}%`).join('\n\n') || 'No previewable datasets found.';
}

async function loadSettings(){ const s=await chrome.storage.local.get({includeLinks:true,observe:true}); $('includeLinks').checked=s.includeLinks; $('observe').checked=s.observe; }
async function saveSettings(){ await chrome.storage.local.set({includeLinks:$('includeLinks').checked,observe:$('observe').checked}); }

$('scan').onclick = async ()=>{ try{ await saveSettings(); const r=await send('SCAN',{includeLinks:$('includeLinks').checked,observe:$('observe').checked}); renderStats(r?.stats); setStatus(r?.message||'Scan complete'); }catch(e){setStatus(e.message);} };
$('preview').onclick = async ()=>{ try{ await saveSettings(); const r=await send('PREVIEW',{includeLinks:$('includeLinks').checked,maxRows:20}); lastPreviews=r?.previews||[]; renderStats(r?.stats); setPreview(summarize(lastPreviews)); $('modalContent').innerHTML=renderPreviewTable(lastPreviews); $('modal').classList.add('open'); setStatus(r?.message||'Preview ready'); }catch(e){setStatus(e.message);} };
$('openTab').onclick = async ()=>{ const html = `<!doctype html><html><head><meta charset='utf-8'><title>inspecext preview</title></head><body>${renderPreviewTable(lastPreviews)}</body></html>`; const url='data:text/html;charset=utf-8,'+encodeURIComponent(html); await chrome.tabs.create({url}); };
$('excel').onclick = async ()=>{ const html = toExcelHtml(lastPreviews); chrome.runtime.sendMessage({type:'DOWNLOAD_TEXT', content: html, filename: `inspecext-preview-${Date.now()}.xls`, mime: 'application/vnd.ms-excel;charset=utf-8'}); };
$('exportAll').onclick = async ()=>{ try{const r=await send('EXPORT_ALL',{includeLinks:$('includeLinks').checked}); renderStats(r?.stats); setStatus(r?.message||'Export complete');}catch(e){setStatus(e.message);} };
$('remove').onclick = async ()=>{ try{const r=await send('REMOVE'); renderStats(r?.stats); setStatus(r?.message||'Removed');}catch(e){setStatus(e.message);} };
$('close').onclick = ()=> $('modal').classList.remove('open');
$('search').oninput = ()=> $('modalContent').innerHTML = renderPreviewTable(lastPreviews, $('search').value);

(async()=>{ const tab=await getActiveTab(); try{$('site').textContent=new URL(tab.url).hostname+' · active tab only';}catch{} await loadSettings(); })();
