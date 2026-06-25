/**
 * recommendationService.js
 * Turns a completed analysis (entropy + cognitive + composition) into
 * an ordered list of plain-language recommendations, most severe first.
 */

function buildRecommendations({ patterns, comp, entropy, cognitive, memorability, strengthScore }) {
  const recs = [];

  if (patterns.knownWeak) {
    recs.push("This exact password appears on public breach lists — replace it immediately.");
  }
  if (patterns.sequential) {
    recs.push("Avoid sequential runs like \"abc\" or \"123\" — they're checked first in any attack.");
  }
  if (patterns.keyboardPath) {
    recs.push("Avoid keyboard-walk patterns like \"qwerty\" — they're tested early in cracking attempts.");
  }
  if (patterns.repeatedChars || patterns.repeatedBlock) {
    recs.push("Reduce repeated characters or blocks — they lower effective entropy without aiding recall.");
  }
  if (!comp.hasLength) {
    recs.push("Increase length to at least 12 characters — each extra character multiplies crack time.");
  }
  if (comp.diversity < 3) {
    recs.push("Increase symbol/number/case diversity to widen the effective character pool.");
  }
  if (entropy.effectiveBits < 60) {
    recs.push("Use longer passphrases or add an extra word to raise overall entropy.");
  }
  if (strengthScore >= 70 && memorability.score < 40) {
    recs.push("This password is strong but hard to recall — consider a passphrase-style structure instead.");
  }
  if (cognitive.chunking < 40) {
    recs.push("Add a separator (-, _, or .) between word groups to improve chunking and recall.");
  }
  if (memorability.score < 55 && cognitive.wordMatches.length === 0) {
    recs.push("Add one additional recognizable word to make this easier to remember.");
  }

  if (recs.length === 0) {
    recs.push("No major weaknesses detected — this password balances security and memorability well.");
  }

  return recs;
}

module.exports = { buildRecommendations };
