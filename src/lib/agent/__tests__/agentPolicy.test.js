import { describe, it, expect } from "vitest";
import { validateTenantScope, authorizeToolExecution } from "../agentPolicy.js";
import { TOOL_RISK_LEVELS } from "../agentTypes.js";

describe("PulseAgent Policy & Tenant Isolation", () => {
  const activeOrgId = "11111111-1111-1111-1111-111111111111";
  const otherOrgId = "22222222-2222-2222-2222-222222222222";

  describe("validateTenantScope", () => {
    it("permits access when requested org matches active org", () => {
      const res = validateTenantScope(activeOrgId, activeOrgId);
      expect(res.valid).toBe(true);
      expect(res.scopedOrgId).toBe(activeOrgId);
    });

    it("blocks cross-tenant access when requested org differs from active org", () => {
      const res = validateTenantScope(activeOrgId, otherOrgId);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Cross-tenant access prohibited");
    });

    it("fails when no active organization is present in session", () => {
      const res = validateTenantScope(null, activeOrgId);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("No active organization resolved");
    });
  });

  describe("authorizeToolExecution", () => {
    const mockUser = { id: "usr_123", email: "manager@company.com" };
    const managerTool = {
      name: "diagnose_team_health",
      permission: "manager",
      risk: TOOL_RISK_LEVELS.READ,
      requiresConfirmation: false,
    };
    const adminTool = {
      name: "delete_team",
      permission: "admin",
      risk: TOOL_RISK_LEVELS.DESTRUCTIVE,
      requiresConfirmation: true,
    };

    it("allows manager role to run manager tool", () => {
      const auth = authorizeToolExecution({
        user: mockUser,
        role: "manager",
        tool: managerTool,
        activeOrgId,
        args: { organization_id: activeOrgId },
      });
      expect(auth.authorized).toBe(true);
      expect(auth.requiresConfirmation).toBe(false);
    });

    it("blocks employee role from running manager-restricted tool", () => {
      const auth = authorizeToolExecution({
        user: mockUser,
        role: "employee",
        tool: managerTool,
        activeOrgId,
        args: { organization_id: activeOrgId },
      });
      expect(auth.authorized).toBe(false);
      expect(auth.reason).toContain("Insufficient permissions");
    });

    it("flags requiresConfirmation for destructive actions", () => {
      const auth = authorizeToolExecution({
        user: mockUser,
        role: "admin",
        tool: adminTool,
        activeOrgId,
        args: { organization_id: activeOrgId },
      });
      expect(auth.authorized).toBe(true);
      expect(auth.requiresConfirmation).toBe(true);
      expect(auth.confirmationMessage).toBeDefined();
    });

    it("blocks unauthenticated callers", () => {
      const auth = authorizeToolExecution({
        user: null,
        role: "admin",
        tool: managerTool,
        activeOrgId,
        args: { organization_id: activeOrgId },
      });
      expect(auth.authorized).toBe(false);
      expect(auth.reason).toContain("Authentication required");
    });
  });
});
