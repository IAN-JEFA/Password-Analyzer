/* ============================================================
   apiClient.js
   Thin wrapper around the CIPHERLOCK backend REST API.
   Every method throws on failure (network error, validation
   error, backend down) — callers decide whether to fall back
   to the in-browser engines or surface the error.
   ============================================================ */

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async request(path, options = {}) {
    let response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options
      });
    } catch (networkErr) {
      throw new Error("Could not reach the CIPHERLOCK backend. Is it running?");
    }

    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const body = await response.json();
        if (body && body.error) message = body.error;
      } catch { /* response wasn't JSON — keep the generic message */ }
      throw new Error(message);
    }
    return response.json();
  }

  async health() {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) throw new Error("Backend health check failed.");
    return res.json();
  }

  async analyze(password) {
    const json = await this.request("/api/analyze", {
      method: "POST",
      body: JSON.stringify({ password })
    });
    return json.data;
  }

  async generate(strategy, opts = {}) {
    const json = await this.request("/api/generate", {
      method: "POST",
      body: JSON.stringify({ strategy, ...opts })
    });
    return json.data;
  }

  async breachCheck(password) {
    const json = await this.request("/api/breach-check", {
      method: "POST",
      body: JSON.stringify({ password })
    });
    return json.data;
  }

  async analytics() {
    const json = await this.request("/api/analytics");
    return json.data;
  }

  /** Returns a Blob (the PDF) — caller is responsible for triggering the download. */
  async downloadReport(payload) {
    let response;
    try {
      response = await fetch(`${this.baseUrl}/api/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch {
      throw new Error("Could not reach the CIPHERLOCK backend. Is it running?");
    }
    if (!response.ok) {
      let message = "Report generation failed.";
      try {
        const body = await response.json();
        if (body && body.error) message = body.error;
      } catch { /* not JSON */ }
      throw new Error(message);
    }
    return response.blob();
  }
}

// Configurable without touching this file — see the inline <script> in index.html.
const CIPHERLOCK_API_BASE_URL = window.CIPHERLOCK_API_BASE_URL || "http://localhost:5000";
const cipherlockApi = new ApiClient(CIPHERLOCK_API_BASE_URL);
