/**
 * reportController.js
 * POST /api/report
 * Streams a PDF security report back to the client using PDFKit.
 * Accepts either a raw password (analyzed on the fly) or a
 * precomputed analysis object, so the frontend doesn't have to send
 * a password a second time just to get a report.
 */

const PDFDocument = require("pdfkit");
const asyncHandler = require("../utils/asyncHandler");
const { runFullAnalysis } = require("./analysisController");
const Report = require("../models/Report");
const logger = require("../config/logger");

function normalizeReportData(body) {
  if (body.password) {
    const result = runFullAnalysis(body.password);
    return {
      strengthScore: result.strengthScore,
      entropy: result.entropy.effectiveBits,
      crackTimeOffline: result.entropy.crackTimes.offline,
      crackTimeOnline: result.entropy.crackTimes.online,
      cognitiveLoad: result.cognitive.loadCategory,
      memorability: result.memorability.category,
      rating: result.rating,
      recommendations: result.feedback
    };
  }

  // Precomputed analysis object, e.g. forwarded straight from a prior
  // /api/analyze response's `data` field.
  const a = body.analysis;
  return {
    strengthScore: a.strengthScore ?? 0,
    entropy: a.entropy ?? 0,
    crackTimeOffline: a.crackTime ?? a.crackTimeOffline ?? "Unknown",
    crackTimeOnline: a.crackTimeOnline ?? "Unknown",
    cognitiveLoad: a.cognitiveLoad ?? "Unknown",
    memorability: a.memorability ?? "Unknown",
    rating: a.rating ?? "Unknown",
    recommendations: Array.isArray(a.feedback) ? a.feedback : []
  };
}

const generateReport = asyncHandler(async (req, res) => {
  const data = normalizeReportData(req.body);
  const createdAt = new Date();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="cipherlock-report-${createdAt.getTime()}.pdf"`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  drawReport(doc, data, createdAt);
  doc.end();

  // Persist audit metadata after the stream is underway — never blocks the download.
  Report.create({ ...data, recommendations: data.recommendations, createdAt }).catch((err) =>
    logger.error(`Failed to persist report record: ${err.message}`)
  );
});

function drawReport(doc, data, createdAt) {
  // Header
  doc
    .fillColor("#0A0F1F")
    .fontSize(22)
    .text("CIPHERLOCK Security Report", { align: "left" })
    .moveDown(0.2);

  doc
    .fontSize(10)
    .fillColor("#5E6E8C")
    .text(`Generated ${createdAt.toUTCString()}`)
    .moveDown(1);

  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#00E5FF").stroke();
  doc.moveDown(1);

  // Score summary
  doc.fontSize(14).fillColor("#0A0F1F").text("Overall rating", { continued: true });
  doc.fontSize(14).fillColor("#00B8D9").text(`  ${data.rating}`);
  doc.moveDown(0.5);

  const rows = [
    ["Strength score", `${data.strengthScore} / 100`],
    ["Entropy", `${data.entropy} bits`],
    ["Estimated crack time (offline attack)", data.crackTimeOffline],
    ["Estimated crack time (online, throttled)", data.crackTimeOnline],
    ["Cognitive load", data.cognitiveLoad],
    ["Memorability", data.memorability]
  ];

  doc.fontSize(11).fillColor("#0A0F1F");
  rows.forEach(([label, value]) => {
    doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
    doc.font("Helvetica").text(`${value}`);
    doc.moveDown(0.25);
  });

  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#E5E9F0").stroke();
  doc.moveDown(1);

  // Recommendations
  doc.fontSize(14).fillColor("#0A0F1F").font("Helvetica-Bold").text("Recommendations");
  doc.moveDown(0.5);
  doc.fontSize(11).font("Helvetica");
  (data.recommendations || []).forEach((rec, i) => {
    doc.fillColor("#0A0F1F").text(`${i + 1}. ${rec}`);
    doc.moveDown(0.3);
  });

  doc.moveDown(1.5);
  doc
    .fontSize(8)
    .fillColor("#9FB0CC")
    .text("This report was generated locally by CIPHERLOCK. No password was transmitted to or stored by any third party.", {
      align: "left"
    });
}

module.exports = { generateReport };
