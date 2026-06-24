/**
 * entropyService.js
 * Combines pool-based entropy, the zxcvbn library's pattern-aware
 * estimate, and crack-time math under two attacker models.
 */

const zxcvbn = require("zxcvbn");
const entropyCalculator = require("../utils/entropyCalculator");
const crackTimeCalculator = require("../utils/crackTimeCalculator");
const scoringEngine = require("../utils/scoringEngine");

/**
 * @param {string} password
 * @param {number} penaltyMultiplier - 0..1, from cognitiveLoadService's
 *   pattern detection. Raw pool-based entropy is multiplied by this to
 *   get "effective" entropy that reflects detected weaknesses.
 */
function analyzeEntropy(password, penaltyMultiplier = 1) {
  const rawBits = entropyCalculator.rawEntropyBits(password);
  const shannonBits = entropyCalculator.shannonEntropyBits(password);
  const effectiveBits = entropyCalculator.applyPenalty(rawBits, penaltyMultiplier);

  const zxcvbnResult = zxcvbn(password || "");
  const crackTimes = crackTimeCalculator.crackTimes(effectiveBits);
  const resistance = scoringEngine.resistanceScore(effectiveBits);

  return {
    poolSize: entropyCalculator.poolSize(password),
    rawBits,
    shannonBits,
    effectiveBits,
    zxcvbnScore: zxcvbnResult.score, // 0-4, zxcvbn's own estimate
    zxcvbnCrackTimeDisplay: zxcvbnResult.crack_times_display
      ? zxcvbnResult.crack_times_display.offline_slow_hashing_1e4_per_second
      : undefined,
    crackTimes,
    resistance,
    resistanceLabel: scoringEngine.resistanceLabel(resistance)
  };
}

module.exports = { analyzeEntropy };
