/**
 * analysisController.js
 * POST /api/analyze
 * Orchestrates entropyService + cognitiveLoadService +
 * memorabilityService + recommendationService into the final
 * strength verdict, then persists anonymized metrics for analytics.
 */

const asyncHandler = require("../utils/asyncHandler");
const scoringEngine = require("../utils/scoringEngine");
const entropyService = require("../services/entropyService");
const cognitiveLoadService = require("../services/cognitiveLoadService");
const memorabilityService = require("../services/memorabilityService");
const recommendationService = require("../services/recommendationService");
const Analysis = require("../models/Analysis");
const { recordAnalysis } = require("./analyticsController");
const logger = require("../config/logger");

function runFullAnalysis(password) {
  const cognitive = cognitiveLoadService.analyzeCognitiveLoad(password);
  const entropy = entropyService.analyzeEntropy(password, cognitive.penaltyMultiplier);
  const comp = scoringEngine.composition(password);
  const strengthScore = scoringEngine.strengthScore(entropy.effectiveBits, comp);

  const memScore = memorabilityService.memorabilityScore(
    password,
    cognitive.pronounceability,
    cognitive.chunking,
    cognitive.meaningfulWord
  );
  const memorabilityCategory = memorabilityService.memorabilityCategory(memScore);
  const rating = scoringEngine.overallRating(strengthScore, memScore);

  const detectedPatternNames = Object.entries(cognitive.patterns)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const feedback = recommendationService.buildRecommendations({
    patterns: cognitive.patterns,
    comp,
    entropy,
    cognitive,
    memorability: { score: memScore, category: memorabilityCategory },
    strengthScore
  });

  return {
    strengthScore,
    rating,
    entropy,
    comp,
    cognitive,
    memorability: { score: memScore, category: memorabilityCategory },
    detectedPatternNames,
    feedback
  };
}

const analyze = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const result = runFullAnalysis(password);

  res.status(200).json({
    success: true,
    data: {
      strengthScore: result.strengthScore,
      entropy: result.entropy.effectiveBits,
      crackTime: result.entropy.crackTimes.offline,
      crackTimeOnline: result.entropy.crackTimes.online,
      cognitiveLoad: result.cognitive.loadCategory,
      memorability: result.memorability.category,
      rating: result.rating,
      feedback: result.feedback,
      details: {
        rawEntropyBits: result.entropy.rawBits,
        shannonEntropyBits: result.entropy.shannonBits,
        zxcvbnScore: result.entropy.zxcvbnScore,
        attackResistance: result.entropy.resistance,
        attackResistanceLabel: result.entropy.resistanceLabel,
        composition: result.comp,
        pronounceability: result.cognitive.pronounceability,
        chunking: result.cognitive.chunking,
        meaningfulWordCoverage: result.cognitive.meaningfulWord,
        cognitiveComplexity: result.cognitive.complexity,
        memorabilityScore: result.memorability.score,
        detectedPatterns: result.detectedPatternNames
      }
    }
  });

  // Persist anonymized metrics — never blocks the response, never throws past this point.
  persistAnalysis(result, "analyze").catch((err) =>
    logger.error(`Failed to persist analysis record: ${err.message}`)
  );
});

async function persistAnalysis(result, source, strategy = null) {
  try {
    await Analysis.create({
      entropy: result.entropy.effectiveBits,
      strength: result.strengthScore,
      cognitiveLoad: result.cognitive.loadCategory,
      memorability: result.memorability.category,
      rating: result.rating,
      crackTimeOffline: result.entropy.crackTimes.offline,
      crackTimeOnline: result.entropy.crackTimes.online,
      patternsDetected: result.detectedPatternNames,
      source,
      strategy
    });
    await recordAnalysis(result, source, strategy);
  } catch (err) {
    // Swallow DB errors here — analytics persistence must never break the
    // primary analyze/generate response, which works fully without a DB.
    logger.error(`persistAnalysis failed: ${err.message}`);
  }
}

module.exports = { analyze, runFullAnalysis, persistAnalysis };
