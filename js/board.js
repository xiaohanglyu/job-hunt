// ── BOARD ─────────────────────────────────────────────
const COLS = [
  { id: 'applied',  label: 'Applied',       dot: 'd-applied' },
  { id: 'phone',    label: 'Phone screen',  dot: 'd-phone' },
  { id: 'tech',     label: 'Technical',     dot: 'd-tech' },
  { id: 'onsite',   label: 'Onsite',        dot: 'd-onsite' },
  { id: 'offer',    label: 'Offer',         dot: 'd-offer' },
  { id: 'rejected', label: 'Rejected',      dot: 'd-rejected' },
];

function renderBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  COLS.forEach(col => {
    const apps = dbGetApps().filter(a => a.status === col.id);
    const el = document.createElement('div');
    el.className = 'col';
    el.innerHTML = `<div class="col-head"><span class="cdot ${col.dot}"></span><span class="col-label">${col.label}</span><span class="col-n">${apps.length}</span></div><div class="col-cards" id="col-${col.id}"></div>`;
    board.appendChild(el);
    const cards = el.querySelector('.col-cards');
    apps.forEach(app => {
      const qc = dbGetQuestions({ appId: app.id }).length;
      const c = document.createElement('div');
      c.className = 'card';
      c.innerHTML = `<div class="card-co">${esc(app.company)}</div><div class="card-role">${esc(app.role || '—')}</div><div class="card-foot"><span class="chip chip-date">${app.date || '—'}</span>${qc ? `<span class="chip chip-q">${qc}Q</span>` : ''}</div>`;
      c.onclick = () => showDetail(app.id);
      cards.appendChild(c);
    });
    const add = document.createElement('button');
    add.className = 'card-add';
    add.textContent = '+ Add';
    add.onclick = () => openAddApp(col.id);
    cards.appendChild(add);
  });
}

// ── DETAIL ────────────────────────────────────────────
function showDetail(appId) {
  const app = dbGetApp(appId); if (!app) return;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
  document.getElementById('page-detail').classList.add('on');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  const col = COLS.find(c => c.id === app.status);
  const qs = dbGetQuestions({ appId });
  const rounds = app.rounds || [];
  const iws = app.interviewers || [];
  const metaItems = [
    { label: 'Location', val: app.location || '—' },
    { label: 'Work model', val: app.workmodel || '—' },
    { label: 'Salary range', val: app.salary || '—' },
    { label: 'Resume version', val: app.resumev || '—' },
    { label: 'Job link', val: app.joblink ? `<a href="${esc(app.joblink)}" target="_blank">Open ↗</a>` : '—' },
    { label: 'Resume link', val: app.resumelink ? `<a href="${esc(app.resumelink)}" target="_blank">Google Drive ↗</a>` : '—' },
  ];
  document.getElementById('detail-content').innerHTML = `
  <div class="detail-header">
    <button class="detail-back" onclick="backToBoard()">←</button>
    <div style="flex:1">
      <div class="detail-co">${esc(app.company)}</div>
      <div class="detail-role">${esc(app.role || '')}</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
      <span class="chip" style="display:flex;align-items:center;gap:5px;padding:4px 8px"><span class="cdot ${col?.dot || ''}" style="width:6px;height:6px;border-radius:50%"></span>${col?.label || app.status}</span>
      <button class="btn btn-ghost btn-sm" onclick="openEditApp('${appId}')">Edit</button>
      <button class="btn btn-danger btn-sm" onclick="deleteApp('${appId}')">Delete</button>
    </div>
  </div>
  <div class="meta-grid">${metaItems.map(m => `<div class="meta-item"><div class="meta-label">${m.label}</div><div class="meta-val">${m.val}</div></div>`).join('')}</div>
  ${app.notes ? `<div style="background:var(--s2);border:1px solid var(--b1);border-radius:var(--rad);padding:12px;margin-bottom:20px;font-size:13px;color:var(--t2)">${esc(app.notes)}</div>` : ''}
  <div style="margin-bottom:24px">
    <div class="section-row"><span class="section-label">Interview rounds</span><button class="btn btn-ghost btn-sm" onclick="openAddRound('${appId}')">+ Round</button></div>
    ${rounds.length ? rounds.map(r => `<div class="round-card">
      <div class="round-head"><span class="round-name">${esc(r.name)}</span><span class="round-date">${r.date || ''}</span>
      <span class="chip" style="margin-left:auto;background:${r.outcome === 'passed' ? 'rgba(77,217,164,.12)' : r.outcome === 'failed' ? 'rgba(244,124,106,.12)' : 'var(--s3)'};color:${r.outcome === 'passed' ? 'var(--teal)' : r.outcome === 'failed' ? 'var(--coral)' : 'var(--t3)'}">${r.outcome}</span></div>
      ${r.notes ? `<div style="font-size:12px;color:var(--t2);margin-bottom:6px">${esc(r.notes)}</div>` : ''}
      ${r.feedback ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--b1)"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--t3);margin-bottom:4px">Interviewer feedback</div><div style="font-size:12px;color:var(--t2)">${esc(r.feedback)}</div></div>` : ''}
    </div>`).join('') : '<div style="font-size:12px;color:var(--t3);padding:4px 0">No rounds yet</div>'}
  </div>
  <div style="margin-bottom:24px">
    <div class="section-row"><span class="section-label">Interviewers</span><button class="btn btn-ghost btn-sm" onclick="openAddIw('${appId}')">+ Interviewer</button></div>
    ${iws.length ? iws.map(iw => `<div class="iw-item"><div style="flex:1"><div class="iw-name">${esc(iw.name)}</div>${iw.title ? `<div class="iw-title">${esc(iw.title)}</div>` : ''}${iw.notes ? `<div class="iw-notes">${esc(iw.notes)}</div>` : ''}</div>${iw.linkedin ? `<a href="${esc(iw.linkedin)}" target="_blank" style="font-size:11px;font-family:var(--mono);color:var(--blue);text-decoration:none;flex-shrink:0">LinkedIn ↗</a>` : ''}</div>`).join('') : '<div style="font-size:12px;color:var(--t3);padding:4px 0">No interviewers yet</div>'}
  </div>
  <div>
    <div class="section-row"><span class="section-label">Questions (${qs.length})</span><button class="btn btn-ghost btn-sm" onclick="openAddQ('${appId}')">+ Question</button></div>
    <div class="qa-grid">${qs.length ? qs.map(q => qaCardHTML(q)).join('') : '<div style="font-size:12px;color:var(--t3);padding:4px 0">No questions logged yet</div>'}</div>
  </div>`;
}

function backToBoard() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
  document.getElementById('page-board').classList.add('on');
  document.querySelector('.tab').classList.add('on');
}

// ── APP CRUD ──────────────────────────────────────────
function openAddApp(status = 'applied') {
  document.getElementById('ea-id').value = '';
  document.getElementById('modal-app-title').textContent = 'Add application';
  ['company', 'salary', 'joblink', 'resumev', 'resumelink', 'notes'].forEach(f => document.getElementById('a-' + f).value = '');
  document.getElementById('a-role').value = localStorage.getItem('lastRole') || '';
  document.getElementById('a-location').value = localStorage.getItem('lastLocation') || 'Vancouver, BC';
  document.getElementById('a-workmodel').value = '';
  document.getElementById('a-status').value = status;
  document.getElementById('a-date').value = new Date().toISOString().slice(0, 10);
  document.getElementById('a-jd').value = '';
  document.getElementById('jd-box').style.display = 'none';
  document.getElementById('jd-toggle').textContent = 'expand ↓';
  document.getElementById('jd-status').textContent = '';
  openModal('modal-app');
}

function openEditApp(id) {
  const app = dbGetApp(id); if (!app) return;
  document.getElementById('ea-id').value = id;
  document.getElementById('modal-app-title').textContent = 'Edit application';
  document.getElementById('a-company').value = app.company || '';
  document.getElementById('a-role').value = app.role || '';
  document.getElementById('a-location').value = app.location || '';
  document.getElementById('a-workmodel').value = app.workmodel || '';
  document.getElementById('a-salary').value = app.salary || '';
  document.getElementById('a-status').value = app.status || 'applied';
  document.getElementById('a-date').value = app.date || '';
  document.getElementById('a-joblink').value = app.joblink || '';
  document.getElementById('a-resumev').value = app.resumev || '';
  document.getElementById('a-resumelink').value = app.resumelink || '';
  document.getElementById('a-notes').value = app.notes || '';
  document.getElementById('a-jd').value = '';
  document.getElementById('jd-box').style.display = 'none';
  document.getElementById('jd-toggle').textContent = 'expand ↓';
  document.getElementById('jd-status').textContent = '';
  openModal('modal-app');
}

function saveApp() {
  const id = document.getElementById('ea-id').value;
  const co = document.getElementById('a-company').value.trim();
  if (!co) { toast('Company required'); return; }
  const data = {
    company: co, role: document.getElementById('a-role').value.trim(),
    location: document.getElementById('a-location').value.trim(),
    workmodel: document.getElementById('a-workmodel').value,
    salary: document.getElementById('a-salary').value.trim(),
    status: document.getElementById('a-status').value,
    date: document.getElementById('a-date').value,
    joblink: document.getElementById('a-joblink').value.trim(),
    resumev: document.getElementById('a-resumev').value.trim(),
    resumelink: document.getElementById('a-resumelink').value.trim(),
    notes: document.getElementById('a-notes').value.trim(),
  };
  if (data.role) localStorage.setItem('lastRole', data.role);
  if (data.location) localStorage.setItem('lastLocation', data.location);
  if (id) { dbUpdateApp(id, data); }
  else { dbAddApp(data); }
  closeModal('modal-app'); renderBoard(); updateStats(); toast('Saved');
}

function deleteApp(id) {
  if (!confirm('Delete this application and all its data?')) return;
  dbDeleteApp(id); backToBoard(); renderBoard(); updateStats(); toast('Deleted');
}

// JD autofill
function toggleJdBox() {
  const box = document.getElementById('jd-box');
  const btn = document.getElementById('jd-toggle');
  const open = box.style.display === 'none';
  box.style.display = open ? 'block' : 'none';
  btn.textContent = open ? 'collapse ↑' : 'expand ↓';
}

async function parseJD() {
  const jd = document.getElementById('a-jd').value.trim();
  if (!jd) { toast('Paste a JD first'); return; }
  const btn = document.getElementById('btn-jd-parse');
  const status = document.getElementById('jd-status');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Parsing...';
  status.textContent = '';
  try {
    const raw = await callGroq(`Extract job details from this job description. Return ONLY a JSON object:
{"company":"","role":"","location":"","workmodel":"Remote|Hybrid|On-site or empty","salary":"salary range or empty","joblink":"URL if present or empty"}
Job description:\n${jd.slice(0, 4000)}`);
    const data = parseJSON(raw);
    if (data.company) document.getElementById('a-company').value = data.company;
    if (data.role) document.getElementById('a-role').value = data.role;
    if (data.location) document.getElementById('a-location').value = data.location;
    if (data.workmodel) document.getElementById('a-workmodel').value = data.workmodel;
    if (data.salary) document.getElementById('a-salary').value = data.salary;
    if (data.joblink) document.getElementById('a-joblink').value = data.joblink;
    status.textContent = 'Done — review and adjust below';
    status.style.color = 'var(--teal)';
  } catch (e) {
    status.textContent = 'Error: ' + e.message;
    status.style.color = 'var(--coral)';
  } finally {
    btn.disabled = false; btn.textContent = 'Autofill from JD';
  }
}

// ── ROUND CRUD ────────────────────────────────────────
function openAddRound(appId) {
  document.getElementById('r-appid').value = appId;
  document.getElementById('r-name').value = '';
  document.getElementById('r-date').value = new Date().toISOString().slice(0, 10);
  document.getElementById('r-outcome').value = 'pending';
  document.getElementById('r-notes').value = '';
  document.getElementById('r-feedback').value = '';
  openModal('modal-round');
}

function saveRound() {
  const appId = document.getElementById('r-appid').value;
  const app = dbGetApp(appId); if (!app) return;
  const name = document.getElementById('r-name').value.trim();
  if (!name) { toast('Round name required'); return; }
  if (!app.rounds) app.rounds = [];
  app.rounds.push({
    id: uid(), name, date: document.getElementById('r-date').value,
    outcome: document.getElementById('r-outcome').value,
    notes: document.getElementById('r-notes').value.trim(),
    feedback: document.getElementById('r-feedback').value.trim(),
  });
  dbSave(); closeModal('modal-round'); showDetail(appId); toast('Round added');
}

// ── INTERVIEWER CRUD ──────────────────────────────────
function openAddIw(appId) {
  document.getElementById('iw-appid').value = appId;
  ['name', 'title', 'li', 'notes'].forEach(f => document.getElementById('iw-' + f).value = '');
  openModal('modal-iw');
}

function saveIw() {
  const appId = document.getElementById('iw-appid').value;
  const app = dbGetApp(appId); if (!app) return;
  const name = document.getElementById('iw-name').value.trim();
  if (!name) { toast('Name required'); return; }
  if (!app.interviewers) app.interviewers = [];
  app.interviewers.push({
    id: uid(), name, title: document.getElementById('iw-title').value.trim(),
    linkedin: document.getElementById('iw-li').value.trim(),
    notes: document.getElementById('iw-notes').value.trim(),
  });
  dbSave(); closeModal('modal-iw'); showDetail(appId); toast('Interviewer added');
}
