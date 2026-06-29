/* ============================================================
   backendAdapter.js
   Maps the backend's /api/analyze response shape onto the exact
   object shape PasswordAnalyzer.analyze() produces locally, so
   every render* function in UIController works unchanged
   regardless of whether the data came from the network or the
   in-browser fallback engines.
   ============================================================ */

function adaptBackendAnalysis(password, apiData) {
  const d = apiData.details || {};

  const patterns = {
    sequential: (d.detectedPatterns || []).includes("sequential"),
    keyboardPath: (d.detectedPatterns || []).includes("keyboardPath"),
    repeatedChars: (d.detectedPatterns || []).includes("repeatedChars"),
    repeatedBlock: (d.detectedPatterns || []).includes("repeatedBlock"),
    knownWeak: (d.detectedPatterns || []).includes("knownWeak")
  };

  const comp = d.composition || {
    hasLength: password.length >= 12,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[^a-zA-Z0-9]/.test(password),
    diversity: [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(r => r.test(password)).length
  };

  const cog = {
    pronounceability: d.pronounceability ?? 0,
    chunking: d.chunking ?? 0,
    meaningfulWord: d.meaningfulWordCoverage ?? 0,
    wordMatches: [], // backend reports coverage, not the literal matches — fine, unused by rendering
    complexity: d.cognitiveComplexity ?? 0,
    memorability: d.memorabilityScore ?? 0,
    loadCategory: apiData.cognitiveLoad,
    memorabilityCategory: apiData.memorability
  };

  const noPattern = !patterns.sequential && !patterns.keyboardPath &&
    !patterns.repeatedChars && !patterns.repeatedBlock && !patterns.knownWeak;

  const checklist = {
    length: comp.hasLength,
    upper: comp.hasUpper,
    lower: comp.hasLower,
    number: comp.hasNumber,
    symbol: comp.hasSymbol,
    pattern: noPattern,
    entropy: apiData.entropy >= 60,
    cogload: cog.complexity < 65,
    memorability: cog.memorability >= 60
  };

  const insights = (apiData.feedback || []).map(text => ({
    level: insightLevelFor(text),
    text
  }));
  if (insights.length === 0) {
    insights.push({ level: "info", text: "No feedback returned." });
  }

  return {
    empty: false,
    password,
    securityScore: apiData.strengthScore,
    rating: apiData.rating,
    cog,
    entropy: {
      rawBits: d.rawEntropyBits ?? apiData.entropy,
      effectiveBits: apiData.entropy,
      resistance: d.attackResistance ?? 0,
      resistanceLabel: d.attackResistanceLabel ?? "—"
    },
    crackTimes: {
      online: apiData.crackTimeOnline,
      offline: apiData.crackTime
    },
    patterns,
    comp,
    checklist,
    insights,
    source: "backend"
  };
}

function insightLevelFor(text) {
  const lower = text.toLowerCase();
  if (lower.includes("immediately") || lower.includes("leaked") || lower.includes("replace")) return "danger";
  if (lower.includes("avoid") || lower.includes("reduce") || lower.includes("increase")) return "warning";
  if (lower.includes("no major weaknesses") || lower.includes("balances")) return "success";
  return "info";
}

/** Lightweight shape used for the generator panel's mini-stats + history, from /api/generate. */
function adaptBackendGeneration(apiData) {
  return {
    securityScore: apiData.strengthScore,
    rating: apiData.rating,
    entropy: { effectiveBits: apiData.entropy },
    cog: { memorabilityCategory: apiData.memorability, loadCategory: apiData.cognitiveLoad },
    source: "backend"
  };
}
