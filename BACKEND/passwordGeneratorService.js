/**
 * passwordGeneratorService.js
 * Four generation strategies — random secure, memorable passphrase,
 * cognitive optimized, high entropy — all backed by Node's
 * crypto.randomInt for cryptographically sound randomness.
 */

const crypto = require("crypto");
const { WORDLISTS } = require("../utils/wordlists");

const CHARSETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  number: "0123456789",
  symbol: "!@#$%^&*?-_=+"
};

function secureChoice(arr) {
  return arr[crypto.randomInt(arr.length)];
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildPool(opts) {
  let pool = "";
  if (opts.lower) pool += CHARSETS.lower;
  if (opts.upper) pool += CHARSETS.upper;
  if (opts.number) pool += CHARSETS.number;
  if (opts.symbol) pool += CHARSETS.symbol;
  return pool || CHARSETS.lower;
}

function normalizeOptions(rawOpts = {}) {
  return {
    length: clampLength(rawOpts.length),
    upper: rawOpts.upper !== false,
    lower: rawOpts.lower !== false,
    number: rawOpts.number !== false,
    symbol: rawOpts.symbol !== false,
    separator: rawOpts.separator !== false
  };
}

function clampLength(length) {
  const n = parseInt(length, 10);
  if (Number.isNaN(n)) return 16;
  return Math.max(8, Math.min(64, n));
}

function randomSecure(opts) {
  const pool = buildPool(opts);
  const required = [];
  if (opts.lower) required.push(secureChoice(CHARSETS.lower.split("")));
  if (opts.upper) required.push(secureChoice(CHARSETS.upper.split("")));
  if (opts.number) required.push(secureChoice(CHARSETS.number.split("")));
  if (opts.symbol) required.push(secureChoice(CHARSETS.symbol.split("")));

  const length = Math.max(opts.length, required.length);
  const chars = [...required];
  while (chars.length < length) {
    chars.push(pool[crypto.randomInt(pool.length)]);
  }
  return shuffle(chars).join("");
}

function memorablePassphrase(opts) {
  const sep = opts.separator ? secureChoice(WORDLISTS.separators) : "";
  const wordCount = opts.length > 22 ? 3 : 2;
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    const bank = i % 2 === 0 ? WORDLISTS.nouns : WORDLISTS.adjectives;
    words.push(secureChoice(bank));
  }

  let result = words.join(sep || "");
  if (opts.number) {
    const num = crypto.randomInt(1, 91);
    result += (sep || "") + num;
  }
  if (opts.symbol) {
    result += secureChoice(CHARSETS.symbol.split(""));
  }
  return result;
}

function cognitiveOptimized(opts) {
  const adjective = secureChoice(WORDLISTS.adjectives);
  const noun1 = secureChoice(WORDLISTS.nouns);
  let noun2 = secureChoice(WORDLISTS.nouns);
  while (noun2 === noun1) noun2 = secureChoice(WORDLISTS.nouns);

  let mid = "";
  if (opts.symbol) mid += secureChoice(CHARSETS.symbol.split(""));
  if (opts.number) mid += crypto.randomInt(1, 91).toString();

  let result = `${adjective}${noun1}${mid}${noun2}`;
  if (result.length > opts.length + 4) {
    result = `${adjective}${mid}${noun1}`;
  }
  return result;
}

function highEntropy(opts) {
  const fullOpts = { ...opts, lower: true, upper: true, number: true, symbol: true };
  const pool = buildPool(fullOpts);
  const chars = [];
  for (let i = 0; i < opts.length; i++) {
    chars.push(pool[crypto.randomInt(pool.length)]);
  }
  if (chars.length > 1) {
    chars[0] = secureChoice(CHARSETS.symbol.split(""));
    chars[1] = secureChoice(CHARSETS.number.split(""));
  }
  return chars.join("");
}

const STRATEGIES = ["random", "passphrase", "cognitive", "entropy"];

function generate(strategy, rawOpts) {
  const opts = normalizeOptions(rawOpts);
  switch (strategy) {
    case "passphrase":
      return { password: memorablePassphrase(opts), options: opts };
    case "cognitive":
      return { password: cognitiveOptimized(opts), options: opts };
    case "entropy":
      return { password: highEntropy(opts), options: opts };
    case "random":
    default:
      return { password: randomSecure(opts), options: opts };
  }
}

module.exports = {
  STRATEGIES,
  generate,
  normalizeOptions
};
