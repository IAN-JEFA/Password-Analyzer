/**
 * app.js
 * Express application setup: security middleware, parsers, routes,
 * health check, and centralized error handling. Exported (not
 * listened-on) so it can be imported directly by tests.
 */

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const path = require("path");

const logger = require("./config/logger");
const { generalLimiter } = require("./middleware/rateLimiter");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const analysisRoutes = require("./routes/analysisRoutes");
const generatorRoutes = require("./routes/generatorRoutes");
const breachRoutes = require("./routes/breachRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();

// ---------------- Security middleware ----------------
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin/non-browser requests (no Origin header) and any
      // explicitly whitelisted origin. Reject everything else.
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} is not allowed by CORS policy.`));
    },
    credentials: true
  })
);

app.use(generalLimiter);

// ---------------- Body parsing ----------------
app.use(express.json({ limit: "32kb" })); // generous for a password + options payload, tight enough to deter abuse
app.use(express.urlencoded({ extended: true, limit: "32kb" }));

// ---------------- Request logging ----------------
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// ---------------- Health check ----------------
app.get("/health", (req, res) => {
  res.status(200).json({ success: true, status: "ok", timestamp: new Date().toISOString() });
});

// ---------------- API docs (static OpenAPI spec + zero-dependency Swagger UI) ----------------
app.get("/api-docs/openapi.yaml", (req, res) => {
  res.type("text/yaml").sendFile(path.join(__dirname, "..", "docs", "openapi.yaml"));
});
app.get("/api-docs", (req, res) => {
  res.type("html").send(swaggerUiHtml());
});

// ---------------- API routes ----------------
app.use("/api/analyze", analysisRoutes);
app.use("/api/generate", generatorRoutes);
app.use("/api/breach-check", breachRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/report", reportRoutes);

// ---------------- 404 + centralized error handling ----------------
app.use(notFoundHandler);
app.use(errorHandler);

function swaggerUiHtml() {
  return `<!DOCTYPE html>
<html>
<head>
  <title>CIPHERLOCK API Docs</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api-docs/openapi.yaml',
        dom_id: '#swagger-ui'
      });
    };
  </script>
</body>
</html>`;
}

module.exports = app;
