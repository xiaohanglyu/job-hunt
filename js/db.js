// ── DATA LAYER ────────────────────────────────────────
const STORE = 'jh3';
let db = JSON.parse(localStorage.getItem(STORE) || '{"apps":[],"questions":[],"sessions":[]}');

function dbSave() { localStorage.setItem(STORE, JSON.stringify(db)); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// Apps
function dbGetApps() { return db.apps; }
function dbGetApp(id) { return db.apps.find(a => a.id === id); }
function dbAddApp(data) { const app = { id: uid(), rounds: [], interviewers: [], ...data }; db.apps.push(app); dbSave(); return app; }
function dbUpdateApp(id, data) { Object.assign(dbGetApp(id), data); dbSave(); }
function dbDeleteApp(id) { db.apps = db.apps.filter(a => a.id !== id); db.questions = db.questions.filter(q => q.appId !== id); dbSave(); }

// Questions
function dbGetQuestions(filter = {}) {
  return db.questions.filter(q => {
    if (filter.appId && q.appId !== filter.appId) return false;
    if (filter.type && q.type !== filter.type) return false;
    if (filter.source && q.source !== filter.source) return false;
    if (filter.score !== undefined && (q.score || 0) !== filter.score) return false;
    if (filter.search) {
      const s = filter.search.toLowerCase();
      if (!q.q.toLowerCase().includes(s) && !(q.a || '').toLowerCase().includes(s)) return false;
    }
    return true;
  });
}
function dbGetQuestion(id) { return db.questions.find(x => x.id === id); }
function dbAddQuestion(data) { const q = { id: uid(), created: Date.now(), source: 'real', score: 0, ...data }; db.questions.push(q); dbSave(); return q; }
function dbUpdateQuestion(id, data) { Object.assign(dbGetQuestion(id), data); dbSave(); }
function dbDeleteQuestion(id) { db.questions = db.questions.filter(x => x.id !== id); dbSave(); }

// SM-2
function sm2Update(q, grade) {
  const g = grade === 1 ? 1 : grade === 2 ? 3 : 5;
  let ef = q.ef || 2.5;
  let interval = q.interval || 1;
  let reps = q.reps || 0;
  if (g < 3) { reps = 0; interval = 1; }
  else {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(interval * ef);
    reps++;
  }
  ef = Math.max(1.3, ef + 0.1 - (5 - g) * (0.08 + (5 - g) * 0.02));
  return { ef, interval, reps, nextReview: Date.now() + interval * 86400000, score: grade };
}
function isDue(q) { return !q.nextReview || q.nextReview <= Date.now(); }

// Sessions
function dbAddSession(data) { const s = { id: uid(), date: Date.now(), ...data }; db.sessions.push(s); dbSave(); return s; }
function dbGetSessions() { return db.sessions || []; }

// Export / Import
function dbExport() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `job-hunt-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
}
function dbImport(data) {
  if (!data.apps || !data.questions) throw new Error('Invalid format');
  db = { sessions: [], ...data };
  dbSave();
}
