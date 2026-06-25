/**
 * breachService.js
 * Checks a password against the Have I Been Pwned Pwned Passwords API
 * using the k-anonymity model: only the first 5 characters of the
 * SHA-1 hash ever leave this process. The plaintext password and the
 * full hash are never transmitted or logged.
 */

const crypto = require("crypto");
const axios = require("axios");
const AppError = require("../utils/AppError");
const logger = require("../config/logger");

const BASE_URL = process.env.HIBP_API_BASE_URL || "https://api.pwnedpasswords.com/range";
const TIMEOUT_MS = parseInt(process.env.HIBP_REQUEST_TIMEOUT_MS, 10) || 5000;

function sha1Hex(value) {
  return crypto.createHash("sha1").update(value, "utf8").digest("hex").toUpperCase();
}

function recommendationFor(timesSeen) {
  if (timesSeen === 0) return "No known breaches found. No action needed.";
  if (timesSeen < 100) return "Seen in at least one known breach — change it where it's reused.";
  if (timesSeen < 10000) return "Widely known to attackers — change this password now.";
  return "Change immediately — this password is breached at massive scale and will be tried first in any attack.";
}

/**
 * @param {string} password
 * @returns {Promise<{breached: boolean, timesSeen: number, recommendation: string}>}
 */
async function checkBreach(password) {
  if (!password || typeof password !== "string") {
    throw new AppError("A password string is required to check for breaches.", 400);
  }

  const hash = sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  let body;
  try {
    const response = await axios.get(`${BASE_URL}/${prefix}`, {
      timeout: TIMEOUT_MS,
      headers: { "Add-Padding": "true" }
    });
    body = response.data;
  } catch (err) {
    logger.error(`HIBP lookup failed: ${err.message}`);
    throw new AppError("Breach lookup service is currently unavailable. Try again shortly.", 503);
  }

  const lines = String(body).split("\n");
  let timesSeen = 0;
  for (const line of lines) {
    const [lineSuffix, countStr] = line.trim().split(":");
    if (lineSuffix && lineSuffix.toUpperCase() === suffix) {
      timesSeen = parseInt(countStr, 10) || 0;
      break;
    }
  }

  return {
    breached: timesSeen > 0,
    timesSeen,
    recommendation: recommendationFor(timesSeen)
  };
}

module.exports = { checkBreach, sha1Hex };
