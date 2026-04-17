# job-hunt

A local-first tool for engineers actively interviewing. 

Two core problems solved: keeping track of applications without losing motivation, and turning real interview questions into a systematic study loop.

[View mindmap](assets/mindmap.html)

## Why

Job searches get messy fast. Applications scatter across spreadsheets that become too painful to update. Interview questions get buried in notes with no way to revisit them. There's no tool that connects your pipeline to your interview history and turns it into a practice system.

This tool does three things:

- **Pipeline board** — low-friction Kanban so you always know where each application stands
- **Q&A bank** — every question you've been asked, organised and searchable
- **Practice mode** — speak your answers aloud, get AI feedback on content and English expression


## Features

### Done

**Pipeline board**
Kanban view across six stages: Applied → Phone Screen → Technical → Onsite → Offer → Rejected. Fields: Company, Position, Location, Work Model, Salary Range, Job Link, Applied Date, Resume Version, Resume Link (Google Drive). Paste a JD and AI autofills the form. Each application has its own detail page with interview rounds (including interviewer feedback), interviewers with LinkedIn URLs, and linked questions.

**Q&A bank**
Every interview question in one place. Three ways to add:
- **Transcript import** — paste a dialogue, Groq AI extracts and classifies questions automatically
- **Markdown import** — load any `.md` file, AI understands the structure regardless of format
- **Manual entry** — single question form

Each question stores: question text, your answer notes, type (behavioral / system design / coding / other), source (real / mock), linked application, self-score (1–3), round name, and a notes field for improvement reminders. Real questions link back to the specific application and round they came from. Mock questions are standalone practice material.

**Quiz · spaced repetition**
SM-2 algorithm (same as Anki). Questions due for review surface first. Weak questions appear more frequently. Filter by company, type, or source. Rate each answer Weak / Ok / Strong to update the next review interval automatically.

**Export / Import JSON**
Back up your data any time. Restore on any device.

### In progress

**Practice mode**
Speak your answers aloud in a realistic session:

1. Question plays via Azure TTS (Canadian English voice)
2. If you don't understand, tap **Show text** — hint usage is tracked
3. Record your answer
4. Groq Whisper transcribes your speech
5. AI gives immediate feedback on content quality and English expression
6. Optionally save the recording locally
7. Rate yourself → SM-2 updates

Session summary shows questions practiced, time spent, average score, and how many text hints were used.


### Planned

| Feature | Notes |
|---|---|
| Dashboard + heatmap | GitHub-style activity heatmap, weak area analytics, session history |
| Audio clip from recording | Mark a timestamp in an interview recording to replay a specific question |
| Anki export | Export selected questions as `.apkg` for use in Anki |
| Excel import | Import existing application spreadsheet |
| React migration | Refactor to React + Vite when feature set stabilises |
| Docker + PostgreSQL | Multi-device sync, persistent storage |


## Setup

No build step. Single HTML file served locally.

**1. Clone**
```bash
git clone https://github.com/yourname/job-hunt.git
cd job-hunt
```

**2. Configure keys**
```bash
cp config.example.js config.js
```

Edit `config.js`:
```js
const CONFIG = {
  groqKey: 'gsk_...',        // free at console.groq.com
  ttsProvider: 'azure',       // 'azure' | 'webspeech'
  azureKey: '...',            // free 500k chars/month
  azureRegion: 'canadacentral',
  azureVoice: 'en-CA-LiamNeural',
};
```

- **Groq** — free at [console.groq.com](https://console.groq.com). Used for JD autofill, transcript extraction, Whisper transcription, and AI feedback.
- **Azure TTS** — free 500k characters/month at [azure.microsoft.com](https://azure.microsoft.com/en-us/products/ai-services/text-to-speech). Used for reading questions aloud in practice mode.
- Without keys: manual entry, quiz study mode, and export/import all work without any API keys.

**3. Start**

Double-click `start.command` (macOS). This starts a local HTTP server and opens the browser.

Or manually:
```bash
python3 -m http.server 8080
open http://localhost:8080
```

> **Why localhost?** The browser requires `https://` or `localhost` to access the microphone for practice mode recordings. Opening `index.html` directly via `file://` will block mic access.


## Generating the mindmap

The mindmap is generated from `mindmap.md` using [Markmap](https://markmap.js.org/).

```bash
npm install -g markmap-cli
markmap mindmap.md --no-open -o mindmap.svg
```

Edit `mindmap.md` to update the map, then regenerate `mindmap.svg` and commit both.


## Project structure

```
job-hunt/
├── index.html              # Entry point and HTML layout
├── config.js               # Your keys (gitignored)
├── config.example.js       # Key template
├── start.command           # macOS one-click launcher
├── mindmap.md              # Mindmap source
├── mindmap.svg             # Generated mindmap (committed)
├── README.md
├── css/
│   └── main.css
└── js/
    ├── db.js               # Data layer · localStorage
    ├── utils.js            # Shared helpers · TTS · Groq API
    ├── board.js            # Pipeline board · app CRUD
    ├── bank.js             # Q&A bank · import
    ├── quiz.js             # Quiz study mode · SM-2
    └── practice.js         # Practice mode · recording · AI feedback
```


## Tech

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Vanilla JS | Zero build step, runs from localhost |
| Storage | localStorage | No server needed for MVP |
| AI / LLM | Groq llama-3.3-70b | Free tier, fast inference |
| Transcription | Groq Whisper | Same key as LLM |
| TTS | Azure Cognitive Services | Free 500k chars/month, natural Canadian English voice |
| Future frontend | React + Vite | When feature set stabilises |
| Future backend | Spring Boot + PostgreSQL | Multi-device sync |


## License
