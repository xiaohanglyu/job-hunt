// ── Q&A BANK ──────────────────────────────────────────
function qaCardHTML(q) {
  const app = dbGetApp(q.appId);
  const tClass = typeClass(q.type);
  const tLabel = typeLabel(q.type);
  const isMock = q.source === 'mock';
  return `<div class="qa-card ${isMock ? 'source-mock' : ''}" data-id="${q.id}" onclick="toggleAns('${q.id}')">
    <div class="qa-q">${esc(q.q)}</div>
    <div class="qa-ans" id="ans-${q.id}">${q.a ? `<div>${esc(q.a)}</div>` : '<span style="color:var(--t3);font-style:italic;font-size:12px">No answer recorded</span>'}</div>
    <div class="qa-foot">
      <span class="tag ${tClass}">${tLabel}</span>
      <span class="tag ${isMock ? 'tag-mock' : 'tag-real'}">${isMock ? 'mock' : 'real'}</span>
      ${app ? `<span class="tag tag-co">${esc(app.company)}</span>` : ''}
      ${q.round ? `<span class="tag tag-co">${esc(q.round)}</span>` : ''}
      <div class="score-dots" onclick="event.stopPropagation()">
        ${[1, 2, 3].map(i => `<span class="sdot ${(q.score || 0) >= i ? 'on' : ''}" onclick="setScore('${q.id}',${i})"></span>`).join('')}
      </div>
      <button class="btn-icon" style="font-size:12px" onclick="event.stopPropagation();openEditQ('${q.id}')">✎</button>
      <button class="btn-icon" style="font-size:12px;color:var(--coral)" onclick="event.stopPropagation();confirmDeleteQ('${q.id}')">✕</button>
    </div>
  </div>`;
}

function toggleAns(id) { document.getElementById('ans-' + id)?.classList.toggle('show'); }

function setScore(id, score) {
  dbUpdateQuestion(id, { score });
  document.querySelectorAll(`.qa-card[data-id="${id}"] .sdot`).forEach((d, i) => d.classList.toggle('on', i < score));
}

function confirmDeleteQ(id) {
  if (!confirm('Delete this question?')) return;
  dbDeleteQuestion(id);
  renderBank();
  toast('Deleted');
}

function renderBank() {
  const s = document.getElementById('search-q').value;
  const t = document.getElementById('f-type').value;
  const sc = document.getElementById('f-score').value;
  const src = document.getElementById('f-source').value;
  const qs = dbGetQuestions({
    search: s, type: t || undefined,
    score: sc !== '' ? parseInt(sc) : undefined,
    source: src || undefined,
  });
  const grid = document.getElementById('qa-grid');
  if (!qs.length) {
    grid.innerHTML = `<div class="empty"><div class="empty-icon">?</div><div class="empty-text">No questions found<br><span style="font-size:12px">Add manually or import from a transcript</span></div></div>`;
    return;
  }
  grid.innerHTML = qs.map(qaCardHTML).join('');
}

// ── QUESTION CRUD ─────────────────────────────────────
function openAddQ(appId = '') {
  document.getElementById('q-id').value = '';
  document.getElementById('modal-q-title').textContent = 'Add question';
  document.getElementById('q-q').value = '';
  document.getElementById('q-a').value = '';
  document.getElementById('q-type').value = 'behavioral';
  document.getElementById('q-score').value = '0';
  document.getElementById('q-round').value = '';
  document.getElementById('q-source').value = appId ? 'real' : 'mock';
  populateAppSelect('q-app', appId);
  openModal('modal-q');
}

function openEditQ(id) {
  const q = dbGetQuestion(id); if (!q) return;
  document.getElementById('q-id').value = id;
  document.getElementById('modal-q-title').textContent = 'Edit question';
  document.getElementById('q-q').value = q.q || '';
  document.getElementById('q-a').value = q.a || '';
  document.getElementById('q-type').value = q.type || 'behavioral';
  document.getElementById('q-score').value = q.score || 0;
  document.getElementById('q-round').value = q.round || '';
  document.getElementById('q-source').value = q.source || 'real';
  populateAppSelect('q-app', q.appId || '');
  openModal('modal-q');
}

function saveQ() {
  const id = document.getElementById('q-id').value;
  const q = document.getElementById('q-q').value.trim();
  if (!q) { toast('Question required'); return; }
  const data = {
    q, a: document.getElementById('q-a').value.trim(),
    type: document.getElementById('q-type').value,
    appId: document.getElementById('q-app').value,
    score: parseInt(document.getElementById('q-score').value) || 0,
    round: document.getElementById('q-round').value.trim(),
    source: document.getElementById('q-source').value,
  };
  if (id) { dbUpdateQuestion(id, data); }
  else { dbAddQuestion(data); }
  closeModal('modal-q');
  const pg = document.querySelector('.page.on');
  if (pg?.id === 'page-bank') renderBank();
  toast('Saved');
}

// ── IMPORT ────────────────────────────────────────────
let _extracted = [], _importTab = 'transcript', _mdContent = '', _selectAllState = true;

function openImport() {
  populateAppSelect('imp-app-t', '');
  populateAppSelect('imp-app-md', '');
  document.getElementById('imp-transcript').value = '';
  document.getElementById('md-file').value = '';
  document.getElementById('md-preview-wrap').style.display = 'none';
  document.getElementById('btn-extract-md').disabled = true;
  document.getElementById('import-results').style.display = 'none';
  _extracted = []; _mdContent = '';
  openModal('modal-import');
}

function switchImportTab(tab) {
  _importTab = tab;
  document.querySelectorAll('.import-tab').forEach((t, i) => t.classList.toggle('on', (i === 0 && tab === 'transcript') || (i === 1 && tab === 'markdown')));
  document.getElementById('pane-transcript').classList.toggle('on', tab === 'transcript');
  document.getElementById('pane-markdown').classList.toggle('on', tab === 'markdown');
  document.getElementById('import-results').style.display = 'none';
}

function readMdFile(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    _mdContent = ev.target.result;
    document.getElementById('md-preview').value = _mdContent.slice(0, 600) + (_mdContent.length > 600 ? '\n...' : '');
    document.getElementById('md-preview-wrap').style.display = 'block';
    document.getElementById('btn-extract-md').disabled = false;
  };
  reader.readAsText(file);
}

async function extractTranscript() {
  const text = document.getElementById('imp-transcript').value.trim();
  if (!text) { toast('Paste a transcript first'); return; }
  const btn = document.getElementById('btn-extract');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Extracting...';
  try {
    const raw = await callGroq(`Extract every question asked by the INTERVIEWER from this transcript.
Return ONLY a JSON array:
[{"question":"...","type":"behavioral|system|coding|other"}]
Rules: behavioral=past experience, system=design/architecture, coding=algorithm/code, other=logistics/clarification.
Filter out conversational filler (e.g. "do you want to go deeper?" is not a real question).
Transcript:\n${text}`);
    showExtracted(parseJSON(raw));
  } catch (e) { toast('Error: ' + e.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Extract questions'; }
}

async function extractMarkdown() {
  if (!_mdContent) { toast('Load a file first'); return; }
  const btn = document.getElementById('btn-extract-md');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Extracting...';
  try {
    const raw = await callGroq(`Extract every interview question from these notes regardless of format.
Return ONLY a JSON array:
[{"question":"...","type":"behavioral|system|coding|other","answer":"answer notes or empty string"}]
Document:\n${_mdContent.slice(0, 6000)}`);
    showExtracted(parseJSON(raw));
  } catch (e) { toast('Error: ' + e.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Extract questions'; }
}

function showExtracted(qs) {
  _extracted = qs.map((q, i) => ({ ...q, id: i, selected: true }));
  document.getElementById('import-results').style.display = 'block';
  document.getElementById('imp-count').textContent = `${qs.length} found`;
  renderExtracted();
}

function renderExtracted() {
  document.getElementById('imp-q-list').innerHTML = _extracted.map(q => {
    const tl = typeLabel(q.type); const tc = typeClass(q.type);
    return `<div class="q-check-item ${q.selected ? 'selected' : ''}" onclick="toggleExtracted(${q.id})">
      <div class="q-check-box">${q.selected ? '✓' : ''}</div>
      <div style="flex:1"><div style="font-size:13px;line-height:1.4">${esc(q.question)}</div>
      <div style="margin-top:4px"><span class="tag ${tc}">${tl}</span></div></div>
    </div>`;
  }).join('');
  document.getElementById('imp-sel-count').textContent = `${_extracted.filter(q => q.selected).length} selected`;
}

function toggleExtracted(id) {
  _extracted[id].selected = !_extracted[id].selected;
  renderExtracted();
}

function toggleSelectAll() {
  _selectAllState = !_selectAllState;
  _extracted.forEach(q => q.selected = _selectAllState);
  document.querySelector('[onclick="toggleSelectAll()"]').textContent = _selectAllState ? 'Deselect all' : 'Select all';
  renderExtracted();
}

function importSelected() {
  const appId = _importTab === 'transcript'
    ? document.getElementById('imp-app-t').value
    : document.getElementById('imp-app-md').value;
  const selected = _extracted.filter(q => q.selected);
  if (!selected.length) { toast('Nothing selected'); return; }
  selected.forEach(q => dbAddQuestion({
    q: q.question, a: q.answer || '', type: q.type || 'other',
    appId, source: appId ? 'real' : 'mock',
  }));
  closeModal('modal-import'); renderBank(); updateStats();
  toast(`${selected.length} questions imported`);
}
