/* ============================================================
   UIController
   Wires DOM events to the analyzer/generator engines, renders
   SVG visuals (gauge, radar, trend), manages localStorage
   history, theme, clipboard, and the background canvas.
   ============================================================ */

class UIController {
  constructor() {
    this.analyzer = new PasswordAnalyzer();
    this.generator = new PasswordGenerator();

    this.dom = {
      pwInput: document.getElementById("pwInput"),
      pwToggleVis: document.getElementById("pwToggleVis"),
      checklist: document.getElementById("pwChecklist"),
      insightText: document.getElementById("insightText"),

      cmpA: document.getElementById("cmpA"),
      cmpB: document.getElementById("cmpB"),
      cmpRun: document.getElementById("cmpRun"),
      cmpResult: document.getElementById("cmpResult"),

      gaugeFill: document.getElementById("gaugeFill"),
      gaugeScore: document.getElementById("gaugeScore"),
      gaugeLabel: document.getElementById("gaugeLabel"),

      ratingOverall: document.querySelector("#ratingOverall [data-val]"),
      ratingCog: document.querySelector("#ratingCog [data-val]"),
      ratingMem: document.querySelector("#ratingMem [data-val]"),

      entropyBits: document.getElementById("entropyBits"),
      entropyBar: document.getElementById("entropyBar"),
      resistanceLabel: document.getElementById("resistanceLabel"),
      resistanceBar: document.getElementById("resistanceBar"),
      radarSvg: document.getElementById("radarSvg"),

      ctOnline: document.getElementById("ctOnline"),
      ctOffline: document.getElementById("ctOffline"),

      strategyTabs: Array.from(document.querySelectorAll(".strategy-tab")),
      lenRange: document.getElementById("lenRange"),
      lenVal: document.getElementById("lenVal"),
      optUpper: document.getElementById("optUpper"),
      optLower: document.getElementById("optLower"),
      optNumber: document.getElementById("optNumber"),
      optSymbol: document.getElementById("optSymbol"),
      optSeparator: document.getElementById("optSeparator"),
      generateBtn: document.getElementById("generateBtn"),
      genOutput: document.getElementById("genOutput"),
      copyBtn: document.getElementById("copyBtn"),
      copyStatus: document.getElementById("copyStatus"),
      genMiniStats: document.getElementById("genMiniStats"),

      historyList: document.getElementById("historyList"),
      trendSvg: document.getElementById("trendSvg"),
      clearHistory: document.getElementById("clearHistory"),

      themeToggle: document.getElementById("themeToggle"),
      tutorialBtn: document.getElementById("tutorialBtn"),
      tutorialDialog: document.getElementById("tutorialDialog"),
      tutorialClose: document.getElementById("tutorialClose")
    };

    this.state = {
      strategy: "random",
      history: this.loadHistory()
    };

    this.GAUGE_CIRCUMFERENCE = 2 * Math.PI * 100; // r=100

    this.bindEvents();
    this.renderTrend();
    this.renderHistoryList();
    this.initTheme();
    this.initParticles();
    this.runAnalysis(""); // initial empty state render
  }

  // ---------------- Events ----------------

  bindEvents() {
    let debounceTimer = null;
    this.dom.pwInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const value = this.dom.pwInput.value;
        const result = this.runAnalysis(value);
        if (value.length >= 4) this.pushHistory(result);
      }, 120);
    });

    this.dom.pwToggleVis.addEventListener("click", () => {
      const isPw = this.dom.pwInput.type === "password";
      this.dom.pwInput.type = isPw ? "text" : "password";
      this.dom.pwToggleVis.setAttribute("aria-label", isPw ? "Hide password" : "Show password");
    });

    this.dom.cmpRun.addEventListener("click", () => this.runComparison());

    this.dom.strategyTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        this.dom.strategyTabs.forEach(t => { t.classList.remove("is-active"); t.setAttribute("aria-selected", "false"); });
        tab.classList.add("is-active");
        tab.setAttribute("aria-selected", "true");
        this.state.strategy = tab.dataset.strategy;
      });
    });

    this.dom.lenRange.addEventListener("input", () => {
      this.dom.lenVal.textContent = this.dom.lenRange.value;
    });

    this.dom.generateBtn.addEventListener("click", () => this.runGeneration());
    this.dom.copyBtn.addEventListener("click", () => this.copyGenerated());

    this.dom.clearHistory.addEventListener("click", () => {
      this.state.history = [];
      this.saveHistory();
      this.renderTrend();
      this.renderHistoryList();
    });

    this.dom.themeToggle.addEventListener("click", () => this.toggleTheme());

    this.dom.tutorialBtn.addEventListener("click", () => this.dom.tutorialDialog.showModal());
    this.dom.tutorialClose.addEventListener("click", () => this.dom.tutorialDialog.close());

    if (!localStorage.getItem("cipherlock_seen_tutorial")) {
      setTimeout(() => {
        this.dom.tutorialDialog.showModal();
        localStorage.setItem("cipherlock_seen_tutorial", "1");
      }, 600);
    }
  }

  // ---------------- Analysis rendering ----------------

  runAnalysis(password) {
    const result = this.analyzer.analyze(password);
    this.renderChecklist(result);
    this.renderGauge(result);
    this.renderRatings(result);
    this.renderEntropy(result);
    this.renderRadar(result);
    this.renderCrackTimes(result);
    this.renderInsight(result);
    return result;
  }

  renderChecklist(result) {
    const items = this.dom.checklist.querySelectorAll("li[data-check]");
    items.forEach(li => {
      const key = li.dataset.check;
      const pass = !!result.checklist[key];
      li.classList.toggle("is-pass", pass && !result.empty);
      li.classList.toggle("is-fail", !pass && !result.empty);
    });
  }

  renderGauge(result) {
    const score = result.securityScore;
    const offset = this.GAUGE_CIRCUMFERENCE * (1 - score / 100);
    this.dom.gaugeFill.style.strokeDashoffset = offset;

    let color = "var(--danger)";
    let label = "Weak";
    if (score >= 76) { color = "var(--secondary)"; label = "Elite"; }
    else if (score >= 51) { color = "var(--primary)"; label = "Strong"; }
    else if (score >= 26) { color = "var(--warning)"; label = "Fair"; }

    this.dom.gaugeFill.style.stroke = color;
    this.dom.gaugeScore.textContent = result.empty ? "0" : score;
    this.dom.gaugeLabel.textContent = result.empty ? "—" : label;
  }

  renderRatings(result) {
    this.dom.ratingOverall.textContent = result.rating;
    this.dom.ratingCog.textContent = result.cog.loadCategory;
    this.dom.ratingMem.textContent = result.cog.memorabilityCategory;

    this.setRatingColor(this.dom.ratingOverall, result.rating, { Weak: "var(--danger)", Moderate: "var(--warning)", Strong: "var(--primary)", Elite: "var(--secondary)" });
    this.setRatingColor(this.dom.ratingCog, result.cog.loadCategory, { High: "var(--danger)", Medium: "var(--warning)", Low: "var(--secondary)" });
    this.setRatingColor(this.dom.ratingMem, result.cog.memorabilityCategory, { Poor: "var(--danger)", Good: "var(--warning)", Excellent: "var(--secondary)" });
  }

  setRatingColor(el, key, map) {
    el.style.color = map[key] || "var(--text-mid)";
  }

  renderEntropy(result) {
    this.dom.entropyBits.textContent = result.empty ? "0 bits" : `${result.entropy.effectiveBits} bits`;
    this.dom.entropyBar.style.width = `${Math.min(100, (result.entropy.effectiveBits / 90) * 100)}%`;

    this.dom.resistanceLabel.textContent = result.empty ? "—" : result.entropy.resistanceLabel;
    this.dom.resistanceBar.style.width = `${result.entropy.resistance || 0}%`;
  }

  renderCrackTimes(result) {
    this.dom.ctOnline.textContent = result.empty ? "Instantly" : result.crackTimes.online;
    this.dom.ctOffline.textContent = result.empty ? "Instantly" : result.crackTimes.offline;
  }

  renderInsight(result) {
    const top = result.insights[0];
    this.dom.insightText.textContent = top.text;
    const colorMap = { danger: "var(--danger)", warning: "var(--warning)", info: "var(--primary)", success: "var(--secondary)" };
    this.dom.insightText.style.color = colorMap[top.level] || "var(--text-mid)";
  }

  // ---------------- Radar chart ----------------

  renderRadar(result) {
    const metrics = result.empty
      ? [0, 0, 0, 0, 0]
      : [
          Math.min(100, (result.password.length / 24) * 100),
          result.comp.diversity * 25,
          Math.min(100, (result.entropy.effectiveBits / 90) * 100),
          result.cog.complexity,
          result.entropy.resistance
        ];
    const labels = ["Length", "Diversity", "Entropy", "Unpredictability", "Resistance"];
    this.dom.radarSvg.innerHTML = this.buildRadarSvg(metrics, labels);
  }

  buildRadarSvg(values, labels) {
    const cx = 110, cy = 110, maxR = 85;
    const n = values.length;
    const angleStep = (Math.PI * 2) / n;
    const pointAt = (i, r) => {
      const angle = -Math.PI / 2 + i * angleStep;
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    };

    let svg = "";

    // Grid rings
    [0.25, 0.5, 0.75, 1].forEach(frac => {
      const pts = Array.from({ length: n }, (_, i) => pointAt(i, maxR * frac).join(",")).join(" ");
      svg += `<polygon points="${pts}" fill="none" stroke="var(--border-soft)" stroke-width="1"/>`;
    });

    // Axis lines + labels
    labels.forEach((label, i) => {
      const [x, y] = pointAt(i, maxR);
      svg += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--border-soft)" stroke-width="1"/>`;
      const [lx, ly] = pointAt(i, maxR + 18);
      svg += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="9" fill="var(--text-low)" font-family="var(--font-body)">${label}</text>`;
    });

    // Data polygon
    const dataPts = values.map((v, i) => pointAt(i, (Math.max(2, v) / 100) * maxR).join(",")).join(" ");
    svg += `<polygon points="${dataPts}" fill="rgba(0,229,255,0.22)" stroke="var(--primary)" stroke-width="2"/>`;
    values.forEach((v, i) => {
      const [x, y] = pointAt(i, (Math.max(2, v) / 100) * maxR);
      svg += `<circle cx="${x}" cy="${y}" r="3" fill="var(--secondary)"/>`;
    });

    return svg;
  }

  // ---------------- Comparison tool ----------------

  runComparison() {
    const a = this.dom.cmpA.value;
    const b = this.dom.cmpB.value;
    if (!a || !b) {
      this.dom.cmpResult.innerHTML = `<p style="color:var(--text-low)">Enter both passwords to compare.</p>`;
      return;
    }
    const ra = this.analyzer.analyze(a);
    const rb = this.analyzer.analyze(b);

    const rows = [
      ["Entropy", `${ra.entropy.effectiveBits} bits`, `${rb.entropy.effectiveBits} bits`, ra.entropy.effectiveBits, rb.entropy.effectiveBits],
      ["Crack time (offline)", ra.crackTimes.offline, rb.crackTimes.offline, ra.entropy.effectiveBits, rb.entropy.effectiveBits],
      ["Cognitive load", ra.cog.loadCategory, rb.cog.loadCategory, 100 - ra.cog.complexity, 100 - rb.cog.complexity],
      ["Memorability", ra.cog.memorabilityCategory, rb.cog.memorabilityCategory, ra.cog.memorability, rb.cog.memorability],
      ["Security score", ra.securityScore, rb.securityScore, ra.securityScore, rb.securityScore]
    ];

    let html = `<div class="cmp-row"><strong>Metric</strong><strong>Password A</strong><strong>Password B</strong></div>`;
    rows.forEach(([label, av, bv, aScore, bScore]) => {
      const aWins = aScore > bScore;
      const bWins = bScore > aScore;
      html += `<div class="cmp-row"><span>${label}</span><span class="${aWins ? "winner" : ""}">${av}</span><span class="${bWins ? "winner" : ""}">${bv}</span></div>`;
    });

    const overallWinner = ra.securityScore === rb.securityScore ? "Tie" : (ra.securityScore > rb.securityScore ? "Password A" : "Password B");
    html += `<p style="margin-top:8px;color:var(--secondary);font-weight:700;">${overallWinner === "Tie" ? "Both passwords score evenly." : `${overallWinner} is the stronger overall choice.`}</p>`;

    this.dom.cmpResult.innerHTML = html;
  }

  // ---------------- Generator ----------------

  collectGenOptions() {
    return {
      length: parseInt(this.dom.lenRange.value, 10),
      upper: this.dom.optUpper.checked,
      lower: this.dom.optLower.checked,
      number: this.dom.optNumber.checked,
      symbol: this.dom.optSymbol.checked,
      separator: this.dom.optSeparator.checked
    };
  }

  runGeneration() {
    const opts = this.collectGenOptions();
    const password = this.generator.generate(this.state.strategy, opts);
    this.dom.genOutput.textContent = password;

    const result = this.analyzer.analyze(password);
    this.renderGenMiniStats(result);
    this.pushHistory(result, this.state.strategy);
    this.dom.copyStatus.textContent = "";
  }

  renderGenMiniStats(result) {
    const stats = [
      ["Score", `${result.securityScore}/100`],
      ["Entropy", `${result.entropy.effectiveBits} bits`],
      ["Memorability", result.cog.memorabilityCategory]
    ];
    this.dom.genMiniStats.innerHTML = stats.map(([k, v]) =>
      `<div class="mini"><span class="mk">${k}</span><span class="mv">${v}</span></div>`
    ).join("");
  }

  async copyGenerated() {
    const text = this.dom.genOutput.textContent;
    if (!text || text === "Press generate to begin") return;
    try {
      await navigator.clipboard.writeText(text);
      this.dom.copyStatus.textContent = "Copied to clipboard.";
    } catch {
      this.dom.copyStatus.textContent = "Copy failed — select and copy manually.";
    }
    setTimeout(() => { this.dom.copyStatus.textContent = ""; }, 2500);
  }

  // ---------------- History (localStorage) ----------------

  loadHistory() {
    try {
      const raw = localStorage.getItem("cipherlock_history");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveHistory() {
    try {
      localStorage.setItem("cipherlock_history", JSON.stringify(this.state.history.slice(-30)));
    } catch { /* storage unavailable — fail silently */ }
  }

  pushHistory(result, source = "analysis") {
    if (result.empty) return;
    this.state.history.push({
      score: result.securityScore,
      rating: result.rating,
      source,
      ts: Date.now()
    });
    this.state.history = this.state.history.slice(-30);
    this.saveHistory();
    this.renderTrend();
    this.renderHistoryList();
  }

  renderHistoryList() {
    const items = this.state.history.slice(-8).reverse();
    if (items.length === 0) {
      this.dom.historyList.innerHTML = `<li style="justify-content:center;">No history yet</li>`;
      return;
    }
    this.dom.historyList.innerHTML = items.map(item => {
      const date = new Date(item.ts);
      const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return `<li><span>${item.source === "analysis" ? "Checked" : "Generated"} · ${time}</span><span class="hscore">${item.score}</span></li>`;
    }).join("");
  }

  renderTrend() {
    const pts = this.state.history.slice(-12).map(h => h.score);
    if (pts.length < 2) {
      this.dom.trendSvg.innerHTML = `<text x="140" y="38" text-anchor="middle" font-size="10" fill="var(--text-low)">Not enough data yet</text>`;
      return;
    }
    const w = 280, h = 70, pad = 6;
    const stepX = (w - pad * 2) / (pts.length - 1);
    const coords = pts.map((v, i) => {
      const x = pad + i * stepX;
      const y = h - pad - (v / 100) * (h - pad * 2);
      return [x, y];
    });
    const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(" ");
    const areaPath = `${linePath} L${coords[coords.length - 1][0].toFixed(1)},${h - pad} L${coords[0][0].toFixed(1)},${h - pad} Z`;

    const dots = coords.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.4" fill="var(--secondary)"/>`).join("");

    this.dom.trendSvg.innerHTML = `
      <path d="${areaPath}" fill="rgba(0,255,163,0.12)" stroke="none"/>
      <path d="${linePath}" fill="none" stroke="var(--secondary)" stroke-width="2"/>
      ${dots}
    `;
  }

  // ---------------- Theme ----------------

  initTheme() {
    const saved = localStorage.getItem("cipherlock_theme") || "dark";
    document.body.setAttribute("data-theme", saved);
    this.updateThemeToggleLabel(saved);
  }

  toggleTheme() {
    const current = document.body.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", next);
    localStorage.setItem("cipherlock_theme", next);
    this.updateThemeToggleLabel(next);
  }

  updateThemeToggleLabel(theme) {
    const span = this.dom.themeToggle.querySelector("span");
    span.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    this.dom.themeToggle.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
  }

  // ---------------- Background particles ----------------

  initParticles() {
    const canvas = document.getElementById("bg-particles");
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let particles = [];
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const COUNT = Math.min(70, Math.floor((window.innerWidth * window.innerHeight) / 22000));
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.6 + 0.6
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0,229,255,0.55)";
      particles.forEach(p => {
        if (!reduceMotion) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.strokeStyle = "rgba(0,229,255,0.08)";
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      if (!reduceMotion) requestAnimationFrame(draw);
    };
    draw();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new UIController();
});

const response = await fetch("http://localhost:5000/api/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password })
});
const { data } = await response.json();