// ─── CONSTANTS ────────────────────────────────────────────
const EMOJIS = ['📁','👨‍👩‍👧','💼','🏠','⭐','🚨','👥','🏢','❤️','🎓','🎉','💊','🏋️','✈️','🎮','🔧'];
const COLORS  = ['#00e676','#40c4ff','#ea80fc','#ff9100','#ffd740','#ff1744','#69f0ae','#b0bec5'];

// ─── STATE ───────────────────────────────────────────────
const S = {
  folders: [
    { id:'f1', name:'Family',    icon:'👨‍👩‍👧', color:'#ff9100' },
    { id:'f2', name:'Work',      icon:'💼',    color:'#40c4ff' },
    { id:'f3', name:'Emergency', icon:'🚨',    color:'#ff1744' },
  ],
  contacts: [
    { id:'c1', name:'Mom',       number:'+917890123456', folder:'f1' },
    { id:'c2', name:'Dad',       number:'+917654321098', folder:'f1' },
    { id:'c3', name:'Sister',    number:'+919988776655', folder:'f1' },
    { id:'c4', name:'Boss',      number:'+919876543210', folder:'f2' },
    { id:'c5', name:'Colleague', number:'+918765432109', folder:'f2' },
    { id:'c6', name:'Ambulance', number:'102',           folder:'f3' },
    { id:'c7', name:'Police',    number:'100',           folder:'f3' },
    { id:'c8', name:'Fire Dept', number:'101',           folder:'f3' },
  ],
  tab:'dial', dialFilter:null, listFilter:'all',
  number:'', cname:'',
  selEmoji:'📁', selColor:'#00e676',
  sharingFolderId: null,
  pendingImport: null,
};

// ─── UTILS ───────────────────────────────────────────────
const uid   = () => 'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const byFid = id => S.folders.find(f=>f.id===id);
const inFld = fid => S.contacts.filter(c=>c.folder===fid);
const esc   = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/'/g,'&#39;');

function toast(msg, color) {
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.style.borderColor = color||'var(--accent)';
  t.style.color = color||'var(--accent)';
  t.classList.add('show');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),2800);
}

// ─── ENCODE / DECODE SHARE ────────────────────────────────
/**
 * Encodes a folder + its contacts into a URL-safe base64 string
 * Format: { v:1, folder:{id,name,icon,color}, contacts:[{name,number}] }
 */
function encodeShareData(folderId) {
  const f = byFid(folderId);
  if (!f) return null;
  const contacts = inFld(folderId).map(c=>({n:c.name, p:c.number}));
  const payload = { v:1, f:{ nm:f.name, ic:f.icon, cl:f.color }, cs: contacts };
  const json = JSON.stringify(payload);
  // base64url encode
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
  return b64;
}

function decodeShareData(b64) {
  try {
    // restore base64url → base64
    let padded = b64.replace(/-/g,'+').replace(/_/g,'/');
    while (padded.length % 4) padded += '=';
    const json = decodeURIComponent(escape(atob(padded)));
    const d = JSON.parse(json);
    if (d.v!==1 || !d.f || !d.cs) return null;
    return d;
  } catch(e) { return null; }
}

function buildShareURL(folderId) {
  const encoded = encodeShareData(folderId);
  if (!encoded) return null;
  // Use current page URL as base, add hash param
  const base = location.href.split('#')[0].split('?')[0];
  return `${base}#share=${encoded}`;
}

// ─── SHARE UI ─────────────────────────────────────────────
function openShareModal(folderId) {
  S.sharingFolderId = folderId;
  const f = byFid(folderId);
  const cnt = inFld(folderId).length;
  document.getElementById('shareModalTitle').textContent = `${f.icon} SHARE · ${f.name}`;

  const url = buildShareURL(folderId);
  document.getElementById('shareLinkBox').textContent = url;
  document.getElementById('importLinkInput').value = '';

  // visual fingerprint (decorative pixel pattern from encoded string)
  renderShareVisual(encodeShareData(folderId), f.color);

  document.getElementById('shareModal').classList.add('open');
}

function renderShareVisual(b64str, color) {
  const grid = document.getElementById('shareVisual');
  const cells = 48; // 12×4 visible
  let h = '';
  for (let i=0; i<cells; i++) {
    const charCode = b64str.charCodeAt(i % b64str.length) || 0;
    const on = (charCode >> (i%7)) & 1;
    const opacity = on ? (0.3 + (charCode % 5)*0.12).toFixed(2) : '0.04';
    h += `<div class="sv-cell" style="background:${color};opacity:${opacity};"></div>`;
  }
  grid.innerHTML = h;
}

function shareVia(method) {
  const url = buildShareURL(S.sharingFolderId);
  const f   = byFid(S.sharingFolderId);
  const msg = `📞 ${f.icon} ${f.name} contacts — open to import: ${url}`;

  if (method==='copy') {
    navigator.clipboard.writeText(url).then(()=>{
      toast('✅ Link copied to clipboard!');
    }).catch(()=>{
      // fallback
      const ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
      toast('✅ Link copied!');
    });
  } else if (method==='whatsapp') {
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  } else if (method==='sms') {
    window.open(`sms:?body=${encodeURIComponent(msg)}`);
  } else if (method==='native') {
    if (navigator.share) {
      navigator.share({ title:`${f.icon} ${f.name} contacts`, text:msg, url });
    } else {
      navigator.clipboard.writeText(url).then(()=>toast('✅ Link copied (share not supported)'));
    }
  }
}

// ─── IMPORT ──────────────────────────────────────────────
function importFromInput() {
  const raw = document.getElementById('importLinkInput').value.trim();
  const match = raw.match(/#share=([A-Za-z0-9_\-]+)/);
  if (!match) { toast('⚠️ Invalid share link', 'var(--red)'); return; }
  const data = decodeShareData(match[1]);
  if (!data) { toast('⚠️ Corrupted share data', 'var(--red)'); return; }
  doImport(data);
  closeModal('shareModal');
}

function doImport(data) {
  // Check if folder with same name already exists
  const existing = S.folders.find(f=>f.name===data.f.nm);
  let fid;
  if (existing) {
    fid = existing.id;
    toast(`📥 Added to existing "${data.f.nm}"`, 'var(--blue)');
  } else {
    fid = 'f'+Date.now();
    S.folders.push({ id:fid, name:data.f.nm, icon:data.f.ic, color:data.f.cl });
    toast(`📥 Folder "${data.f.nm}" imported!`, 'var(--blue)');
  }
  let added = 0;
  data.cs.forEach(c=>{
    // skip duplicates by number
    if (!S.contacts.find(x=>x.number===c.p)) {
      S.contacts.push({ id:uid(), name:c.n, number:c.p, folder:fid });
      added++;
    }
  });
  if (added===0) toast('ℹ️ All contacts already exist');
  renderAllViews();
  dismissImport();
}

function importSharedFolder() {
  if (S.pendingImport) doImport(S.pendingImport);
}

function dismissImport() {
  S.pendingImport = null;
  document.getElementById('importBanner').classList.remove('show');
  // Clear hash so it doesn't re-trigger
  history.replaceState(null,'',location.pathname+location.search);
}

// ─── CHECK URL ON LOAD ────────────────────────────────────
function checkURLForShare() {
  const hash = location.hash;
  const match = hash.match(/#share=([A-Za-z0-9_\-]+)/);
  if (!match) return;
  const data = decodeShareData(match[1]);
  if (!data) return;
  S.pendingImport = data;
  const banner = document.getElementById('importBanner');
  document.getElementById('importTitle').textContent = `${data.f.ic} "${data.f.nm}" shared with you`;
  document.getElementById('importSub').textContent = `${data.cs.length} contact${data.cs.length!==1?'s':''} ready to import`;
  banner.classList.add('show');
  // Switch to folders tab to show the banner
  switchTab('folders');
}

// ─── TABS ────────────────────────────────────────────────
function switchTab(tab) {
  S.tab=tab;
  document.querySelectorAll('.tab').forEach((el,i)=>{
    el.classList.toggle('active',['dial','contacts','folders'][i]===tab);
  });
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+tab).classList.add('active');
  if (tab==='dial')     renderDialView();
  if (tab==='contacts') renderContactsView();
  if (tab==='folders')  renderFoldersView();
}

function renderAllViews() {
  renderDialView();
  if (S.tab==='contacts') renderContactsView();
  if (S.tab==='folders')  renderFoldersView();
}

// ─── DISPLAY ─────────────────────────────────────────────
function updateDisplay() {
  const n=S.number, el=document.getElementById('display'), cb=document.getElementById('callBtn');
  document.getElementById('displayLabel').textContent=S.cname||(n?'Ready to call':'Enter number');
  if (!n) {
    el.innerHTML='<span class="cursor"></span>';
    el.classList.remove('has-number'); cb.classList.add('empty'); cb.removeAttribute('href');
  } else {
    el.innerHTML=`<span>${fmtNum(n)}</span><span class="cursor"></span>`;
    el.classList.add('has-number'); cb.classList.remove('empty'); cb.href=`tel:${n}`;
  }
}
function fmtNum(n) {
  if(!n||n.startsWith('+')) return n;
  if(n.length<=5) return n;
  return n.slice(0,n.length-5)+' '+n.slice(-5);
}
function pressKey(d) {
  if(S.number.length>=15) return;
  S.number+=d; S.cname=''; updateDisplay();
  if('vibrate' in navigator) navigator.vibrate(8);
}
function deleteLast() { S.number=S.number.slice(0,-1); updateDisplay(); }
function clearAll()   { S.number=''; S.cname=''; updateDisplay(); }
function loadContact(name,num) {
  S.number=num.replace(/\s/g,''); S.cname=name;
  updateDisplay(); switchTab('dial'); toast(`Loaded: ${name}`);
}
function makeCall(e) {
  if(!S.number){e.preventDefault();return;}
  toast(`📞 Calling ${S.cname||S.number}…`);
}

let lpt;
const k0=document.getElementById('key0');
k0.addEventListener('mousedown',()=>{lpt=setTimeout(()=>{S.number='+';updateDisplay();},650);});
k0.addEventListener('mouseup',()=>clearTimeout(lpt));
k0.addEventListener('touchstart',()=>{lpt=setTimeout(()=>{S.number='+';updateDisplay();},650);},{passive:true});
k0.addEventListener('touchend',()=>clearTimeout(lpt));

document.addEventListener('keydown',e=>{
  if(S.tab!=='dial') return;
  if('0123456789*#+'.includes(e.key)) pressKey(e.key);
  else if(e.key==='Backspace') deleteLast();
  else if(e.key==='Escape')    clearAll();
  else if(e.key==='Enter'&&S.number){toast('📞 Calling…');window.location.href=`tel:${S.number}`;}
});

document.querySelectorAll('.key,.btn-secondary').forEach(el=>{
  el.addEventListener('click',function(){
    const r=document.createElement('span'); r.className='ripple';
    const rc=this.getBoundingClientRect();
    r.style.cssText=`width:${rc.width}px;height:${rc.width}px;left:0;top:${(rc.height-rc.width)/2}px`;
    this.appendChild(r); setTimeout(()=>r.remove(),500);
  });
});

// ─── DIAL VIEW ───────────────────────────────────────────
function renderDialView() {
  const strip=document.getElementById('dialStrip');
  const allSel=S.dialFilter===null;
  let h=`<div class="folder-pill ${allSel?'selected':''}" onclick="setDialFilter(null)">📋 ALL <span class="pill-count">${S.contacts.length}</span></div>`;
  S.folders.forEach(f=>{
    const cnt=inFld(f.id).length; if(!cnt) return;
    const sel=S.dialFilter===f.id;
    h+=`<div class="folder-pill ${sel?'selected':''}" onclick="setDialFilter('${f.id}')"
      style="${sel?`border-color:${f.color};color:${f.color};background:${f.color}11;`:''}">
      ${f.icon} ${esc(f.name)} <span class="pill-count">${cnt}</span></div>`;
  });
  strip.innerHTML=h;

  const qbar=document.getElementById('quickDialBar');
  if(S.dialFilter){
    const folder=byFid(S.dialFilter), cts=inFld(S.dialFilter);
    if(cts.length){
      let qh=`<div style="display:flex;gap:6px;margin-bottom:12px;overflow-x:auto;scrollbar-width:none;">`;
      cts.forEach(c=>{
        qh+=`<div class="folder-pill" onclick="loadContact('${esc(c.name)}','${c.number}')"
          style="border-color:${folder.color}44;">${folder.icon} ${esc(c.name)}</div>`;
      });
      qh+=`</div>`; qbar.innerHTML=qh;
    } else qbar.innerHTML='';
  } else qbar.innerHTML='';
}
function setDialFilter(fid){S.dialFilter=fid;renderDialView();}

// ─── CONTACTS VIEW ────────────────────────────────────────
function renderContactsView() {
  const strip=document.getElementById('filterStrip');
  const allSel=S.listFilter==='all';
  let h=`<div class="folder-pill ${allSel?'selected':''}" onclick="setListFilter('all')">📋 ALL <span class="pill-count">${S.contacts.length}</span></div>`;
  S.folders.forEach(f=>{
    const cnt=inFld(f.id).length, sel=S.listFilter===f.id;
    h+=`<div class="folder-pill ${sel?'selected':''}" onclick="setListFilter('${f.id}')"
      style="${sel?`border-color:${f.color};color:${f.color};background:${f.color}11;`:''}">
      ${f.icon} ${esc(f.name)} <span class="pill-count">${cnt}</span></div>`;
  });
  strip.innerHTML=h;

  const list=document.getElementById('contactsList');
  const cts=S.listFilter==='all'?S.contacts:inFld(S.listFilter);
  document.getElementById('totalBadge').textContent=`${S.contacts.length} total`;

  if(!cts.length){
    list.innerHTML=`<div class="empty-state"><span class="big">👥</span>No contacts here</div>`;
  } else {
    list.innerHTML=cts.map(c=>{
      const f=byFid(c.folder),clr=f?f.color:'#555',icon=f?f.icon:'👤';
      return `<div class="contact-row">
        <div class="contact-avatar" style="background:${clr}18;border-color:${clr}44;">${icon}</div>
        <div class="contact-info">
          <div class="contact-name">${esc(c.name)}</div>
          <div class="contact-num">${esc(c.number)}</div>
        </div>
        <div class="contact-actions">
          <div class="btn-icon" onclick="loadContact('${esc(c.name)}','${c.number}')" title="Dial">📞</div>
          <div class="btn-icon danger" onclick="deleteContact('${c.id}')" title="Remove" style="font-size:11px;">✕</div>
        </div>
      </div>`;
    }).join('');
  }
  document.getElementById('newFolder').innerHTML=S.folders.map(f=>`<option value="${f.id}">${f.icon} ${esc(f.name)}</option>`).join('');
}
function setListFilter(fid){S.listFilter=fid;renderContactsView();}
function addContact(){
  const name=document.getElementById('newName').value.trim();
  const num=document.getElementById('newNum').value.trim();
  const fid=document.getElementById('newFolder').value;
  if(!name||!num){toast('⚠️ Name and number required','var(--red)');return;}
  S.contacts.push({id:uid(),name,number:num,folder:fid});
  document.getElementById('newName').value='';
  document.getElementById('newNum').value='';
  renderContactsView(); renderDialView();
  toast(`✅ ${name} added`);
}
function deleteContact(id){
  const c=S.contacts.find(x=>x.id===id);
  S.contacts=S.contacts.filter(x=>x.id!==id);
  renderContactsView(); renderDialView();
  if(c) toast(`🗑 ${c.name} removed`);
}

// ─── FOLDERS VIEW ────────────────────────────────────────
function renderFoldersView() {
  const grid=document.getElementById('foldersGrid');
  let h=S.folders.map(f=>{
    const cnt=inFld(f.id).length;
    return `<div class="folder-card" style="border-color:${f.color}33;">
      <div class="folder-card-actions">
        <div class="mini-btn" onclick="openUploadModal('${f.id}')" title="Upload contacts">📤</div>
        <div class="mini-btn" onclick="openShareModal('${f.id}')" title="Share folder">🔗</div>
        <div class="mini-btn del" onclick="deleteFolder('${f.id}',event)" title="Delete">✕</div>
      </div>
      <span class="folder-card-icon">${f.icon}</span>
      <div class="folder-card-name">${esc(f.name)}</div>
      <div class="folder-card-count">${cnt} contact${cnt!==1?'s':''}</div>
      <div class="folder-card-bar" style="background:${f.color};"></div>
    </div>`;
  }).join('');
  h+=`<div class="new-folder-btn" onclick="openModal('folderModal')">＋ New Folder</div>`;
  grid.innerHTML=h;

  const mc=document.getElementById('moveContact');
  const mt=document.getElementById('moveTarget');
  mc.innerHTML=S.contacts.map(c=>`<option value="${c.id}">${esc(c.name)} · ${esc(c.number)}</option>`).join('');
  mt.innerHTML=S.folders.map(f=>`<option value="${f.id}">${f.icon} ${esc(f.name)}</option>`).join('');
}
function moveContactToFolder(){
  const cid=document.getElementById('moveContact').value;
  const fid=document.getElementById('moveTarget').value;
  const c=S.contacts.find(x=>x.id===cid),f=byFid(fid);
  if(!c||!f) return;
  c.folder=fid; renderFoldersView(); renderDialView();
  toast(`✅ ${c.name} → ${f.icon} ${f.name}`);
}
function deleteFolder(id,e){
  e.stopPropagation();
  const remaining=S.folders.filter(x=>x.id!==id);
  if(!remaining.length){toast('⚠️ Keep at least one folder','var(--red)');return;}
  S.contacts.forEach(c=>{if(c.folder===id) c.folder=remaining[0].id;});
  S.folders=remaining;
  renderFoldersView(); renderDialView();
  if(S.tab==='contacts') renderContactsView();
  toast('🗑 Folder deleted');
}

// ─── NEW FOLDER MODAL ────────────────────────────────────
function openModal(id){
  if(id==='folderModal'){
    S.selEmoji='📁'; S.selColor='#00e676';
    document.getElementById('folderName').value='';
    renderModalPickers();
  }
  document.getElementById(id).classList.add('open');
}
function closeModal(id){ document.getElementById(id).classList.remove('open'); }

function renderModalPickers(){
  document.getElementById('emojiPicker').innerHTML=EMOJIS.map(e=>
    `<div class="emoji-opt ${e===S.selEmoji?'sel':''}" onclick="selEmoji('${e}')">${e}</div>`).join('');
  document.getElementById('colorPicker').innerHTML=COLORS.map(c=>
    `<div class="color-opt ${c===S.selColor?'sel':''}" style="background:${c};" onclick="selColor('${c}')"></div>`).join('');
}
function selEmoji(e){S.selEmoji=e;renderModalPickers();}
function selColor(c){S.selColor=c;renderModalPickers();}
function saveFolder(){
  const name=document.getElementById('folderName').value.trim();
  if(!name){toast('⚠️ Enter a folder name','var(--red)');return;}
  S.folders.push({id:'f'+Date.now(),name,icon:S.selEmoji,color:S.selColor});
  closeModal('folderModal'); renderFoldersView(); renderDialView();
  toast(`📁 "${name}" created`);
}

document.querySelectorAll('.modal-overlay').forEach(el=>{
  el.addEventListener('click',function(e){ if(e.target===this) this.classList.remove('open'); });
});

// ─── UPLOAD / DOWNLOAD ───────────────────────────────────

const FMT_HINTS = {
  csv:  'Name,Phone<br>John Doe,+91 98765 43210<br>Jane Smith,9876543210',
  vcf:  'BEGIN:VCARD<br>FN:John Doe<br>TEL:+919876543210<br>END:VCARD',
  json: '[{"name":"John","number":"+91 98765 43210"},…]',
  txt:  'John Doe: +91 98765 43210<br>Jane Smith - 9876543210',
};

let uploadState = { folderId:null, parsed:[], fmt:'csv', srcTab:'file', pickedIds:new Set() };

// ── SOURCE TAB ──
function setSrcTab(tab, el) {
  uploadState.srcTab = tab;
  document.querySelectorAll('.src-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.upload-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('panel-'+tab).classList.add('active');
  // Show/hide confirm buttons
  document.getElementById('uploadConfirmBtn').style.display = tab==='file' && uploadState.parsed.length ? 'block' : 'none';
  document.getElementById('pickConfirmBtn').style.display   = tab==='contacts' ? 'block' : 'none';
  if (tab==='contacts') { uploadState.pickedIds=new Set(); renderPickList(); }
}

function setFmtTab(fmt, el) {
  uploadState.fmt = fmt;
  document.querySelectorAll('.fmt-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('fmtHint').innerHTML = FMT_HINTS[fmt];
  resetFilePreview();
}

function openUploadModal(fid) {
  const f = byFid(fid);
  uploadState.folderId = fid;
  uploadState.parsed   = [];
  uploadState.fmt      = 'csv';
  uploadState.srcTab   = 'file';
  uploadState.pickedIds = new Set();
  document.getElementById('uploadModalTitle').textContent = `📤 ${f.icon} ${f.name}`;
  // Reset to file tab
  document.querySelectorAll('.src-tab').forEach((t,i)=>t.classList.toggle('active',i===0));
  document.querySelectorAll('.upload-panel').forEach((p,i)=>p.classList.toggle('active',i===0));
  document.querySelectorAll('.fmt-tab').forEach((t,i)=>t.classList.toggle('active',i===0));
  document.getElementById('fmtHint').innerHTML = FMT_HINTS['csv'];
  document.getElementById('fileInput').value = '';
  document.getElementById('uploadConfirmBtn').style.display = 'none';
  document.getElementById('pickConfirmBtn').style.display   = 'none';
  resetFilePreview();
  document.getElementById('uploadModal').classList.add('open');
}

function resetFilePreview() {
  document.getElementById('filePreview').classList.remove('show');
  document.getElementById('uploadProgress').classList.remove('show');
  document.getElementById('progressFill').style.width = '0%';
  document.getElementById('dropIcon').textContent = '📂';
  uploadState.parsed = [];
  document.getElementById('uploadConfirmBtn').style.display = 'none';
}

// ── CONTACT LIST PICKER ──
function renderPickList() {
  const fid   = uploadState.folderId;
  const query = document.getElementById('pickSearch').value.trim().toLowerCase();
  // Show all contacts NOT already in this folder
  const pool  = S.contacts.filter(c => c.folder !== fid);
  const filtered = query
    ? pool.filter(c => c.name.toLowerCase().includes(query) || c.number.includes(query))
    : pool;

  const list = document.getElementById('pickList');
  if (!filtered.length) {
    list.innerHTML = `<div class="pick-empty">${pool.length===0 ? 'No contacts in other folders' : 'No matches found'}</div>`;
    updatePickCount();
    return;
  }

  list.innerHTML = filtered.map(c => {
    const f    = byFid(c.folder);
    const clr  = f ? f.color : '#555';
    const icon = f ? f.icon  : '👤';
    const chk  = uploadState.pickedIds.has(c.id);
    return `<div class="pick-row ${chk?'checked':''}" onclick="togglePick('${c.id}')">
      <div class="pick-checkbox">${chk?'✓':''}</div>
      <div class="pick-avatar" style="background:${clr}18;border:1.5px solid ${clr}44;">${icon}</div>
      <div class="pick-info">
        <div class="pick-name">${esc(c.name)}</div>
        <div class="pick-num">${esc(c.number)}</div>
      </div>
      <div class="pick-folder-tag">${f ? esc(f.name) : ''}</div>
    </div>`;
  }).join('');
  updatePickCount();
}

function togglePick(cid) {
  if (uploadState.pickedIds.has(cid)) uploadState.pickedIds.delete(cid);
  else uploadState.pickedIds.add(cid);
  renderPickList();
}

function toggleSelectAll() {
  const fid   = uploadState.folderId;
  const query = document.getElementById('pickSearch').value.trim().toLowerCase();
  const pool  = S.contacts.filter(c => c.folder !== fid);
  const filtered = query ? pool.filter(c=>c.name.toLowerCase().includes(query)||c.number.includes(query)) : pool;
  const allSelected = filtered.every(c=>uploadState.pickedIds.has(c.id));
  if (allSelected) filtered.forEach(c=>uploadState.pickedIds.delete(c.id));
  else             filtered.forEach(c=>uploadState.pickedIds.add(c.id));
  renderPickList();
}

function updatePickCount() {
  const n = uploadState.pickedIds.size;
  document.getElementById('pickSelCount').textContent = `${n} selected`;
  document.getElementById('pickConfirmBtn').style.display = (uploadState.srcTab==='contacts') ? 'block' : 'none';
  document.getElementById('pickConfirmBtn').textContent = n ? `ADD ${n} CONTACT${n!==1?'S':''}` : 'ADD SELECTED';
  document.getElementById('pickConfirmBtn').style.opacity = n ? '1' : '0.4';
  document.getElementById('pickConfirmBtn').style.pointerEvents = n ? 'auto' : 'none';
}

function confirmPickContacts() {
  const fid  = uploadState.folderId;
  const f    = byFid(fid);
  const ids  = [...uploadState.pickedIds];
  if (!ids.length) { toast('⚠️ Select at least one contact','var(--red)'); return; }

  // Copy contacts into this folder (they keep their original folder too — this ADDS a clone)
  // If same number already in target folder, skip
  let added=0, skipped=0;
  ids.forEach(id => {
    const src = S.contacts.find(c=>c.id===id);
    if (!src) return;
    if (inFld(fid).find(c=>c.number===src.number)) { skipped++; return; }
    S.contacts.push({ id:uid(), name:src.name, number:src.number, folder:fid });
    added++;
  });

  closeModal('uploadModal');
  renderAllViews();
  let msg = `✅ ${added} contact${added!==1?'s':''} added to ${f.icon} ${f.name}`;
  if (skipped) msg += ` (${skipped} already there)`;
  toast(msg);
}

function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('dropZone').classList.add('drag-over');
}
function handleDragLeave() {
  document.getElementById('dropZone').classList.remove('drag-over');
}
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('dropZone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
}
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) processFile(file);
}

function processFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  // Auto-detect format
  if (['csv','vcf','json','txt'].includes(ext)) {
    uploadState.fmt = ext === 'vcf' ? 'vcf' : ext;
    document.querySelectorAll('.fmt-tab').forEach((t,i)=>{
      t.classList.toggle('active', ['csv','vcf','json','txt'][i]===uploadState.fmt);
    });
  }

  // Show progress
  document.getElementById('uploadProgress').classList.add('show');
  animateProgress(0, 60, 300, ()=>{
    const reader = new FileReader();
    reader.onload = e => {
      animateProgress(60, 100, 200, ()=>{
        const contacts = parseFileContent(e.target.result, uploadState.fmt, file.name);
        uploadState.parsed = contacts;
        showFilePreview(file, contacts);
        document.getElementById('uploadProgress').classList.remove('show');
      });
    };
    reader.readAsText(file);
  });
}

function animateProgress(from, to, duration, cb) {
  const fill = document.getElementById('progressFill');
  const start = performance.now();
  function step(now) {
    const t = Math.min((now-start)/duration, 1);
    fill.style.width = (from + (to-from)*t) + '%';
    if (t < 1) requestAnimationFrame(step);
    else if (cb) cb();
  }
  requestAnimationFrame(step);
}

// ── PARSERS ──
function parseFileContent(text, fmt, filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const f = ext==='vcf' ? 'vcf' : fmt;
  try {
    if (f==='csv')  return parseCSV(text);
    if (f==='vcf')  return parseVCF(text);
    if (f==='json') return parseJSON(text);
    if (f==='txt')  return parseTXT(text);
  } catch(e) { toast('⚠️ Parse error: '+e.message,'var(--red)'); }
  return [];
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(l=>l.trim());
  const results = [];
  // Detect if first line is header
  const first = lines[0].toLowerCase();
  const start = (first.includes('name')||first.includes('phone')||first.includes('tel')) ? 1 : 0;
  for (let i=start; i<lines.length; i++) {
    const cols = lines[i].split(',').map(c=>c.trim().replace(/^"|"$/g,''));
    if (cols.length>=2) {
      const name = cols[0], number = cols[1];
      if (name && number) results.push({name, number});
    } else if (cols.length===1 && cols[0].match(/\d{5,}/)) {
      results.push({name:'Contact '+(i), number:cols[0]});
    }
  }
  return results;
}

function parseVCF(text) {
  const cards = text.split(/END:VCARD/i).filter(c=>c.trim());
  return cards.map(card=>{
    const nameMatch  = card.match(/FN[^:]*:(.+)/i) || card.match(/N[^:]*:([^;\n]+)/i);
    const telMatch   = card.match(/TEL[^:]*:([^\r\n]+)/i);
    const name   = nameMatch  ? nameMatch[1].trim().replace(/\r/g,'') : 'Unknown';
    const number = telMatch   ? telMatch[1].trim().replace(/\r/g,'').replace(/\s/g,'') : '';
    return number ? {name, number} : null;
  }).filter(Boolean);
}

function parseJSON(text) {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : (data.contacts || data.cs || []);
  return arr.map(item=>({
    name:   item.name || item.n || item.Name || 'Unknown',
    number: String(item.number || item.phone || item.tel || item.p || item.Phone || ''),
  })).filter(c=>c.number);
}

function parseTXT(text) {
  const lines = text.trim().split(/\r?\n/).filter(l=>l.trim());
  return lines.map(line=>{
    // Supports: "Name: number", "Name - number", "Name number"
    const m = line.match(/^(.+?)[\s]*[-:–][\s]*(\+?[\d\s\-().]{7,})$/) ||
              line.match(/^(.+?)\s+(\+?[\d]{10,})$/);
    if (m) return { name:m[1].trim(), number:m[2].trim().replace(/\s/g,'') };
    // pure number line
    const pure = line.match(/(\+?[\d\s\-().]{7,})/);
    if (pure) return { name:'Contact', number:pure[1].trim().replace(/\s/g,'') };
    return null;
  }).filter(Boolean);
}

// ── PREVIEW ──
function showFilePreview(file, contacts) {
  const prev = document.getElementById('filePreview');
  prev.classList.add('show');
  document.getElementById('previewName').textContent = file.name;
  document.getElementById('previewSize').textContent = (file.size/1024).toFixed(1)+'KB';
  document.getElementById('previewRows').textContent = `${contacts.length} contact${contacts.length!==1?'s':''} found`;
  document.getElementById('previewIcon').textContent = contacts.length>0 ? '✅' : '⚠️';
  document.getElementById('dropIcon').textContent = contacts.length>0 ? '✅' : '❌';

  document.getElementById('previewList').innerHTML = contacts.slice(0,8).map(c=>
    `<div class="file-preview-item"><span>${esc(c.name)}</span><span>${esc(c.number)}</span></div>`
  ).join('') + (contacts.length>8 ? `<div class="file-preview-item" style="color:var(--muted)">…and ${contacts.length-8} more</div>` : '');

  if (contacts.length>0) {
    document.getElementById('uploadConfirmBtn').style.display = 'block';
    document.getElementById('pickConfirmBtn').style.display   = 'none';
  }
}

function confirmUpload() {
  const fid = uploadState.folderId;
  const f   = byFid(fid);
  if (!uploadState.parsed.length) return;
  let added=0, skipped=0;
  uploadState.parsed.forEach(c=>{
    if (!S.contacts.find(x=>x.number===c.number)) {
      S.contacts.push({id:uid(), name:c.name, number:c.number, folder:fid});
      added++;
    } else skipped++;
  });
  closeModal('uploadModal');
  renderAllViews();
  let msg = `✅ ${added} contact${added!==1?'s':''} added to ${f.icon} ${f.name}`;
  if (skipped) msg += ` (${skipped} skipped)`;
  toast(msg);
}

// ── DOWNLOAD / EXPORT ──
function downloadFolder(fmt) {
  const fid = uploadState.folderId;
  const f   = byFid(fid);
  const cts = inFld(fid);
  if (!cts.length) { toast('⚠️ No contacts to export','var(--red)'); return; }

  let content='', mime='', ext=fmt;
  if (fmt==='csv') {
    content = 'Name,Phone\n' + cts.map(c=>`"${c.name}","${c.number}"`).join('\n');
    mime = 'text/csv';
  } else if (fmt==='vcf') {
    content = cts.map(c=>
      `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${c.name}\r\nTEL:${c.number}\r\nEND:VCARD`
    ).join('\r\n');
    mime = 'text/vcard'; ext='vcf';
  } else if (fmt==='json') {
    const payload = { folder:{name:f.name,icon:f.icon,color:f.color}, contacts:cts.map(c=>({name:c.name,number:c.number})) };
    content = JSON.stringify(payload, null, 2);
    mime = 'application/json';
  }

  const blob = new Blob([content],{type:mime});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `${f.name.replace(/\s+/g,'_')}_contacts.${ext}`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast(`⬇️ ${f.name} exported as .${ext}`);
}

// ─── INIT ─────────────────────────────────────────────────
renderDialView();
updateDisplay();
checkURLForShare();
