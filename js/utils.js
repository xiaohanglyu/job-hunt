// ── UTILS ─────────────────────────────────────────────
function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function toast(msg, type = 'default') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show';
  if (type === 'error') t.style.borderColor = 'rgba(244,124,106,.3)';
  else t.style.borderColor = '';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2400);
}

function openModal(id) { document.getElementById(id).classList.add('on'); }
function closeModal(id) { document.getElementById(id).classList.remove('on'); }

function populateAppSelect(selId, selected) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  sel.innerHTML = '<option value="">None</option>';
  dbGetApps().forEach(a => sel.add(new Option(a.company + (a.role ? ` · ${a.role}` : ''), a.id)));
  sel.value = selected || '';
}

function updateStats() {
  const due = dbGetQuestions().filter(isDue).length;
  document.getElementById('stats-pill').textContent =
    `${dbGetApps().length} apps · ${dbGetQuestions().length}Q${due ? ` · ${due} due` : ''}`;
}

function typeLabel(type) {
  return type === 'system' ? 'System design' : type || 'other';
}

function typeClass(type) {
  return `tag-${type || 'other'}`;
}

// Groq API
async function callGroq(prompt, systemPrompt = '') {
  const key = (typeof CONFIG !== 'undefined' && CONFIG.groqKey) || sessionStorage.getItem('groq_key') || '';
  if (!key) throw new Error('Groq API key not configured. Check config.js');
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'User-Agent': 'curl/7.88.1' },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 2000, temperature: 0.2, messages })
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `HTTP ${res.status}`); }
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

function parseJSON(text) {
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

async function extractTags(questionText) {
  try {
    const raw = await callGroq(`Extract tags from this interview question: specific technologies AND underlying CS concepts being tested. Lowercase, hyphenated. Return only JSON, no explanation: {"tags": []}
Question: ${questionText}`);
    return parseJSON(raw).tags || [];
  } catch { return []; }
}

// Azure TTS
async function ttsSpeak(text) {
  const provider = (typeof CONFIG !== 'undefined' && CONFIG.ttsProvider) || 'webspeech';
  if (provider === 'azure') {
    await azureTTS(text);
  } else {
    webSpeechTTS(text);
  }
}

async function azureTTS(text) {
  const key = CONFIG.azureKey;
  const region = CONFIG.azureRegion || 'canadacentral';
  const voice = CONFIG.azureVoice || 'en-CA-LiamNeural';
  const ssml = `<speak version='1.0' xml:lang='en-CA'><voice name='${voice}'>${esc(text)}</voice></speak>`;
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3'
    },
    body: ssml
  });
  if (!res.ok) throw new Error(`Azure TTS error: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.onended = resolve;
    audio.onerror = reject;
    audio.play();
  });
}

function webSpeechTTS(text) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-CA';
    utt.rate = 0.95;
    utt.onend = resolve;
    speechSynthesis.speak(utt);
  });
}
