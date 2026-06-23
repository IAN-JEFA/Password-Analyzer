/* ============================================================
   PasswordAnalyzer
   Orchestrates EntropyEngine + CognitiveLoadCalculator, detects
   weak patterns, and produces the final scored verdict used by
   the UI (checklist, gauge, insights, ratings).
   ============================================================ */

class PasswordAnalyzer {
  constructor() {
    this.entropyEngine = new EntropyEngine();
    this.cognitive = new CognitiveLoadCalculator();
  }

  // ---------- Pattern detection ----------

  hasSequentialRun(password, minRun = 3) {
    const lower = password.toLowerCase();
    const { sequencesAsc, sequencesDesc } = PATTERN_DATA;
    for (let i = 0; i <= lower.length - minRun; i++) {
      const slice = lower.slice(i, i + minRun);
      if (sequencesAsc.includes(slice) || sequencesDesc.includes(slice)) return true;
    }
    return false;
  }

  hasKeyboardPath(password, minRun = 3) {
    const lower = password.toLowerCase();
    for (const row of PATTERN_DATA.keyboardRows) {
      for (let i = 0; i <= lower.length - minRun; i++) {
        const slice = lower.slice(i, i + minRun);
        if (row.includes(slice) || row.split("").reverse().join("").includes(slice)) return true;
      }
    }
    return false;
  }

  hasRepeatedChars(password, minRun = 3) {
    return new RegExp(`(.)\\1{${minRun - 1},}`).test(password);
  }

  hasRepeatedBlock(password) {
    // Detects patterns like "abab", "123123", "xyxyxy"
    for (let blockLen = 2; blockLen <= Math.floor(password.length / 2); blockLen++) {
      const block = password.slice(0, blockLen);
      const repeated = block.repeat(Math.ceil(password.length / blockLen)).slice(0, password.length);
      if (repeated === password && password.length / blockLen >= 2.5) return true;
    }
    return false;
  }

  isKnownWeak(password) {
    return PATTERN_DATA.knownWeak.includes(password.toLowerCase());
  }

  detectPatterns(password) {
    return {
      sequential: this.hasSequentialRun(password),
      keyboardPath: this.hasKeyboardPath(password),
      repeatedChars: this.hasRepeatedChars(password),
      repeatedBlock: this.hasRepeatedBlock(password),
      knownWeak: this.isKnownWeak(password)
    };
  }

  patternPenaltyMultiplier(patterns) {
    let hits = 0;
    if (patterns.sequential) hits++;
    if (patterns.keyboardPath) hits++;
    if (patterns.repeatedChars) hits++;
    if (patterns.repeatedBlock) hits++;
    if (patterns.knownWeak) return 0.05; // catastrophic — essentially public knowledge
    return Math.max(0.35, 1 - hits * 0.18);
  }

  // ---------- Character composition ----------

  composition(password) {
    return {
      hasLength: password.length >= 12,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSymbol: /[^a-zA-Z0-9]/.test(password),
      diversity: [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(r => r.test(password)).length
    };
  }

  // ---------- Scoring ----------

  securityScore(effectiveBits, comp) {
    const entropyComponent = Math.min(100, (effectiveBits / 75) * 100);
    const diversityBonus = comp.diversity * 2.5;
    const lengthBonus = comp.hasLength ? 5 : 0;
    return Math.max(0, Math.min(100, Math.round(entropyComponent * 0.82 + diversityBonus + lengthBonus)));
  }

  overallRating(securityScore, memorability) {
    if (securityScore >= 85 && memorability >= 50) return "Elite";
    if (securityScore >= 65) return "Strong";
    if (securityScore >= 40) return "Moderate";
    return "Weak";
  }

  // ---------- Insights ----------

  generateInsights(password, { patterns, comp, effectiveBits, cog, securityScore }) {
    const insights = [];

    if (patterns.knownWeak) {
      insights.push({
        level: "danger",
        text: "This is one of the most commonly leaked passwords on the internet — attackers try it within the first second of any attack."
      });
    }
    if (patterns.sequential) {
      insights.push({
        level: "danger",
        text: "Your password contains predictable sequences (like abc or 123), which cracking tools check first."
      });
    }
    if (patterns.keyboardPath) {
      insights.push({
        level: "danger",
        text: "This password follows a keyboard path (like qwerty), a structure that's tested early in any attack."
      });
    }
    if (patterns.repeatedChars || patterns.repeatedBlock) {
      insights.push({
        level: "warning",
        text: "Repeated characters or blocks reduce effective entropy without making the password meaningfully easier to recall."
      });
    }
    if (!comp.hasLength) {
      insights.push({
        level: "warning",
        text: "Each extra character multiplies the time an attacker needs — extending the length is the highest-leverage fix here."
      });
    }
    if (securityScore >= 70 && cog.memorability < 40) {
      insights.push({
        level: "info",
        text: "This password is strong but may be difficult to remember. Consider a passphrase-style structure for easier recall."
      });
    }
    if (cog.chunking >= 60 && cog.wordMatches.length > 0) {
      insights.push({
        level: "success",
        text: "This password uses effective chunking patterns that improve recall without relying on a single dictionary word."
      });
    }
    if (cog.pronounceability >= 65 && securityScore < 60) {
      insights.push({
        level: "info",
        text: "This password is pronounceable and easy to recall, but its predictability is keeping security lower than it could be."
      });
    }

    // Quantified "add a word" suggestion
    const addedWordBits = 5 * Math.log2(26 + 26); // ~5-letter mixed-case word
    if (effectiveBits > 0) {
      const pctIncrease = Math.round((addedWordBits / effectiveBits) * 100);
      if (pctIncrease > 5 && pctIncrease < 400) {
        insights.push({
          level: "info",
          text: `Adding one more unrelated word would increase security by roughly ${pctIncrease}%.`
        });
      }
    }

    if (insights.length === 0) {
      insights.push({
        level: "success",
        text: "No major weaknesses detected. This password balances security and structure well."
      });
    }

    return insights;
  }

  // ---------- Checklist (for the live checklist UI) ----------

  checklist(password, { patterns, comp, effectiveBits, cog }) {
    const noPattern = !patterns.sequential && !patterns.keyboardPath &&
      !patterns.repeatedChars && !patterns.repeatedBlock && !patterns.knownWeak;
    return {
      length: comp.hasLength,
      upper: comp.hasUpper,
      lower: comp.hasLower,
      number: comp.hasNumber,
      symbol: comp.hasSymbol,
      pattern: noPattern,
      entropy: effectiveBits >= 60,
      cogload: cog.complexity < 65,
      memorability: cog.memorability >= 60
    };
  }

  // ---------- Main entry point ----------

  analyze(password) {
    if (!password) {
      return {
        empty: true,
        password: "",
        securityScore: 0,
        rating: "—",
        cog: { loadCategory: "—", memorabilityCategory: "—", complexity: 0, memorability: 0, pronounceability: 0, chunking: 0, wordMatches: [] },
        entropy: { rawBits: 0, effectiveBits: 0, resistance: 0, resistanceLabel: "—" },
        crackTimes: { online: "—", offline: "—" },
        patterns: {},
        comp: {},
        checklist: {},
        insights: [{ level: "info", text: "Type a password to receive tailored feedback here." }]
      };
    }

    const patterns = this.detectPatterns(password);
    const comp = this.composition(password);
    const penalty = this.patternPenaltyMultiplier(patterns);

    const rawBits = this.entropyEngine.bitsForPassword(password);
    const effectiveBits = this.entropyEngine.effectiveBits(rawBits, penalty);
    const resistance = this.entropyEngine.resistanceScore(effectiveBits);
    const resistanceLabel = this.entropyEngine.resistanceLabel(resistance);
    const crackTimes = this.entropyEngine.crackTimes(effectiveBits);

    const cog = this.cognitive.analyze(password);
    const securityScore = this.securityScore(effectiveBits, comp);
    const rating = this.overallRating(securityScore, cog.memorability);

    const checklist = this.checklist(password, { patterns, comp, effectiveBits, cog });
    const insights = this.generateInsights(password, { patterns, comp, effectiveBits, cog, securityScore });

    return {
      empty: false,
      password,
      securityScore,
      rating,
      cog,
      entropy: { rawBits, effectiveBits, resistance, resistanceLabel },
      crackTimes,
      patterns,
      comp,
      checklist,
      insights
    };
  }
}
