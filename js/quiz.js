// ── QUIZ STUDY MODE ───────────────────────────────────
let quizQueue = [], quizIdx = 0, quizRevealed = false;

function populateQuizFilters() {
  const sel = document.getElementById('qz-app');
  const cur = sel.value;
  sel.innerHTML = '<option value="">All companies</option>';
  dbGetApps().forEach(a => sel.add(new Option(a.company, a.id)));
  sel.value = cur;
}

function initQuiz() {
  const type = document.getElementById('qz-type').value;
  const appId = document.getElementById('qz-app').value;
  const source = document.getElementById('qz-source').value;
  let qs = dbGetQuestions({
    type: type || undefined,
    appId: appId || undefined,
    source: source || undefined,
  });
  const due = qs.filter(isDue).sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
  const notDue = qs.filter(q => !isDue(q)).sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
  quizQueue = [...due, ...notDue];
  quizIdx = 0; quizRevealed = false;
  renderQuiz();
}

function renderQuiz() {
  const area = document.getElementById('quiz-area');
  if (!quizQueue.length) {
    area.innerHTML = `<div class="empty"><div class="empty-icon">📭</div><div class="empty-text">No questions to quiz<br><span style="font-size:12px">Add questions from Board or Q&A Bank first</span></div></div>`;
    return;
  }
  if (quizIdx >= quizQueue.length) {
    area.innerHTML = `<div class="quiz-card" style="text-align:center;padding:40px 28px">
      <div style="font-size:28px;margin-bottom:12px">✓</div>
      <div style="font-size:16px;font-weight:600;margin-bottom:8px">Session complete</div>
      <div style="font-size:13px;color:var(--t3);margin-bottom:24px">${quizQueue.length} questions reviewed</div>
      <button class="btn btn-accent" onclick="initQuiz()">Start again</button>
    </div>`;
    return;
  }
  const q = quizQueue[quizIdx];
  const app = dbGetApp(q.appId);
  const tLabel = typeLabel(q.type);
  const pct = Math.round((quizIdx / quizQueue.length) * 100);
  const dueNow = isDue(q);
  const nextStr = q.nextReview ? new Date(q.nextReview).toLocaleDateString() : '—';
  area.innerHTML = `
    <div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <span style="font-family:var(--mono);font-size:11px;color:var(--t3)">${quizIdx + 1} / ${quizQueue.length}</span>
      <span style="font-size:11px;color:${dueNow ? 'var(--teal)' : 'var(--t3)'}">● ${dueNow ? 'Due now' : 'Next: ' + nextStr}</span>
    </div>
    <div class="quiz-card">
      <div class="quiz-type">${tLabel}</div>
      <div class="quiz-q">${esc(q.q)}</div>
      <div class="quiz-meta">${[app?.company, q.round].filter(Boolean).map(esc).join(' · ')}</div>
      <div class="quiz-ans ${quizRevealed ? 'show' : ''}">${q.a ? esc(q.a) : '<span style="color:var(--t3);font-style:italic">No answer recorded</span>'}</div>
      ${quizRevealed ? `
        <div class="quiz-btns">
          <button class="rate-btn bad" onclick="rateQuizQ('${q.id}',1)">Weak</button>
          <button class="rate-btn ok" onclick="rateQuizQ('${q.id}',2)">Ok</button>
          <button class="rate-btn good" onclick="rateQuizQ('${q.id}',3)">Strong</button>
        </div>` : `
        <div class="quiz-btns">
          <button class="btn btn-accent" onclick="revealQuiz()">Show answer</button>
          <button class="btn btn-ghost" onclick="skipQuiz()">Skip</button>
        </div>`}
    </div>`;
}

function revealQuiz() { quizRevealed = true; renderQuiz(); }
function skipQuiz() { quizIdx++; quizRevealed = false; renderQuiz(); }
function rateQuizQ(id, grade) {
  const q = dbGetQuestion(id);
  if (q) { dbUpdateQuestion(id, sm2Update(q, grade)); }
  quizIdx++; quizRevealed = false; renderQuiz();
}
