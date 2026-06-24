/**
 * memorabilityService.js
 * Turns the raw cognitive signals (pronounceability, chunking,
 * meaningful-word coverage, length) into the single human-facing
 * memorability score and category.
 */

function lengthFactor(password) {
  return password.length <= 22
    ? 100 - Math.abs(password.length - 14) * 4
    : Math.max(10, 100 - (password.length - 14) * 6);
}

function memorabilityScore(password, pronounceability, chunking, meaningfulWord) {
  const score =
    pronounceability * 0.32 +
    chunking * 0.26 +
    meaningfulWord * 0.22 +
    Math.max(0, lengthFactor(password)) * 0.2;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function memorabilityCategory(score) {
  if (score < 30) return "Poor";
  if (score < 55) return "Fair";
  if (score < 75) return "Good";
  return "Excellent";
}

module.exports = {
  lengthFactor,
  memorabilityScore,
  memorabilityCategory
};
