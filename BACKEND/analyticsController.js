/**
 * analyticsController.js
 * Maintains a single running-aggregate Analytics document and exposes
 * it via GET /api/analytics. Anonymous, metrics-only — no passwords,
 * no IPs, no identifiers are ever stored here.
 */

const asyncHandler = require("../utils/asyncHandler");
const Analytics = require("../models/Analytics");

const SINGLETON_ID = "global";

/** Called by analysisController/generatorController after each request. */
async function recordAnalysis(result, source, strategy = null) {
  const inc = {
    totalEntropy: result.entropy.effectiveBits,
    totalStrength: result.strengthScore,
    analysisCount: 1,
    [`cognitiveLoadCounts.${result.cognitive.loadCategory}`]: 1
  };

  if (source === "generate" && strategy) {
    inc.generatedPasswords = 1;
    inc[`strategyCounts.${strategy}`] = 1;
  }

  await Analytics.findByIdAndUpdate(
    SINGLETON_ID,
    { $inc: inc, $set: { updatedAt: new Date() } },
    { upsert: true, new: true }
  );
}

/** Called by breachController after each /api/breach-check call. */
async function recordBreachCheck(breached) {
  await Analytics.findByIdAndUpdate(
    SINGLETON_ID,
    {
      $inc: { breachChecks: 1, breachesFound: breached ? 1 : 0 },
      $set: { updatedAt: new Date() }
    },
    { upsert: true, new: true }
  );
}

const getAnalytics = asyncHandler(async (req, res) => {
  const doc = await Analytics.findById(SINGLETON_ID).lean();

  if (!doc || doc.analysisCount === 0) {
    return res.status(200).json({
      success: true,
      data: {
        averageStrength: 0,
        averageEntropy: 0,
        mostUsedStrategy: null,
        breachRate: "0%",
        totals: {
          analysisCount: 0,
          generatedPasswords: 0,
          breachChecks: 0,
          breachesFound: 0
        }
      }
    });
  }

  const averageStrength = Math.round(doc.totalStrength / doc.analysisCount);
  const averageEntropy = Math.round((doc.totalEntropy / doc.analysisCount) * 10) / 10;

  const strategyEntries = Object.entries(doc.strategyCounts || {});
  const mostUsedStrategy = strategyEntries.length
    ? strategyEntries.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
    : null;

  const breachRate = doc.breachChecks > 0
    ? `${Math.round((doc.breachesFound / doc.breachChecks) * 1000) / 10}%`
    : "0%";

  res.status(200).json({
    success: true,
    data: {
      averageStrength,
      averageEntropy,
      mostUsedStrategy,
      breachRate,
      cognitiveLoadBreakdown: doc.cognitiveLoadCounts,
      strategyBreakdown: doc.strategyCounts,
      totals: {
        analysisCount: doc.analysisCount,
        generatedPasswords: doc.generatedPasswords,
        breachChecks: doc.breachChecks,
        breachesFound: doc.breachesFound
      },
      updatedAt: doc.updatedAt
    }
  });
});

module.exports = { getAnalytics, recordAnalysis, recordBreachCheck };
