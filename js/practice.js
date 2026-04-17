// ── PRACTICE MODE ─────────────────────────────────────
let practiceQueue = [];
let practiceIdx = 0;
let practiceSessionStart = null;
let practiceResults = [];
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingSeconds = 0;
let lastBlob = null;
let selectedDuration = 20; // minutes
let questionShown = false;
let hintUsed = false;

// ── SESSION SETUP ─────────────────────────────────────
function initPractice() {
  populatePracticeFilters();
  renderPracticeSetup();
}

function populatePracticeFilters() {
  const sel = document.getElementById('pr-app');
  const cur = sel.value;
  sel.innerHTML = '<option value="">All companies</option>';
  dbGetApps().forEach(a => sel.add(new Option(a.company, a.id)));
  sel.value = cur;
}

function selectDuration(mins) {
  selectedDuration = mins;
  document.querySelectorAll('.duration-btn').forEach(b => b.classList.toggle('on', parseInt(b.dataset.mins) === mins));
}

function renderPracticeSetup() {
  document.getElementById('practice-area').innerHTML = `
    <div class="practice-setup">
      <h2>Practice session</h2>
      <div class="fg"><label class="fl">Duration</label>
        <div class="duration-grid">
          ${[10, 20, 30, 45].map(m => `<button class="duration-btn ${m === selectedDuration ? 'on' : ''}" data-mins="${m}" onclick="selectDuration(${m})">${m} min</button>`).join('')}
        </div>
      </div>
      <div class="fg-row">
        <div class="fg"><label class="fl">Company</label>
          <select class="fs" id="pr-app">
            <option value="">All companies</option>
            ${dbGetApps().map(a => `<option value="${a.id}">${esc(a.company)}</option>`).join('')}
          </select>
        </div>
        <div class="fg"><label class="fl">Type</label>
          <select class="fs" id="pr-type">
            <option value="">All types</option>
            <option value="behavioral">Behavioral</option>
            <option value="system">System design</option>
            <option value="coding">Coding</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <div class="fg"><label class="fl">Source</label>
        <select class="fs" id="pr-source">
          <option value="">All</option>
          <option value="real">Real interviews only</option>
          <option value="mock">Mock only</option>
        </select>
      </div>
      <button class="btn btn-accent" style="width:100%;justify-content:center;padding:12px" onclick="startPracticeSession()">Start session</button>
    </div>`;
}

function startPracticeSession() {
  const appId = document.getElementById('pr-app').value;
  const type = document.getElementById('pr-type').value;
  const source = document.getElementById('pr-source').value;
  let qs = dbGetQuestions({
    appId: appId || undefined,
    type: type || undefined,
    source: source || undefined,
  });
  // Weak-first ordering
  qs.sort((a, b) => (a.score || 0) - (b.score || 0));
  // Estimate how many questions fit in the duration (avg 3 min per question)
  const count = Math.max(1, Math.floor(selectedDuration / 3));
  practiceQueue = qs.slice(0, count);
  if (!practiceQueue.length) {
    toast('No questions match your filters'); return;
  }
  practiceIdx = 0;
  practiceResults = [];
  practiceSessionStart = Date.now();
  renderPracticeQuestion();
}

// ── QUESTION FLOW ─────────────────────────────────────
async function renderPracticeQuestion() {
  if (practiceIdx >= practiceQueue.length) {
    renderPracticeSummary(); return;
  }
  const q = practiceQueue[practiceIdx];
  const app = dbGetApp(q.appId);
  const tLabel = typeLabel(q.type);
  const pct = Math.round((practiceIdx / practiceQueue.length) * 100);
  questionShown = false;
  hintUsed = false;
  lastBlob = null;

  document.getElementById('practice-area').innerHTML = `
    <div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <span style="font-family:var(--mono);font-size:11px;color:var(--t3)">${practiceIdx + 1} / ${practiceQueue.length}</span>
      <span style="font-size:11px;color:var(--t3)">${selectedDuration} min session</span>
    </div>
    <div class="practice-card" id="practice-card">
      <div class="quiz-type">${tLabel}</div>

      <!-- Question: hidden by default, revealed by TTS playing or show-q button -->
      <div class="practice-q-hidden" id="pq-text" style="display:none">
        <div class="practice-q">${esc(q.q)}</div>
        <div class="practice-meta">${[app?.company, q.round].filter(Boolean).map(esc).join(' · ')}</div>
      </div>

      <!-- TTS + show hint -->
      <div class="practice-controls" id="practice-controls">
        <div class="tts-row">
          <button class="btn btn-ghost" id="btn-tts" onclick="playQuestion()">
            ▶ Play question
          </button>
          <button class="show-q-btn" id="btn-show-q" onclick="showQuestion()">Show text</button>
        </div>

        <!-- Recording controls (shown after TTS) -->
        <div class="record-row" id="record-row" style="display:none">
          <button class="btn-record" id="btn-record" onclick="toggleRecording()">⏺</button>
          <div class="record-time" id="record-time">00:00</div>
          <div style="font-size:11px;color:var(--t3)">Record your answer</div>
        </div>
      </div>

      <!-- Feedback area -->
      <div id="feedback-area" style="display:none"></div>
    </div>`;
}

async function playQuestion() {
  const q = practiceQueue[practiceIdx];
  const btn = document.getElementById('btn-tts');
  btn.disabled = true;
  btn.textContent = '▶ Playing...';
  try {
    await ttsSpeak(q.q);
  } catch (e) {
    toast('TTS error: ' + e.message, 'error');
  }
  btn.textContent = '▶ Replay';
  btn.disabled = false;
  // Show question text and recording controls after first play
  document.getElementById('pq-text').style.display = 'block';
  document.getElementById('record-row').style.display = 'flex';
  questionShown = true;
}

function showQuestion() {
  const btn = document.getElementById('btn-show-q');
  if (!questionShown) {
    document.getElementById('pq-text').style.display = 'block';
    document.getElementById('record-row').style.display = 'flex';
    questionShown = true;
    hintUsed = true;
    btn.textContent = 'Text shown';
    btn.classList.add('used');
  }
}

// ── RECORDING ─────────────────────────────────────────
async function toggleRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    stopRecording();
  } else {
    await startRecording();
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      lastBlob = new Blob(audioChunks, { type: 'audio/webm' });
      await processPracticeAnswer();
    };
    mediaRecorder.start();
    recordingSeconds = 0;
    const btn = document.getElementById('btn-record');
    const timeEl = document.getElementById('record-time');
    btn.classList.add('recording');
    btn.textContent = '⏹';
    recordingTimer = setInterval(() => {
      recordingSeconds++;
      const m = String(Math.floor(recordingSeconds / 60)).padStart(2, '0');
      const s = String(recordingSeconds % 60).padStart(2, '0');
      if (timeEl) timeEl.textContent = `${m}:${s}`;
    }, 1000);
  } catch (e) {
    toast('Microphone access denied. Use localhost or https.', 'error');
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    clearInterval(recordingTimer);
    mediaRecorder.stop();
    const btn = document.getElementById('btn-record');
    if (btn) { btn.classList.remove('recording'); btn.textContent = '⏺'; btn.disabled = true; }
    document.getElementById('feedback-area').innerHTML = `<div style="text-align:center;padding:20px;color:var(--t3)"><span class="spinner"></span>Analyzing your answer...</div>`;
    document.getElementById('feedback-area').style.display = 'block';
  }
}

// ── AI FEEDBACK ───────────────────────────────────────
async function processPracticeAnswer() {
  const q = practiceQueue[practiceIdx];
  let transcript = '';
  try {
    // Transcribe with Groq Whisper
    const formData = new FormData();
    formData.append('file', lastBlob, 'answer.webm');
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'en');
    const key = (typeof CONFIG !== 'undefined' && CONFIG.groqKey) || '';
    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'User-Agent': 'curl/7.88.1' },
      body: formData
    });
    const data = await res.json();
    transcript = data.text || '';
  } catch (e) {
    transcript = '[Transcription failed — feedback based on question only]';
  }

  // Get AI feedback
  let feedback = null;
  try {
    const app = dbGetApp(q.appId);
    const raw = await callGroq(`You are an expert interview coach. Evaluate this interview answer.

Question: ${q.q}
Expected answer notes: ${q.a || 'none recorded'}
Candidate answer (transcribed): ${transcript}

Return ONLY a JSON object:
{
  "content_score": 1-5,
  "content_feedback": "2-3 sentences on structure, completeness, key points",
  "english_feedback": "1-2 sentences on clarity, expression, grammar",
  "improvement": "one specific actionable tip"
}`);
    feedback = parseJSON(raw);
  } catch (e) {
    feedback = { content_score: 0, content_feedback: 'AI feedback unavailable: ' + e.message, english_feedback: '', improvement: '' };
  }

  practiceResults.push({ qId: q.id, transcript, feedback, hintUsed, duration: recordingSeconds });
  renderFeedback(q, transcript, feedback);
}

function renderFeedback(q, transcript, feedback) {
  const score = feedback.content_score || 0;
  const stars = '★'.repeat(score) + '☆'.repeat(5 - score);
  const area = document.getElementById('feedback-area');
  area.style.display = 'block';
  area.innerHTML = `
    <div class="feedback-box">
      ${transcript ? `<div class="feedback-section"><div class="feedback-label">Your answer</div><div class="feedback-content" style="font-style:italic;color:var(--t3)">${esc(transcript)}</div></div>` : ''}
      <div class="feedback-section">
        <div class="feedback-label">Content <span style="color:var(--amber);letter-spacing:2px">${stars}</span></div>
        <div class="feedback-content">${esc(feedback.content_feedback || '')}</div>
      </div>
      ${feedback.english_feedback ? `<div class="feedback-section"><div class="feedback-label">English expression</div><div class="feedback-content">${esc(feedback.english_feedback)}</div></div>` : ''}
      ${feedback.improvement ? `<div class="feedback-section"><div class="feedback-label">Tip</div><div class="feedback-content" style="color:var(--teal)">${esc(feedback.improvement)}</div></div>` : ''}
      ${hintUsed ? `<div style="font-size:11px;color:var(--amber);margin-top:4px">⚠ Text hint was used for this question</div>` : ''}
    </div>

    ${lastBlob ? `<div class="save-recording-bar">
      <span style="flex:1;color:var(--t2)">Save this recording?</span>
      <button class="btn btn-ghost btn-sm" onclick="saveRecording()">Save</button>
      <button class="btn btn-ghost btn-sm" onclick="nextPracticeQ()">Skip →</button>
    </div>` : ''}

    <div style="display:flex;gap:8px;margin-top:16px;justify-content:center">
      <div class="feedback-label" style="align-self:center;margin:0">Rate yourself:</div>
      <button class="rate-btn bad" onclick="ratePracticeQ('${q.id}',1)">Weak</button>
      <button class="rate-btn ok" onclick="ratePracticeQ('${q.id}',2)">Ok</button>
      <button class="rate-btn good" onclick="ratePracticeQ('${q.id}',3)">Strong</button>
    </div>`;
}

function saveRecording() {
  if (!lastBlob) return;
  const q = practiceQueue[practiceIdx];
  const app = dbGetApp(q.appId);
  const date = new Date().toISOString().slice(0, 10);
  const co = app?.company?.toLowerCase().replace(/\s+/g, '-') || 'unknown';
  const type = q.type || 'other';
  const qSnippet = q.q.slice(0, 30).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const filename = `${date}_${co}_${type}_${qSnippet}.webm`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(lastBlob);
  a.download = filename;
  a.click();
  toast('Recording saved to Downloads');
}

function ratePracticeQ(id, grade) {
  dbUpdateQuestion(id, sm2Update(dbGetQuestion(id), grade));
  nextPracticeQ();
}

function nextPracticeQ() {
  practiceIdx++;
  renderPracticeQuestion();
}

// ── SESSION SUMMARY ───────────────────────────────────
function renderPracticeSummary() {
  const totalTime = Math.round((Date.now() - practiceSessionStart) / 60000);
  const hintsUsed = practiceResults.filter(r => r.hintUsed).length;
  const avgScore = practiceResults.length
    ? (practiceResults.reduce((s, r) => s + (r.feedback?.content_score || 0), 0) / practiceResults.length).toFixed(1)
    : 0;

  // Save session
  dbAddSession({
    duration: totalTime,
    count: practiceResults.length,
    avgScore: parseFloat(avgScore),
    hintsUsed,
    results: practiceResults.map(r => ({ qId: r.qId, score: r.feedback?.content_score || 0, hintUsed: r.hintUsed }))
  });

  document.getElementById('practice-area').innerHTML = `
    <div class="session-summary">
      <div style="font-size:16px;font-weight:600;margin-bottom:20px;text-align:center">Session complete ✓</div>
      <div class="summary-stats">
        <div class="summary-stat"><div class="summary-n">${practiceResults.length}</div><div class="summary-l">Questions</div></div>
        <div class="summary-stat"><div class="summary-n">${totalTime}m</div><div class="summary-l">Time spent</div></div>
        <div class="summary-stat"><div class="summary-n">${avgScore}</div><div class="summary-l">Avg score</div></div>
      </div>
      ${hintsUsed > 0 ? `<div style="font-size:13px;color:var(--amber);margin-bottom:16px;text-align:center">Used text hint ${hintsUsed} time${hintsUsed > 1 ? 's' : ''} — practice listening more</div>` : ''}
      <div style="display:flex;gap:8px;justify-content:center">
        <button class="btn btn-accent" onclick="renderPracticeSetup()">New session</button>
        <button class="btn btn-ghost" onclick="showPage('bank')">Review questions</button>
      </div>
    </div>`;
}
