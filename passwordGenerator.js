/* ============================================================
   PasswordGenerator
   Four strategies — random secure, memorable passphrase,
   cognitive optimized, and high entropy — all seeded from
   crypto.getRandomValues for proper randomness.
   ============================================================ */

class PasswordGenerator {
  constructor() {
    this.charsets = {
      lower: "abcdefghijklmnopqrstuvwxyz",
      upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      number: "0123456789",
      symbol: "!@#$%^&*?-_=+"
    };
  }

  /** Cryptographically strong integer in [0, max). */
  secureRandomInt(max) {
    if (max <= 0) return 0;
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % max;
  }

  secureChoice(arr) {
    return arr[this.secureRandomInt(arr.length)];
  }

  shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.secureRandomInt(i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  buildPool(opts) {
    let pool = "";
    if (opts.lower) pool += this.charsets.lower;
    if (opts.upper) pool += this.charsets.upper;
    if (opts.number) pool += this.charsets.number;
    if (opts.symbol) pool += this.charsets.symbol;
    return pool || this.charsets.lower;
  }

  /** Strategy: Random secure — e.g. F#8mT!9rW@2xQ */
  randomSecure(opts) {
    const pool = this.buildPool(opts);
    const required = [];
    if (opts.lower) required.push(this.secureChoice(this.charsets.lower));
    if (opts.upper) required.push(this.secureChoice(this.charsets.upper));
    if (opts.number) required.push(this.secureChoice(this.charsets.number));
    if (opts.symbol) required.push(this.secureChoice(this.charsets.symbol));

    const length = Math.max(opts.length, required.length);
    const chars = [...required];
    while (chars.length < length) {
      chars.push(pool[this.secureRandomInt(pool.length)]);
    }
    return this.shuffle(chars).join("");
  }

  /** Strategy: Memorable passphrase — e.g. River-Coffee7!Galaxy */
  memorablePassphrase(opts) {
    const sep = opts.separator ? this.secureChoice(WORDLISTS.separators) : "";
    const wordCount = opts.length > 22 ? 3 : 2;
    const words = [];
    for (let i = 0; i < wordCount; i++) {
      const bank = i % 2 === 0 ? WORDLISTS.nouns : WORDLISTS.adjectives;
      words.push(this.secureChoice(bank));
    }

    let result = words.join(sep || "");
    if (opts.number) {
      const num = this.secureRandomInt(90) + 1;
      result += (sep || "") + num;
    }
    if (opts.symbol) {
      result += this.secureChoice(this.charsets.symbol);
    }
    if (sep && opts.number === false && opts.symbol === false) {
      // keep at least one separator for chunking even with no extras
      result = words.join(sep);
    }
    return result;
  }

  /** Strategy: Cognitive optimized — e.g. BlueTiger!42Moon */
  cognitiveOptimized(opts) {
    const adjective = this.secureChoice(WORDLISTS.adjectives);
    const noun1 = this.secureChoice(WORDLISTS.nouns);
    let noun2 = this.secureChoice(WORDLISTS.nouns);
    while (noun2 === noun1) noun2 = this.secureChoice(WORDLISTS.nouns);

    let mid = "";
    if (opts.symbol) mid += this.secureChoice(this.charsets.symbol);
    if (opts.number) mid += (this.secureRandomInt(90) + 1).toString();

    let result = `${adjective}${noun1}${mid}${noun2}`;

    // Trim or pad lightly toward the requested length without breaking structure
    if (result.length > opts.length + 4) {
      result = `${adjective}${mid}${noun1}`;
    }
    return result;
  }

  /** Strategy: High entropy — e.g. @M9$kQ2!Lp7#Xz4 */
  highEntropy(opts) {
    const fullOpts = { ...opts, lower: true, upper: true, number: true, symbol: true };
    const pool = this.buildPool(fullOpts);
    const chars = [];
    for (let i = 0; i < opts.length; i++) {
      chars.push(pool[this.secureRandomInt(pool.length)]);
    }
    // Guarantee a symbol leads/trails for visual signature + class coverage
    if (chars.length > 1) {
      chars[0] = this.secureChoice(this.charsets.symbol);
      chars[1] = this.secureChoice(this.charsets.number);
    }
    return chars.join("");
  }

  generate(strategy, opts) {
    switch (strategy) {
      case "passphrase": return this.memorablePassphrase(opts);
      case "cognitive": return this.cognitiveOptimized(opts);
      case "entropy": return this.highEntropy(opts);
      case "random":
      default: return this.randomSecure(opts);
    }
  }
}
