/**
 * breachController.js
 * POST /api/breach-check
 * Checks a password against known breaches via k-anonymity (see
 * breachService) without ever transmitting the plaintext password or
 * its full hash.
 */

const asyncHandler = require("../utils/asyncHandler");
const breachService = require("../services/breachService");
const { recordBreachCheck } = require("./analyticsController");
const logger = require("../config/logger");

const checkBreach = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const result = await breachService.checkBreach(password);

  res.status(200).json({
    success: true,
    data: result
  });

  logger.info(`Breach check completed (breached=${result.breached})`);
  recordBreachCheck(result.breached).catch((err) =>
    logger.error(`Failed to record breach-check analytics: ${err.message}`)
  );
});

module.exports = { checkBreach };
