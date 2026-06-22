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

Everything runs client-side. No password you type is ever sent anywhere.

## Architecture

```
index.html              Semantic layout: header / main (3 panels) / footer
css/styles.css           Dark cybersecurity theme, glassmorphism, SVG/gauge styling
js/wordlists.js          Word banks + pattern data (sequences, keyboard rows, known-weak list)
js/entropyEngine.js      EntropyEngine — pool size, entropy bits, crack-time math
js/cognitiveLoad.js      CognitiveLoadCalculator — pronounceability, chunking, memorability
js/passwordAnalyzer.js   PasswordAnalyzer — pattern detection + scoring + insights
js/passwordGenerator.js  PasswordGenerator — 4 generation strategies (crypto-secure RNG)
js/uiController.js       UIController — DOM wiring, SVG rendering, history, theme, particles
```

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
