# CIPHERLOCK Backend

Production-ready REST API for the Cognitive Load-Based Password Strength
Analysis & Intelligent Password Generator. Powers the CIPHERLOCK frontend
(or any client) with password analysis, generation, breach detection,
recommendations, analytics, and PDF reporting.

## Quick start

```bash
cp .env.example .env        # edit MONGO_URI, CORS_ORIGINS, etc.
npm install
npm run dev                 # nodemon, for local development
# or
npm start                   # plain node, for production
```

Health check: `GET http://localhost:5000/health`
Interactive API docs: `GET http://localhost:5000/api-docs`
Raw OpenAPI spec: `docs/openapi.yaml`
Postman collection: `postman/CipherLock.postman_collection.json`

The API works **without MongoDB** for `/api/analyze`, `/api/generate`,
and `/api/report` — those are pure computation and respond in real
time. Only `/api/analytics` (and history persistence in the background)
needs a live database connection.

## Architecture

```
src/
├── config/
│   ├── db.js              MongoDB connection (non-fatal outside production if unreachable)
│   └── logger.js           Winston logger → logs/combined.log, logs/error.log
├── controllers/
│   ├── analysisController.js     Orchestrates the full /api/analyze pipeline
│   ├── generatorController.js    /api/generate
│   ├── breachController.js       /api/breach-check
│   ├── analyticsController.js    /api/analytics + the running aggregate writer
│   └── reportController.js       /api/report (PDFKit streaming)
├── services/
│   ├── entropyService.js         Pool entropy + zxcvbn + crack-time
│   ├── cognitiveLoadService.js   Pattern detection, pronounceability, chunking
│   ├── memorabilityService.js    Human memorability score/category
│   ├── passwordGeneratorService.js  4 generation strategies (crypto.randomInt)
│   ├── breachService.js          HIBP k-anonymity breach check
│   └── recommendationService.js  Personalized, weakness-driven feedback
├── models/
│   ├── Analysis.js         Metrics-only audit record (never stores passwords)
│   ├── Analytics.js        Singleton running-aggregate document
│   └── Report.js           PDF report audit metadata (not the PDF itself)
├── routes/                 One file per resource, thin — validation + controller
├── middleware/
│   ├── validation.js       Input validation + injection/XSS-shape guards
│   ├── errorHandler.js     Centralized error handling + 404
│   ├── rateLimiter.js      General + breach-check-specific limiters
│   └── auth.js             Optional JWT guard (off by default)
├── utils/
│   ├── entropyCalculator.js
│   ├── crackTimeCalculator.js
│   ├── scoringEngine.js
│   ├── wordlists.js         Shared word banks / pattern data
│   ├── asyncHandler.js
│   └── AppError.js
├── app.js                   Express app (exported for tests)
└── server.js                Entry point: connect DB, then listen
```

## API summary

| Method | Path                       | Description                                  |
|--------|-----------------------------|-----------------------------------------------|
| GET    | `/health`                  | Liveness check                                |
| POST   | `/api/analyze`              | Full security + cognitive-load analysis       |
| POST   | `/api/generate`             | Generate a password (4 strategies)            |
| GET    | `/api/generate/strategies`  | List available strategies                     |
| POST   | `/api/breach-check`         | k-anonymity breach lookup (HIBP)               |
| GET    | `/api/analytics`            | Aggregate anonymous usage stats                |
| POST   | `/api/report`               | Downloadable PDF security report               |

Full request/response schemas: `docs/openapi.yaml`, viewable at `/api-docs`.

### Example — POST /api/analyze

```json
// Request
{ "password": "BlueTiger!42Moon" }

// Response (200)
{
  "success": true,
  "data": {
    "strengthScore": 97,
    "entropy": 105.1,
    "crackTime": "68884.0 billion years",
    "crackTimeOnline": "688840354446663.2 billion years",
    "cognitiveLoad": "Medium",
    "memorability": "Good",
    "rating": "Elite",
    "feedback": ["..."],
    "details": { "...": "extended metrics for power users" }
  }
}
```

## Security

- **Helmet** for standard secure headers (CSP, HSTS, etc.)
- **CORS** restricted to the origins listed in `CORS_ORIGINS`
- **Rate limiting**: 100 requests / 15 minutes per IP by default
  (`express-rate-limit`), with a stricter limiter on `/api/breach-check`
  since each call makes an outbound request
- **Input validation** on every password-accepting route: type checks,
  length caps (256 chars for passwords, 512 for other string fields),
  and a guard against NoSQL-injection-shaped keys (`$where`, dotted
  keys, `__proto__`) and reflected-XSS-shaped values (`<script>`,
  `javascript:`, inline event handlers)
- **No plaintext password ever leaves this process.** Breach checking
  uses SHA-1 + 5-character prefix k-anonymity against the HIBP API —
  only the prefix is transmitted
- **No password is ever persisted**, in any form. `Analysis` and
  `Report` records store only derived metrics (entropy, scores,
  categories) — never the password or even its hash
- **Winston logging** to `logs/combined.log` and `logs/error.log`,
  with request/response logging and centralized error handling that
  never leaks internals to the client
- **Optional JWT guard** on `/api/analytics` — disabled by default
  (`ADMIN_ROUTES_PROTECTED=false`). This API has no login endpoint; it
  verifies tokens minted out-of-band if you choose to protect that
  route in production

### A note on `bcrypt`

The original spec's dependency list included `bcrypt`. This service
never stores user credentials — there's no login, no user model, and
breach-checking explicitly uses SHA-1 + k-anonymity (not bcrypt, which
isn't applicable to one-way breach-list matching). `bcrypt` was
therefore omitted to avoid an unused native-module dependency; if an
admin-credential or user-account feature is added later, reinstate it
for hashing those credentials specifically.

## Testing

```bash
npm test
```

Covers:
- Pure-function unit tests for entropy math, crack-time formatting,
  pattern detection, cognitive-load scoring, and all four generator
  strategies
- Integration tests (via `supertest`) for `/api/analyze`, `/api/generate`,
  validation failures, and 404 handling

`/api/breach-check` (needs live internet access to HIBP) and
`/api/analytics` (needs a live MongoDB connection) are exercised
manually rather than in the automated suite — see `postman/` for ready
-made requests against a fully configured local environment.

## Environment variables

See `.env.example` for the full list with defaults and comments —
covers the server port, MongoDB URI, CORS origins, rate-limit
thresholds, JWT settings, and HIBP request configuration.

## Deployment

No platform-specific code — runs anywhere Node 18+ and (for full
functionality) a MongoDB instance are available: Docker, Render,
Railway, AWS, Azure, DigitalOcean, etc. A minimal `Dockerfile` is not
included by default; the standard pattern is:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 5000
CMD ["node", "src/server.js"]
```

Set `NODE_ENV=production` in deployment — this makes a failed initial
MongoDB connection fatal (fail fast, let the orchestrator restart you)
rather than logged-and-continued as it is in development.
