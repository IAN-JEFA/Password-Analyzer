/* ============================================================
   CognitiveLoadCalculator
   Estimates how much mental effort a password takes to recall:
   pronounceability, chunking, meaningful-word use, and an
   aggregate cognitive load / memorability read-out.
   ============================================================ */

class CognitiveLoadCalculator {
  constructor() {
    this.vowels = new Set("aeiouAEIOU".split(""));
  }

  /** 0-100: how closely the password reads like speakable syllables. */
  pronounceabilityScore(password) {
    const letters = password.replace(/[^a-zA-Z]/g, "");
    if (letters.length < 2) return 20;

    let goodTransitions = 0;
    let totalTransitions = letters.length - 1;
    let longestConsonantRun = 0;
    let currentRun = 0;

    for (let i = 0; i < letters.length; i++) {
      const isVowel = this.vowels.has(letters[i]);
      if (!isVowel) {
        currentRun++;
        longestConsonantRun = Math.max(longestConsonantRun, currentRun);
      } else {
        currentRun = 0;
      }
      if (i > 0) {
        const prevIsVowel = this.vowels.has(letters[i - 1]);
        // Alternation between vowel/consonant groups reads as syllabic
        if (isVowel !== prevIsVowel) goodTransitions++;
      }
    }

    const alternationRatio = totalTransitions > 0 ? goodTransitions / totalTransitions : 0;
    let score = alternationRatio * 100;

    // Long unbroken consonant clusters are hard to vocalize ("rstvx")
    if (longestConsonantRun >= 4) score -= 25;
    else if (longestConsonantRun === 3) score -= 10;

    const vowelRatio = letters.length
      ? letters.split("").filter(c => this.vowels.has(c)).length / letters.length
      : 0;
    // Healthy spoken-language vowel ratio sits roughly between 0.25 and 0.55
    if (vowelRatio < 0.12 || vowelRatio > 0.7) score -= 15;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /** 0-100: whether separators break the password into recallable, evenly-sized chunks. */
  chunkingEffectiveness(password) {
    const sepRegex = /[-_.*+~ ]/;
    if (!sepRegex.test(password)) {
      // No separators — fall back to a small score for digit/letter boundaries
      const boundaryMatches = password.match(/[a-zA-Z][0-9]|[0-9][a-zA-Z]/g) || [];
      return Math.min(40, boundaryMatches.length * 12);
    }
    const chunks = password.split(/[-_.*+~ ]/).filter(Boolean);
    if (chunks.length < 2) return 30;

    const lengths = chunks.map(c => c.length);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((a, b) => a + (b - avg) ** 2, 0) / lengths.length;
    const evenness = Math.max(0, 100 - variance * 18);
    const idealChunkBonus = (avg >= 3 && avg <= 8) ? 20 : 0;

    return Math.max(0, Math.min(100, Math.round(evenness * 0.6 + idealChunkBonus + chunks.length * 6)));
  }

  /** Returns matched dictionary words / name-bank words found inside the password. */
  meaningfulWordMatches(password) {
    const lower = password.toLowerCase();
    const bank = [
      ...WORDLISTS.commonWords,
      ...WORDLISTS.nouns.map(w => w.toLowerCase()),
      ...WORDLISTS.adjectives.map(w => w.toLowerCase())
    ];
    const found = new Set();
    bank.forEach(word => {
      if (word.length >= 4 && lower.includes(word)) found.add(word);
    });
    return Array.from(found);
  }

  /** 0-100 score rewarding recognizable word content (not a security signal — a recall one). */
  meaningfulWordScore(password) {
    const matches = this.meaningfulWordMatches(password);
    if (matches.length === 0) return 0;
    const coverage = matches.reduce((sum, w) => sum + w.length, 0) / Math.max(1, password.length);
    return Math.min(100, Math.round(coverage * 140));
  }

  /**
   * 0-100 cognitive complexity: how much raw mental effort recall demands.
   * High randomness with no pronounceable or chunked structure scores high.
   */
  cognitiveComplexityScore(password, pronounceability, chunking) {
    const randomnessSignal = 100 - (pronounceability * 0.5 + chunking * 0.5);
    const lengthPenalty = Math.min(20, Math.max(0, (password.length - 16) * 1.5));
    return Math.max(0, Math.min(100, Math.round(randomnessSignal * 0.85 + lengthPenalty)));
  }

  /** 0-100 memorability: the inverse-ish blend humans actually experience. */
  memorabilityScore(password, pronounceability, chunking, meaningfulWord) {
    const lengthFactor = password.length <= 22
      ? 100 - Math.abs(password.length - 14) * 4
      : Math.max(10, 100 - (password.length - 14) * 6);

    const score =
      pronounceability * 0.32 +
      chunking * 0.26 +
      meaningfulWord * 0.22 +
      Math.max(0, lengthFactor) * 0.20;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  cognitiveLoadCategory(complexityScore) {
    if (complexityScore < 35) return "Low";
    if (complexityScore < 65) return "Medium";
    return "High";
  }

  memorabilityCategory(memScore) {
    if (memScore < 40) return "Poor";
    if (memScore < 70) return "Good";
    return "Excellent";
  }

  /** Aggregate profile used everywhere else in the app. */
  analyze(password) {
    const pronounceability = this.pronounceabilityScore(password);
    const chunking = this.chunkingEffectiveness(password);
    const wordMatches = this.meaningfulWordMatches(password);
    const meaningfulWord = this.meaningfulWordScore(password);
    const complexity = this.cognitiveComplexityScore(password, pronounceability, chunking);
    const memorability = this.memorabilityScore(password, pronounceability, chunking, meaningfulWord);

    return {
      pronounceability,
      chunking,
      meaningfulWord,
      wordMatches,
      complexity,
      memorability,
      loadCategory: this.cognitiveLoadCategory(complexity),
      memorabilityCategory: this.memorabilityCategory(memorability)
    };
  }
}
