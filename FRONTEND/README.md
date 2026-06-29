# CIPHERLOCK — Cognitive Password Intelligence

A password strength analyzer and generator that scores **security** the
usual way (entropy, character diversity, pattern detection) and also scores
**cognitive load** — how much mental effort a password takes to recall —
so you can pick a password that's actually hard to crack *and* realistic
to remember.

## Running it

No build step. Open `index.html` in any modern browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

Works fully offline using the local engines below. If a CIPHERLOCK backend
is running and reachable (see "Backend integration" below), it's used
automatically for more accurate analysis plus breach-checking and PDF
reports — but no password ever leaves your machine if the backend isn't
running.

## Architecture

```
index.html              Semantic layout: header / main (3 panels) / footer
css/styles.css           Dark cybersecurity theme, glassmorphism, SVG/gauge styling
js/wordlists.js          Word banks + pattern data (sequences, keyboard rows, known-weak list)
js/entropyEngine.js      EntropyEngine — pool size, entropy bits, crack-time math
js/cognitiveLoad.js      CognitiveLoadCalculator — pronounceability, chunking, memorability
js/passwordAnalyzer.js   PasswordAnalyzer — pattern detection + scoring + insights
js/passwordGenerator.js  PasswordGenerator — 4 generation strategies (crypto-secure RNG)
js/apiClient.js          ApiClient — thin fetch wrapper around the CIPHERLOCK backend
js/backendAdapter.js     Maps backend /api/analyze + /api/generate responses onto the
                         exact shape PasswordAnalyzer.analyze() produces locally
js/uiController.js       UIController — DOM wiring, SVG rendering, history, theme, particles
```

## Backend integration

This frontend talks to the [CIPHERLOCK backend](../cipherlock-backend) when
it's reachable, and **transparently falls back to the local engines above**
when it isn't. You never have to choose — every analyze/generate call tries
the backend first and falls back on any network error, timeout, or non-2xx
response.

- **Configure the backend URL** in `index.html`:
  ```html
  <script>
    window.CIPHERLOCK_API_BASE_URL = "http://localhost:5000";
  </script>
  ```
  Change this if your backend runs on a different host or port.

- **Backend status pill** (top-right) shows "Backend connected" or "Local
  analysis only" — it updates live based on the outcome of the most recent
  API call, not just a one-time check on page load.

- **Backend-only features** — these have no local equivalent and simply
  show an explanatory message if the backend is unreachable:
  - **Check known data breaches** (left panel) — k-anonymity lookup against
    the Have I Been Pwned API
  - **Download PDF report** (right panel) — generates a formatted PDF via
    the backend's PDFKit-based report endpoint

- **What stays local-only on purpose**: the two-password comparison tool
  runs entirely client-side for instant feedback — there's no reason to
  round-trip to the network for that.

### Running both together (VS Code + Live Server)

1. Start the backend: `cd ../cipherlock-backend && npm run dev` (listens on
   `:5000` by default)
2. In the backend's `.env`, make sure `CORS_ORIGINS` includes your
   frontend's origin — Live Server defaults to `http://127.0.0.1:5500`
3. Open this folder in VS Code, right-click `index.html` → "Open with Live
   Server"
4. Type a password — the backend status pill should flip to "Backend
   connected" within a second or two

Each engine is a standalone ES6 class with no DOM dependencies except
`UIController`, which is the only file that touches `document`.

## Notable design decisions

- **Security and memorability are scored independently**, then combined into
  an overall rating — a password can be "Strong but hard to remember" or
  "Excellent recall but weak," and the UI says so explicitly via the
  insight box rather than collapsing both into one number.
- **Crack-time estimates use two attacker models** (a rate-limited login
  form vs. an offline GPU attack against a fast, unsalted hash) because a
  single "time to crack" number is misleading — the real answer depends on
  where the password is being attacked.
- **All randomness for generation uses `crypto.getRandomValues`**, never
  `Math.random()`, since this is the one place where weak randomness would
  actually matter.
- **No frameworks, no build tooling.** Per the brief, this is intentionally
  vanilla HTML/CSS/JS so the whole thing can be read top to bottom.

## Known limitations

- Pattern and dictionary detection use small, illustrative word lists —
  not a real breach-corpus or full dictionary — so treat the "no common
  patterns" / "meaningful word" checks as directional, not exhaustive.
- Crack-time math is an average-case estimate (`keyspace / 2 / rate`), a
  standard simplification, not a guarantee.
