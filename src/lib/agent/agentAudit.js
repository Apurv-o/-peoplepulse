/**
 * PeoplePulse — PulseAgent Activity Audit Store & Secret Redactor
 */

const SECRET_PATTERNS = [
  /password/i,
  /access_token/i,
  /refresh_token/i,
  /api[_-]?key/i,
  /secret/i,
  /token/i,
  /bearer/i,
  /credentials/i,
  /supabase_service_role/i,
  /gemini/i,
  /smtp/i,
];

/**
 * Deeply sanitizes any input object to prevent credential leakage.
 */
export function sanitizePayload(payload) {
  if (payload === null || payload === undefined) return payload;

  if (typeof payload === "string") {
    // Mask potential token/secret strings
    if (payload.length > 40 && (payload.startsWith("eyJ") || payload.startsWith("sb_") || payload.includes("Bearer "))) {
      return "[REDACTED_CREDENTIAL]";
    }
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizePayload(item));
  }

  if (typeof payload === "object") {
    const clean = {};
    for (const [key, value] of Object.entries(payload)) {
      const isSensitiveKey = SECRET_PATTERNS.some((pattern) => pattern.test(key));
      if (isSensitiveKey) {
        clean[key] = "[REDACTED]";
      } else {
        clean[key] = sanitizePayload(value);
      }
    }
    return clean;
  }

  return payload;
}

const STORAGE_PREFIX = "peoplepulse_agent_audit_";

export const agentAudit = {
  record({ organizationId, userId, userEmail, goal, tool, input, status, outcome, adaptation }) {
    if (typeof window === "undefined" || !organizationId) return null;

    const record = {
      id: "act_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      organizationId,
      userId: userId || "system",
      userEmail: userEmail || "anonymous",
      goal: sanitizePayload(goal || "Autonomous Task"),
      tool: tool || "orchestrator",
      input: sanitizePayload(input || {}),
      status: status || "completed", // "started" | "completed" | "failed" | "adapted"
      outcome: sanitizePayload(outcome || ""),
      adaptation: adaptation ? sanitizePayload(adaptation) : null,
    };

    try {
      const key = STORAGE_PREFIX + organizationId;
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(record);
      // Retain max 100 historical logs per organization
      const trimmed = list.slice(0, 100);
      localStorage.setItem(key, JSON.stringify(trimmed));
      // Dispatch storage event for UI reactivity across tabs
      window.dispatchEvent(new CustomEvent("peoplepulse_agent_activity_update", { detail: record }));
    } catch (e) {
      console.warn("[PulseAgent Audit] Failed to persist activity record:", e);
    }

    return record;
  },

  getRecent(organizationId, limit = 20) {
    if (typeof window === "undefined" || !organizationId) return [];
    try {
      const key = STORAGE_PREFIX + organizationId;
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list.slice(0, limit) : [];
    } catch (e) {
      return [];
    }
  },

  clear(organizationId) {
    if (typeof window === "undefined" || !organizationId) return;
    try {
      localStorage.removeItem(STORAGE_PREFIX + organizationId);
    } catch (e) {}
  },
};
