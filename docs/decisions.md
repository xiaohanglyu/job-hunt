# Design Decisions & Notes

A living document recording the thinking behind job-hunt's design choices.
Update this as the project evolves.

## Mindmap

```
job-hunt
├── Done
│   ├── Pipeline board
│   │   ├── Kanban · 6 stages
│   │   ├── JD autofill via AI
│   │   ├── Interview rounds + interviewer feedback
│   │   └── Interviewers + LinkedIn
│   ├── Q&A bank
│   │   ├── real / mock label
│   │   ├── Transcript → questions (Groq)
│   │   ├── Markdown file import
│   │   └── Manual entry
│   ├── Quiz · spaced repetition
│   │   ├── SM-2 algorithm
│   │   └── Filter by company / type / source
│   └── Export / Import JSON
│
├── In progress
│   └── Practice mode
│       ├── Azure TTS playback
│       ├── Show text hint (tracked)
│       ├── Voice recording
│       ├── Groq Whisper transcription
│       ├── AI feedback · content + English
│       ├── Optional recording save
│       └── Session summary
│
└── Planned
    ├── Dashboard
    │   ├── GitHub-style heatmap
    │   ├── Weak area analytics
    │   └── Session history
    ├── Audio clip from recording
    ├── Anki export · .apkg
    ├── Excel import
    ├── React migration
    └── Docker + PostgreSQL
```

### How to generate the mindmap
```bash
npm install -g markmap-cli
markmap doc/mindmap.md --no-open -o assets/mindmap.svg
```

## Architecture decisions

### Why a single HTML file (MVP)?
Lowest possible friction. No build step, no install, no account. Double-click (via `start.command`) and it works. The goal was to solve the "Excel gets abandoned at 30 applications" problem first.

### Why localStorage?
Enough for one person's job search (300–500 applications + hundreds of questions fits well within 5MB). Always export JSON as backup. Migrating to PostgreSQL later is straightforward — the data model stays the same.

### Why localhost instead of file://?
Browser blocks microphone access on `file://` protocol. `localhost` is treated as a secure context, so MediaRecorder API works. `start.command` handles this automatically.

### Why modular JS files instead of one big script?
Single `index.html` became hard to maintain as features grew. Split into:
- `db.js` — all localStorage read/write, single source of truth
- `utils.js` — shared helpers, Groq API, Azure TTS
- `board.js` — pipeline board, app/round/interviewer CRUD
- `bank.js` — Q&A bank, import logic
- `quiz.js` — spaced repetition quiz
- `practice.js` — practice mode, recording, AI feedback

### Why not React now?
Currently in active job search with limited time and a young child at home. Vanilla JS gets the job done. React migration planned for after landing a job, when the feature set has stabilised.

### Planned evolution
```
Now                  →    Phase 2           →    Phase 3
Vanilla JS                Vue 3 / React          React + Vite
Single HTML file          Modular components     + Spring Boot
localStorage              IndexedDB              + PostgreSQL
localhost                 localhost              Docker Compose
```

## Feature decisions

### real vs mock question label
- **real** — linked to a specific application + round. Represents actual gaps found in real interviews. Higher weight in analytics.
- **mock** — standalone practice material. Not linked to any application.
- Same add/edit form, just one extra dropdown. Keeps things simple.

### SM-2 spaced repetition (not Anki export)
Built SM-2 directly into the quiz so the whole loop stays in one tool. Questions due for review surface automatically. Rating Weak/Ok/Strong updates the next review interval. Anki export is on the roadmap for people who prefer Anki's interface.

### Practice mode: hide question text by default
Real interviews are audio-first. You hear the question before you see anything. Hiding the text by default trains listening comprehension. "Show text" button is always available but hint usage is tracked — shows up in session summary so you can see if listening is getting easier over time.

### Practice mode: optional recording save
Recording is sent to Groq Whisper for transcription + AI feedback. After feedback appears, you choose whether to save the audio file locally. Filename format: `YYYY-MM-DD_company_type_question-snippet.webm`. No recordings are stored automatically — your choice every time.

### Interview round names: datalist not dropdown
`<datalist>` gives you suggestions (HR screen, Recruiter screen, Hiring manager screen, Technical round 1, Technical round 2, System design, Onsite, Final round) while still allowing free-form input. Companies use different names — forcing a fixed dropdown would create friction.

### Round types clarified
- **Recruiter / HR screen** — non-technical initial call, internal HR or external recruiter
- **Hiring manager screen** — technical manager does a 30-min call before the full loop
- **Technical round** — coding or system design with engineers
- **Onsite** — full interview loop, usually multiple rounds in one day

### Interviewer feedback as a separate field
Round detail has two text fields:
- **Your notes** — your own observations during/after the interview
- **Interviewer feedback** — what the interviewer or recruiter told you

Keeping them separate makes it easy to filter "what did interviewers actually say about me" across multiple companies.

## Keys & security

### config.js pattern
- `config.example.js` committed to repo (template with empty values)
- `config.js` in `.gitignore` (your actual keys, never committed)
- `index.html` loads `config.js` via `<script src="config.js">` — fails silently if file doesn't exist, app still works without keys (manual mode)

### Pre-commit hook
`.git/hooks/pre-commit` blocks any commit that includes `config.js`:
```bash
#!/bin/bash
if git diff --cached --name-only | grep -q "config.js"; then
  echo "ERROR: config.js contains API keys — remove it from staging"
  exit 1
fi
```

### Azure TTS voices
- `en-CA-LiamNeural` — Canadian English male (default)
- `en-CA-ClaraNeural` — Canadian English female
- Preview all voices at speech.microsoft.com/portal → Voice Gallery

### If a key leaks
Immediately revoke it in the provider's console (Groq: console.groq.com, Azure: portal.azure.com) and generate a new one. Deleting from git history is not enough — the key is compromised the moment it's pushed.

## UX decisions

### Default values in forms
- **Location** defaults to `Vancouver, BC` (hardcoded in `openAddApp`)
- **Position** remembers last entered value via localStorage key `last_role`

### Why no dashboard yet
Dashboard needs real data to be useful. Building it before you have 20+ applications and 50+ questions would mean guessing what to show. Use the tool first, then design the dashboard around actual patterns.

### Why not Notion?
Notion solves pipeline tracking and notes well. It doesn't solve spaced repetition quiz, practice mode with voice recording, or the transcript-to-questions pipeline. Those require custom tooling.

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Vanilla JS | No build step |
| Storage | localStorage | 5MB limit, export JSON regularly |
| LLM | Groq llama-3.3-70b | Free tier, fast |
| Transcription | Groq Whisper | Same key as LLM |
| TTS | Azure Cognitive Services | Free 500k chars/month |
| Future frontend | React + Vite | After feature set stabilises |
| Future backend | Spring Boot + PostgreSQL | Multi-device sync |
