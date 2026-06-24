/**
 * generatorController.js
 * POST /api/generate
 * Generates a password with the requested strategy, then runs it
 * through the same analysis pipeline as /api/analyze so the response
 * includes accurate entropy/memorability — never canned numbers.
 */

const asyncHandler = require("../utils/asyncHandler");
const passwordGeneratorService = require("../services/passwordGeneratorService");
const { runFullAnalysis, persistAnalysis } = require("./analysisController");
const logger = require("../config/logger");

const generate = asyncHandler(async (req, res) => {
  const { strategy = "random", ...rawOpts } = req.body || {};
  const { password, options } = passwordGeneratorService.generate(strategy, rawOpts);

  const result = runFullAnalysis(password);

  res.status(200).json({
    success: true,
    data: {
      password,
      strategy,
      options,
      entropy: result.entropy.effectiveBits,
      strengthScore: result.strengthScore,
      rating: result.rating,
      memorability: result.memorability.category,
      cognitiveLoad: result.cognitive.loadCategory,
      crackTime: result.entropy.crackTimes.offline
    }
  });

  persistAnalysis(result, "generate", strategy).catch((err) =>
    logger.error(`Failed to persist generation record: ${err.message}`)
  );
});

const listStrategies = (req, res) => {
  res.status(200).json({
    success: true,
    data: { strategies: passwordGeneratorService.STRATEGIES }
  });
};

module.exports = { generate, listStrategies };
