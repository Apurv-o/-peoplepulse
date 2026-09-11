/**
 * PeoplePulse — PulseAgent Activity Audit Store & Secret Redactor
 * Persists to Supabase `agent_activity_logs` table (migration 032)
 * with fast local cache for reactive UI and offline resilience.
 */

import { supabase } from "../supabase.js";

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
  async record({ organizationId, userId, userEmail, goal, tool, input, status, outcome, adaptation }) {
    if (!organizationId) return null;

    const sanitizedInput = sanitizePayload(input || {});
    const sanitizedGoal = sanitizePayload(goal || "Autonomous Task");
    const sanitizedOutcome = sanitizePayload(outcome || "");
    const sanitizedAdaptation = adaptation ? sanitizePayload(adaptation) : null;

    const record = {
      id: "act_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      organizationId,
      userId: userId || null,
      userEmail: userEmail || "anonymous",
      goal: sanitizedGoal,
      tool: tool || "orchestrator",
      input: sanitizedInput,
      status: status || "completed", // "started" | "completed" | "failed" | "adapted" | "blocked"
      outcome: sanitizedOutcome,
      adaptation: sanitizedAdaptation,
    };

    // 1. Update local reactive cache for immediate UI feedback
    try {
      if (typeof window !== "undefined") {
        const key = STORAGE_PREFIX + organizationId;
        const raw = localStorage.getItem(key);
        const list = raw ? JSON.parse(raw) : [];
        list.unshift(record);
        const trimmed = list.slice(0, 100);
        localStorage.setItem(key, JSON.stringify(trimmed));
        window.dispatchEvent(new CustomEvent("peoplepulse_agent_activity_update", { detail: record }));
      }
    } catch (e) {
      console.warn("[PulseAgent Audit] Local cache write notice:", e);
    }

    // 2. Persist directly to Supabase agent_activity_logs table (Migration 032)
    if (supabase) {
      try {
        const { error: dbErr } = await supabase
          .from("agent_activity_logs")
          .insert({
            organization_id: organizationId,
            user_id: userId && userId !== "system" ? userId : null,
            goal: typeof sanitizedGoal === "string" ? sanitizedGoal : JSON.stringify(sanitizedGoal),
            tool: tool || "orchestrator",
            status: ["started", "completed", "failed", "adapted", "blocked"].includes(status) ? status : "completed",
            input_sanitized: sanitizedInput,
            outcome: typeof sanitizedOutcome === "string" ? sanitizedOutcome : JSON.stringify(sanitizedOutcome),
            adaptation_details: sanitizedAdaptation,
          });

        if (dbErr) {
          console.warn("[PulseAgent Audit] Database persistence notice:", dbErr.message);
        }
      } catch (err) {
        console.warn("[PulseAgent Audit] Network persistence notice:", err);
      }
    }

    return record;
  },

  async getRecent(organizationId, limit = 30) {
    if (!organizationId) return [];

    // Attempt to load from authoritative database table first
    if (supabase) {
      try {
        const { data: dbLogs, error } = await supabase
          .from("agent_activity_logs")
          .select("id, organization_id, user_id, goal, tool, status, input_sanitized, outcome, adaptation_details, created_at")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (!error && Array.isArray(dbLogs) && dbLogs.length > 0) {
          return dbLogs.map((log) => ({
            id: log.id,
            timestamp: log.created_at,
            organizationId: log.organization_id,
            userId: log.user_id,
            goal: log.goal,
            tool: log.tool,
            input: log.input_sanitized,
            status: log.status,
            outcome: log.outcome,
            adaptation: log.adaptation_details,
          }));
        }
      } catch (e) {
        // Fall back to local cache if offline or unauthenticated
      }
    }

    // Fallback: load from local storage
    try {
      if (typeof window !== "undefined") {
        const key = STORAGE_PREFIX + organizationId;
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const list = JSON.parse(raw);
        return Array.isArray(list) ? list.slice(0, limit) : [];
      }
    } catch (e) {
      return [];
    }

    return [];
  },

  clear(organizationId) {
    if (typeof window === "undefined" || !organizationId) return;
    try {
      localStorage.removeItem(STORAGE_PREFIX + organizationId);
    } catch (e) {}
  },
};
