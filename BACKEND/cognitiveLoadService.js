/**
 * cognitiveLoadService.js
 * Detects weak structural patterns (repetition, sequences, keyboard
 * paths) and estimates how "speakable" and "chunked" a password is —
 * the raw signals that feed the cognitive-complexity score and, via
 * memorabilityService, the memorability score.
 */

const { WORDLISTS, PATTERN_DATA } = require("../utils/wordlists");

const VOWELS = new Set("aeiouAEIOU".split(""));

// ---------------- Pattern detection ----------------

function hasSequentialRun(password, minRun = 3) {
  const lower = password.toLowerCase();
  const { sequencesAsc, sequencesDesc } = PATTERN_DATA;
  for (let i = 0; i <= lower.length - minRun; i++) {
    const slice = lower.slice(i, i + minRun);
    if (sequencesAsc.includes(slice) || sequencesDesc.includes(slice)) return true;
  }
  return false;
}

function hasKeyboardPath(password, minRun = 3) {
  const lower = password.toLowerCase();
  for (const row of PATTERN_DATA.keyboardRows) {
    const reversed = row.split("").reverse().join("");
    for (let i = 0; i <= lower.length - minRun; i++) {
      const slice = lower.slice(i, i + minRun);
      if (row.includes(slice) || reversed.includes(slice)) return true;
    }
  }
  return false;
}

function hasRepeatedChars(password, minRun = 3) {
  return new RegExp(`(.)\\1{${minRun - 1},}`).test(password);
}

function hasRepeatedBlock(password) {
  for (let blockLen = 2; blockLen <= Math.floor(password.length / 2); blockLen++) {
    const block = password.slice(0, blockLen);
    const repeated = block.repeat(Math.ceil(password.length / blockLen)).slice(0, password.length);
    if (repeated === password && password.length / blockLen >= 2.5) return true;
  }
  return false;
}

function isKnownWeak(password) {
  return PATTERN_DATA.knownWeak.includes(password.toLowerCase());
}

function detectPatterns(password) {
  return {
    sequential: hasSequentialRun(password),
    keyboardPath: hasKeyboardPath(password),
    repeatedChars: hasRepeatedChars(password),
    repeatedBlock: hasRepeatedBlock(password),
    knownWeak: isKnownWeak(password)
  };
}

/** 0..1 multiplier applied to raw entropy bits based on detected patterns. */
function patternPenaltyMultiplier(patterns) {
  if (patterns.knownWeak) return 0.05;
  let hits = 0;
  if (patterns.sequential) hits++;
  if (patterns.keyboardPath) hits++;
  if (patterns.repeatedChars) hits++;
  if (patterns.repeatedBlock) hits++;
  return Math.max(0.35, 1 - hits * 0.18);
}

// ---------------- Pronounceability ----------------

function pronounceabilityScore(password) {
  const letters = password.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 2) return 20;

  let goodTransitions = 0;
  const totalTransitions = letters.length - 1;
  let longestConsonantRun = 0;
  let currentRun = 0;

  for (let i = 0; i < letters.length; i++) {
    const isVowel = VOWELS.has(letters[i]);
    if (!isVowel) {
      currentRun++;
      longestConsonantRun = Math.max(longestConsonantRun, currentRun);
    } else {
      currentRun = 0;
    }
    if (i > 0) {
      const prevIsVowel = VOWELS.has(letters[i - 1]);
      if (isVowel !== prevIsVowel) goodTransitions++;
    }
  }

  const alternationRatio = totalTransitions > 0 ? goodTransitions / totalTransitions : 0;
  let score = alternationRatio * 100;

  if (longestConsonantRun >= 4) score -= 25;
  else if (longestConsonantRun === 3) score -= 10;

  const vowelRatio = letters.length
    ? letters.split("").filter((c) => VOWELS.has(c)).length / letters.length
    : 0;
  if (vowelRatio < 0.12 || vowelRatio > 0.7) score -= 15;

  return clamp(Math.round(score), 0, 100);
}

// ---------------- Chunking ----------------

function chunkingEffectiveness(password) {
  const sepRegex = /[-_.*+~ ]/;
  if (!sepRegex.test(password)) {
    const boundaryMatches = password.match(/[a-zA-Z][0-9]|[0-9][a-zA-Z]/g) || [];
    return Math.min(40, boundaryMatches.length * 12);
  }
  const chunks = password.split(/[-_.*+~ ]/).filter(Boolean);
  if (chunks.length < 2) return 30;

  const lengths = chunks.map((c) => c.length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, b) => a + (b - avg) ** 2, 0) / lengths.length;
  const evenness = Math.max(0, 100 - variance * 18);
  const idealChunkBonus = avg >= 3 && avg <= 8 ? 20 : 0;

  return clamp(Math.round(evenness * 0.6 + idealChunkBonus + chunks.length * 6), 0, 100);
}

// ---------------- Meaningful word recognition ----------------

function meaningfulWordMatches(password) {
  const lower = password.toLowerCase();
  const bank = [
    ...WORDLISTS.commonWords,
    ...WORDLISTS.nouns.map((w) => w.toLowerCase()),
    ...WORDLISTS.adjectives.map((w) => w.toLowerCase())
  ];
  const found = new Set();
  bank.forEach((word) => {
    if (word.length >= 4 && lower.includes(word)) found.add(word);
  });
  return Array.from(found);
}

function meaningfulWordScore(password) {
  const matches = meaningfulWordMatches(password);
  if (matches.length === 0) return 0;
  const coverage = matches.reduce((sum, w) => sum + w.length, 0) / Math.max(1, password.length);
  return Math.min(100, Math.round(coverage * 140));
}

// ---------------- Cognitive complexity ----------------

function cognitiveComplexityScore(password, pronounceability, chunking) {
  const randomnessSignal = 100 - (pronounceability * 0.5 + chunking * 0.5);
  const lengthPenalty = Math.min(20, Math.max(0, (password.length - 16) * 1.5));
  return clamp(Math.round(randomnessSignal * 0.85 + lengthPenalty), 0, 100);
}

function cognitiveLoadCategory(complexityScore) {
  if (complexityScore < 35) return "Low";
  if (complexityScore < 65) return "Medium";
  return "High";
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/** Aggregate cognitive-load read-out for a password. */
function analyzeCognitiveLoad(password) {
  const patterns = detectPatterns(password);
  const pronounceability = pronounceabilityScore(password);
  const chunking = chunkingEffectiveness(password);
  const wordMatches = meaningfulWordMatches(password);
  const meaningfulWord = meaningfulWordScore(password);
  const complexity = cognitiveComplexityScore(password, pronounceability, chunking);
  const loadCategory = cognitiveLoadCategory(complexity);
  const penaltyMultiplier = patternPenaltyMultiplier(patterns);

  return {
    patterns,
    pronounceability,
    chunking,
    wordMatches,
    meaningfulWord,
    complexity,
    loadCategory,
    penaltyMultiplier
  };
}

module.exports = {
  detectPatterns,
  patternPenaltyMultiplier,
  pronounceabilityScore,
  chunkingEffectiveness,
  meaningfulWordMatches,
  meaningfulWordScore,
  cognitiveComplexityScore,
  cognitiveLoadCategory,
  analyzeCognitiveLoad
};
