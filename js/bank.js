// ── Q&A BANK ──────────────────────────────────────────
let _bankSelected = new Set();
function populateBankAppFilter() {
  const sel = document.getElementById('f-app');
  const current = sel.value;
  const appIds = new Set(dbGetQuestions().map(q => q.appId).filter(Boolean));
  const apps = [...appIds].map(id => dbGetApp(id)).filter(Boolean).sort((a, b) => a.company.localeCompare(b.company));
  sel.innerHTML = `<option value="">All companies</option>` + apps.map(a => `<option value="${a.id}">${esc(a.company)}</option>`).join('');
  if (current) sel.value = current;
}

function populateBankRoundFilter(appId) {
  const sel = document.getElementById('f-round');
  const current = sel.value;
  const rounds = [...new Set(dbGetQuestions().filter(q => q.round && (!appId || q.appId === appId)).map(q => q.round))].sort();
  sel.innerHTML = `<option value="">All rounds</option>` + rounds.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join('');
  if (rounds.includes(current)) sel.value = current;
}

function onBankAppChange() {
  populateBankRoundFilter(document.getElementById('f-app').value);
  document.getElementById('f-round').value = '';
  renderBank();
}

function jumpToBank(opts = {}) {
  populateBankAppFilter();
  document.getElementById('f-app').value = opts.appId || '';
  populateBankRoundFilter(opts.appId || '');
  document.getElementById('f-round').value = opts.round || '';
  document.getElementById('f-type').value = opts.type || '';
  document.getElementById('f-source').value = opts.source || '';
  document.getElementById('f-score').value = '';
  document.getElementById('search-q').value = '';
  showPage('bank');
}
function mdFmt(text) {
  if (!text) return '';
  const escaped = esc(text);
  // numbered lists: collect consecutive "N. item" lines into <ol>
  const withLists = escaped.replace(/((?:^\d+\. .+$\n?)+)/gm, match => {
    const items = match.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('');
    return `<ol style="margin:6px 0 6px 18px">${items}</ol>`;
  });
  // bold
  const withBold = withLists.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // line breaks (outside of list blocks)
  return withBold.replace(/\n/g, '<br>');
}

function qaCardHTML(q) {
  const app = dbGetApp(q.appId);
  const tClass = typeClass(q.type);
  const tLabel = typeLabel(q.type);
  const isMock = q.source === 'mock';
  return `<div class="qa-card ${isMock ? 'source-mock' : ''}" data-id="${q.id}" onclick="toggleAns('${q.id}')">
    <div class="qa-q">${esc(q.q)}</div>
    <div class="qa-ans" id="ans-${q.id}">${q.a ? `<div>${mdFmt(q.a)}</div>` : '<span style="color:var(--t3);font-style:italic;font-size:12px">No answer recorded</span>'}${q.note ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--b2);font-size:12px;color:var(--t2)"><span style="color:var(--t3);font-style:italic">Notes: </span>${mdFmt(q.note)}</div>` : ''}</div>
    <div class="qa-foot">
      <span class="tag ${tClass}" style="cursor:pointer" data-ft="${q.type||''}" onclick="event.stopPropagation();jumpToBank({type:this.dataset.ft})">${tLabel}</span>
      <span class="tag ${isMock ? 'tag-mock' : 'tag-real'}" style="cursor:pointer" data-fs="${q.source||''}" onclick="event.stopPropagation();jumpToBank({source:this.dataset.fs})">${isMock ? 'mock' : 'real'}</span>
      ${app ? `<span class="tag tag-co" style="cursor:pointer" data-fa="${q.appId}" onclick="event.stopPropagation();jumpToBank({appId:this.dataset.fa})">${esc(app.company)}</span>` : ''}
      ${q.round ? `<span class="tag tag-round" style="cursor:pointer" data-fa="${q.appId}" data-fr="${esc(q.round)}" onclick="event.stopPropagation();jumpToBank({appId:this.dataset.fa,round:this.dataset.fr})">${esc(q.round)}</span>` : ''}
      ${(q.tags || []).map(t => `<span class="tag tag-tech">${esc(t)}</span>`).join('')}
      <span class="score-chip score-${q.score||0}" onclick="event.stopPropagation();cycleScore('${q.id}')">${scoreChipLabel(q.score||0)}</span>
      <button class="btn-icon" style="font-size:15px;color:var(--t2)" onclick="event.stopPropagation();openEditQ('${q.id}')">✎</button>
      <button class="btn-icon" style="font-size:12px;color:var(--coral)" onclick="event.stopPropagation();confirmDeleteQ('${q.id}')">✕</button>
    </div>
  </div>`;
}

function toggleAns(id) { document.getElementById('ans-' + id)?.classList.toggle('show'); }

function scoreChipLabel(s) {
  if (s === 1) return 'Weak';
  if (s === 2) return 'Ok';
  if (s === 3) return 'Strong';
  return '·';
}

function cycleScore(id) {
  const q = dbGetQuestion(id); if (!q) return;
  const next = ((q.score || 0) + 1) % 4;
  dbUpdateQuestion(id, { score: next });
  const chip = document.querySelector(`.qa-card[data-id="${id}"] .score-chip`);
  if (chip) { chip.className = `score-chip score-${next}`; chip.textContent = scoreChipLabel(next); }
}

function confirmDeleteQ(id) {
  if (!confirm('Delete this question?')) return;
  dbDeleteQuestion(id);
  renderBank();
  toast('Deleted');
}

function bankCardHTML(q) {
  const isSelected = _bankSelected.has(q.id);
  return `<div style="position:relative">
    <button style="position:absolute;top:8px;right:8px;z-index:1;width:18px;height:18px;border:1px solid var(--b2);border-radius:3px;background:${isSelected ? 'var(--blue)' : 'var(--s2)'};color:${isSelected ? '#fff' : 'transparent'};font-size:10px;cursor:pointer;padding:0;line-height:1;flex-shrink:0" onclick="event.stopPropagation();toggleBankSelect('${q.id}')" title="Select">${isSelected ? '✓' : ''}</button>
    ${qaCardHTML(q)}
  </div>`;
}

function toggleBankSelect(id) {
  if (_bankSelected.has(id)) _bankSelected.delete(id);
  else _bankSelected.add(id);
  updateBulkBar();
  const wrap = document.querySelector(`[data-id="${id}"]`)?.closest('[style*="position:relative"]');
  if (wrap) wrap.outerHTML = bankCardHTML(dbGetQuestion(id));
}

function updateBulkBar() {
  const bar = document.getElementById('bulk-bar');
  const n = _bankSelected.size;
  bar.style.display = n ? 'flex' : 'none';
  if (!n) return;
  document.getElementById('bulk-count').textContent = `${n} selected`;
  const roundNames = new Set();
  _bankSelected.forEach(id => {
    const q = dbGetQuestion(id);
    if (q?.appId) (dbGetApp(q.appId)?.rounds || []).forEach(r => roundNames.add(r.name));
  });
  document.getElementById('bulk-round-options').innerHTML = [...roundNames].map(n => `<option value="${esc(n)}">`).join('');
}

function clearBankSelection() {
  _bankSelected.clear();
  renderBank();
}

function applyBulkRound() {
  const round = document.getElementById('bulk-round').value.trim();
  if (!round) { toast('Enter a round name'); return; }
  const n = _bankSelected.size;
  _bankSelected.forEach(id => dbUpdateQuestion(id, { round }));
  _bankSelected.clear();
  renderBank();
  toast(`Set round on ${n} question${n !== 1 ? 's' : ''}`);
}

function renderBank() {
  populateBankAppFilter();
  const appId = document.getElementById('f-app').value;
  populateBankRoundFilter(appId);
  const s = document.getElementById('search-q').value;
  const t = document.getElementById('f-type').value;
  const sc = document.getElementById('f-score').value;
  const src = document.getElementById('f-source').value;
  const round = document.getElementById('f-round').value;
  let qs = dbGetQuestions({
    search: s, type: t || undefined,
    score: sc !== '' ? parseInt(sc) : undefined,
    source: src || undefined,
  });
  if (appId) qs = qs.filter(q => q.appId === appId);
  if (round) qs = qs.filter(q => q.round === round);
  const grid = document.getElementById('qa-grid');
  if (!qs.length) {
    grid.innerHTML = `<div class="empty"><div class="empty-icon">?</div><div class="empty-text">No questions found<br><span style="font-size:12px">Add manually or import from a transcript</span></div></div>`;
    return;
  }
  grid.innerHTML = qs.map(bankCardHTML).join('');
}

// ── QUESTION CRUD ─────────────────────────────────────
let _qTags = [];

function renderQTags() {
  document.getElementById('q-tags-wrap').innerHTML = _qTags.map((t, i) =>
    `<span class="tag tag-tech" style="display:inline-flex;align-items:center;gap:3px">${esc(t)}<button class="tag-remove" onclick="removeQTag(${i})">×</button></span>`
  ).join('');
}

function removeQTag(i) { _qTags.splice(i, 1); renderQTags(); }

function addQTag() {
  const input = document.getElementById('q-tag-input');
  const val = input.value.trim().toLowerCase().replace(/\s+/g, '-');
  input.value = '';
  if (!val || _qTags.includes(val)) return;
  _qTags.push(val);
  renderQTags();
}

function updateQRoundDatalist(appId) {
  const rounds = appId ? (dbGetApp(appId)?.rounds || []) : [];
  document.getElementById('q-round-options').innerHTML = rounds.map(r => `<option value="${esc(r.name)}">`).join('');
}

function openAddQ(appId = '') {
  document.getElementById('q-id').value = '';
  document.getElementById('modal-q-title').textContent = 'Add question';
  document.getElementById('q-q').value = '';
  document.getElementById('q-a').value = '';
  document.getElementById('q-type').value = 'behavioral';
  document.getElementById('q-score').value = '0';
  document.getElementById('q-round').value = '';
  document.getElementById('q-source').value = appId ? 'real' : 'mock';
  document.getElementById('q-note').value = '';
  document.getElementById('q-tag-input').value = '';
  _qTags = []; renderQTags();
  populateAppSelect('q-app', appId);
  updateQRoundDatalist(appId);
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
  document.getElementById('q-note').value = q.note || '';
  document.getElementById('q-tag-input').value = '';
  _qTags = [...(q.tags || [])]; renderQTags();
  populateAppSelect('q-app', q.appId || '');
  updateQRoundDatalist(q.appId || '');
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
    note: document.getElementById('q-note').value.trim(),
    tags: _qTags,
  };
  if (id) {
    dbUpdateQuestion(id, data);
  } else {
    const newQ = dbAddQuestion(data);
    extractTags(data.q).then(tags => {
      const merged = [...new Set([..._qTags, ...tags])];
      if (merged.length > _qTags.length) { dbUpdateQuestion(newQ.id, { tags: merged }); renderBank(); }
    }).catch(() => {});
  }
  closeModal('modal-q');
  const pg = document.querySelector('.page.on');
  if (pg?.id === 'page-bank') renderBank();
  toast('Saved');
}

// ── IMPORT ────────────────────────────────────────────
let _extracted = [], _importTab = 'transcript', _mdContent = '', _selectAllState = true;

function updateImportRound(tab) {
  const appId = document.getElementById(`imp-app-${tab}`).value;
  const container = document.getElementById(`imp-round-${tab}`);
  const rounds = appId ? (dbGetApp(appId)?.rounds || []) : [];
  if (rounds.length) {
    container.innerHTML = `<select class="fs" id="imp-round-${tab}-val"><option value=""></option>${rounds.map(r => `<option value="${esc(r.name)}">${esc(r.name)}</option>`).join('')}</select>`;
  } else {
    container.innerHTML = `<input class="fi" id="imp-round-${tab}-val" placeholder="e.g. Technical round 1">`;
  }
}

function openImport() {
  populateAppSelect('imp-app-t', '');
  populateAppSelect('imp-app-md', '');
  document.getElementById('imp-transcript').value = '';
  document.getElementById('md-file').value = '';
  document.getElementById('md-preview-wrap').style.display = 'none';
  document.getElementById('btn-extract-md').disabled = true;
  document.getElementById('import-results').style.display = 'none';
  _extracted = []; _mdContent = '';
  document.getElementById('imp-autotag').checked = false;
  updateImportRound('t');
  updateImportRound('md');
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
[{"question":"...","type":"behavioral|system|coding|other","tags":[]}]
Rules: behavioral=past experience, system=design/architecture, coding=algorithm/code, other=logistics/clarification.
For tags: specific technologies AND underlying CS concepts being tested. Lowercase, hyphenated.
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
[{"question":"...","type":"behavioral|system|coding|other","answer":"answer notes or empty string","tags":[]}]
For tags: specific technologies AND underlying CS concepts being tested. Lowercase, hyphenated.
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
  const tab = _importTab === 'transcript' ? 't' : 'md';
  const appId = document.getElementById(`imp-app-${tab}`).value;
  const roundEl = document.getElementById(`imp-round-${tab}-val`);
  const round = roundEl ? roundEl.value.trim() : '';
  const selected = _extracted.filter(q => q.selected);
  if (!selected.length) { toast('Nothing selected'); return; }
  const autoTag = document.getElementById('imp-autotag').checked;
  const saved = selected.map(q => dbAddQuestion({
    q: q.question, a: q.answer || '', type: q.type || 'other', tags: Array.isArray(q.tags) ? q.tags : [],
    appId, round, source: appId ? 'real' : 'mock',
  }));
  closeModal('modal-import'); renderBank(); updateStats();
  toast(`${selected.length} questions imported`);
  if (autoTag) {
    (async () => {
      for (const newQ of saved) {
        const tags = await extractTags(newQ.q);
        dbUpdateQuestion(newQ.id, { tags });
      }
      renderBank();
    })();
  }
}

// ── AUTO-TAG ──────────────────────────────────────────
let _autoTagQuestions = [], _autoTagSelected = new Set();

function openAutoTag() {
  _autoTagQuestions = dbGetQuestions().filter(q => !q.tags || !q.tags.length);
  if (!_autoTagQuestions.length) { toast('All questions already have tags'); return; }
  _autoTagSelected = new Set(_autoTagQuestions.map(q => q.id));
  const btn = document.getElementById('btn-autotag-run');
  btn.disabled = false; btn.textContent = 'Tag selected'; btn.onclick = runAutoTag;
  document.getElementById('autotag-progress').textContent = '';
  renderAutoTagList();
  openModal('modal-autotag');
}

function renderAutoTagList() {
  const total = _autoTagQuestions.length;
  const n = _autoTagSelected.size;
  document.getElementById('autotag-sel-count').textContent = `${n} of ${total} selected`;
  document.getElementById('autotag-toggle-all').textContent = n === total ? 'Deselect all' : 'Select all';
  document.getElementById('autotag-list').innerHTML = _autoTagQuestions.map(q => {
    const on = _autoTagSelected.has(q.id);
    const preview = q.q.length > 120 ? q.q.slice(0, 120) + '\u2026' : q.q;
    return `<div class="q-check-item ${on ? 'selected' : ''}" onclick="toggleAutoTagItem('${q.id}')">
      <div class="q-check-box">${on ? '✓' : ''}</div>
      <div style="font-size:13px;line-height:1.4;flex:1">${esc(preview)}</div>
    </div>`;
  }).join('');
}

function toggleAutoTagItem(id) {
  if (_autoTagSelected.has(id)) _autoTagSelected.delete(id);
  else _autoTagSelected.add(id);
  renderAutoTagList();
}

function toggleAutoTagAll() {
  if (_autoTagSelected.size === _autoTagQuestions.length) _autoTagSelected.clear();
  else _autoTagQuestions.forEach(q => _autoTagSelected.add(q.id));
  renderAutoTagList();
}

async function runAutoTag() {
  const ids = [..._autoTagSelected];
  if (!ids.length) { toast('Select at least one question'); return; }
  const btn = document.getElementById('btn-autotag-run');
  const progress = document.getElementById('autotag-progress');
  btn.disabled = true;
  let done = 0;
  for (const id of ids) {
    const q = dbGetQuestion(id); if (!q) { done++; continue; }
    progress.textContent = `Tagging ${done + 1} / ${ids.length}\u2026`;
    const tags = await extractTags(q.q);
    dbUpdateQuestion(id, { tags });
    done++;
  }
  progress.textContent = 'Done';
  btn.disabled = false; btn.textContent = 'Close';
  btn.onclick = () => { closeModal('modal-autotag'); renderBank(); };
  renderBank();
  toast(`Tagged ${done} question${done !== 1 ? 's' : ''}`);
}
