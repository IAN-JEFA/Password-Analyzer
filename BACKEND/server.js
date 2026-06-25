/**
 * server.js
 * Process entry point. Loads environment variables, connects to
 * MongoDB, then starts the HTTP server. Handles graceful shutdown and
 * uncaught error logging so the process never dies silently.
 */

require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const logger = require("./config/logger");

const PORT = process.env.PORT || 5000;

let server;

async function start() {
  await connectDB();

  server = app.listen(PORT, () => {
    logger.info(`CIPHERLOCK backend listening on port ${PORT} (${process.env.NODE_ENV || "development"})`);
  });
}

start().catch((err) => {
  logger.error(`Fatal startup error: ${err.message}`);
  process.exit(1);
});

function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully.`);
  if (server) {
    server.close(() => {
      logger.info("HTTP server closed.");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  logger.error(`Unhandled promise rejection: ${reason instanceof Error ? reason.stack : reason}`);
});
process.on("uncaughtException", (err) => {
  logger.error(`Uncaught exception: ${err.stack}`);
  process.exit(1);
});
