import { describe, it, expect } from "vitest";
import { toolRegistry, TOOL_DEFINITIONS } from "../toolRegistry.js";

describe("PulseAgent Tool Registry & Declarations", () => {
  it("registers all 7 core tools", () => {
    expect(TOOL_DEFINITIONS.length).toBe(7);
    const names = TOOL_DEFINITIONS.map((t) => t.name);
    expect(names).toContain("get_organization_metrics");
    expect(names).toContain("list_teams");
    expect(names).toContain("diagnose_team_health");
    expect(names).toContain("dispatch_adaptive_survey");
    expect(names).toContain("trigger_manager_action_brief");
    expect(names).toContain("send_emergency_notification");
    expect(names).toContain("simulate_and_handle_failure");
  });

  it("retrieves a tool by name", () => {
    const tool = toolRegistry.getTool("diagnose_team_health");
    expect(tool).toBeDefined();
    expect(tool.name).toBe("diagnose_team_health");
    expect(typeof tool.handler).toBe("function");
  });

  it("generates valid Gemini function declarations with uppercase types", () => {
    const declarations = toolRegistry.getGeminiFunctionDeclarations();
    expect(declarations.length).toBe(7);

    declarations.forEach((decl) => {
      expect(decl.name).toBeDefined();
      expect(decl.description).toBeDefined();
      expect(decl.parameters.type).toBe("OBJECT");
      expect(decl.parameters.properties).toBeDefined();
      // Verify organization_id is NOT exposed to LLM (injected by host)
      expect(decl.parameters.properties.organization_id).toBeUndefined();
      if (decl.parameters.required) {
        expect(decl.parameters.required).not.toContain("organization_id");
      }
    });
  });
});
