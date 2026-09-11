import { describe, it, expect } from "vitest";
import { sanitizePayload } from "../agentAudit.js";

describe("PulseAgent Audit & Secret Redactor", () => {
  it("redacts sensitive keys including api_key, password, token, secret", () => {
    const sensitive = {
      user_id: "123",
      api_key: "AIzaSySecretKey",
      password: "SuperSecretPassword123!",
      supabase_service_role: "eyJhbGciOi...",
      clean_field: "Safe observation text",
    };

    const sanitized = sanitizePayload(sensitive);
    expect(sanitized.api_key).toBe("[REDACTED]");
    expect(sanitized.password).toBe("[REDACTED]");
    expect(sanitized.supabase_service_role).toBe("[REDACTED]");
    expect(sanitized.clean_field).toBe("Safe observation text");
    expect(sanitized.user_id).toBe("123");
  });

  it("redacts bearer tokens and jwt strings in raw values", () => {
    const rawJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.signature_string_here_long_enough";
    const sanitized = sanitizePayload(rawJwt);
    expect(sanitized).toBe("[REDACTED_CREDENTIAL]");
  });

  it("handles nested arrays and deep objects safely", () => {
    const payload = {
      items: [
        { name: "Team 1", secret_token: "xyz123" },
        { name: "Team 2", normal: "ok" },
      ],
    };

    const sanitized = sanitizePayload(payload);
    expect(sanitized.items[0].secret_token).toBe("[REDACTED]");
    expect(sanitized.items[0].name).toBe("Team 1");
    expect(sanitized.items[1].normal).toBe("ok");
  });
});
