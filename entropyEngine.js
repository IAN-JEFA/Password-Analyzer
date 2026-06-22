/* ============================================================
   EntropyEngine
   Computes character-pool entropy, attack resistance, and
   human-readable crack-time estimates.
   ============================================================ */

class EntropyEngine {
  constructor() {
    // Guesses-per-second assumptions for two attacker models
    this.RATE_ONLINE_THROTTLED = 10;        // rate-limited login form
    this.RATE_OFFLINE_FAST_HASH = 1e10;     // GPU farm vs. unsalted fast hash
  }

  /** Determine effective character pool size from the password's content. */
  poolSize(password) {
    let pool = 0;
    if (/[a-z]/.test(password)) pool += 26;
    if (/[A-Z]/.test(password)) pool += 26;
    if (/[0-9]/.test(password)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(password)) pool += 33;
    return pool || 1;
  }

  /** Raw Shannon-style entropy in bits, based on length * log2(pool). */
  bitsForPassword(password) {
    if (!password) return 0;
    const pool = this.poolSize(password);
    return Math.round(password.length * Math.log2(pool) * 10) / 10;
  }

  /**
   * Apply a penalty to raw entropy bits based on detected weaknesses
   * (patterns, repetition, dictionary words). Penalty is a 0..1 multiplier
   * supplied by PasswordAnalyzer so EntropyEngine stays single-purpose.
   */
  effectiveBits(rawBits, penaltyMultiplier = 1) {
    return Math.max(0, Math.round(rawBits * penaltyMultiplier * 10) / 10);
  }

  /** Average-case seconds to crack at a given guess rate, from entropy bits. */
  secondsToCrack(bits, ratePerSecond) {
    const keyspace = Math.pow(2, bits);
    return keyspace / 2 / ratePerSecond;
  }

  /** Human-friendly duration string for a seconds value. */
  humanizeSeconds(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "Unknown";
    if (seconds < 1) return "Instantly";
    const units = [
      { label: "second", secs: 1 },
      { label: "minute", secs: 60 },
      { label: "hour", secs: 3600 },
      { label: "day", secs: 86400 },
      { label: "month", secs: 2629800 },
      { label: "year", secs: 31557600 },
      { label: "century", secs: 3155760000 }
    ];

    if (seconds < 60) return `${Math.round(seconds)} sec`;

    // Walk from largest to smallest unit
    for (let i = units.length - 1; i >= 0; i--) {
      const u = units[i];
      const value = seconds / u.secs;
      if (value >= 1) {
        if (u.label === "century" && value > 1000) {
          const millions = value * 100 / 1e6;
          if (millions >= 1) {
            return millions >= 1000
              ? `${(millions / 1000).toFixed(1)} billion years`
              : `${millions.toFixed(1)} million years`;
          }
        }
        const pluralLabel = u.label === "century" ? "centuries" : `${u.label}s`;
        const unitLabel = value > 1 ? pluralLabel : u.label;
        return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${unitLabel}`;
      }
    }
    return "Instantly";
  }

  /** Full crack-time read-out for both attacker models. */
  crackTimes(bits) {
    const onlineSec = this.secondsToCrack(bits, this.RATE_ONLINE_THROTTLED);
    const offlineSec = this.secondsToCrack(bits, this.RATE_OFFLINE_FAST_HASH);
    return {
      online: this.humanizeSeconds(onlineSec),
      offline: this.humanizeSeconds(offlineSec),
      onlineSeconds: onlineSec,
      offlineSeconds: offlineSec
    };
  }

  /** 0-100 "attack resistance" gauge, log-scaled against offline crack time. */
  resistanceScore(bits) {
    // 28 bits ~ trivial, 100+ bits ~ practically unbreakable offline
    const score = Math.min(100, Math.round((bits / 100) * 100));
    return score;
  }

  resistanceLabel(score) {
    if (score < 25) return "Trivial";
    if (score < 50) return "Weak";
    if (score < 75) return "Solid";
    return "Formidable";
  }
}
