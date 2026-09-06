/**
 * PeoplePulse — PulseAgent Tool Registry & Execution Dispatcher
 */

import { agentTools } from "./tools.js";
import { authorizeToolExecution } from "./agentPolicy.js";
import { agentAudit } from "./agentAudit.js";
import { TOOL_RISK_LEVELS } from "./agentTypes.js";

export const TOOL_DEFINITIONS = [
  {
    name: "get_organization_metrics",
    description: "Fetches live organization-level participation rates, active team counts, and average engagement scores.",
    permission: "admin",
    risk: TOOL_RISK_LEVELS.READ,
    requiresConfirmation: false,
    organizationScope: true,
    inputSchema: {
      type: "object",
      properties: {
        organization_id: { type: "string", description: "Target organization UUID" },
      },
      required: ["organization_id"],
    },
    handler: agentTools.get_organization_metrics,
  },
  {
    name: "diagnose_team_health",
    description: "Analyzes specific team metrics, burnout warning signs, and dimension scores across the past 60 days.",
    permission: "manager",
    risk: TOOL_RISK_LEVELS.READ,
    requiresConfirmation: false,
    organizationScope: true,
    inputSchema: {
      type: "object",
      properties: {
        organization_id: { type: "string", description: "Target organization UUID" },
        team_id: { type: "string", description: "Optional team UUID" },
        team_name: { type: "string", description: "Optional team name (e.g. Customer Success)" },
      },
      required: ["organization_id"],
    },
    handler: agentTools.diagnose_team_health,
  },
  {
    name: "dispatch_adaptive_survey",
    description: "Deploys a targeted follow-up pulse survey question into the organization survey registry.",
    permission: "admin",
    risk: TOOL_RISK_LEVELS.WRITE,
    requiresConfirmation: false,
    organizationScope: true,
    inputSchema: {
      type: "object",
      properties: {
        organization_id: { type: "string", description: "Target organization UUID" },
        question: { type: "string", description: "Survey question text" },
        reason: { type: "string", description: "Reason for question intervention" },
        team_id: { type: "string", description: "Optional target team UUID" },
      },
      required: ["organization_id", "question"],
    },
    handler: agentTools.dispatch_adaptive_survey,
  },
  {
    name: "trigger_manager_action_brief",
    description: "Generates an actionable 1:1 coaching brief and intervention recommendations for team leadership.",
    permission: "manager",
    risk: TOOL_RISK_LEVELS.READ,
    requiresConfirmation: false,
    organizationScope: true,
    inputSchema: {
      type: "object",
      properties: {
        organization_id: { type: "string", description: "Target organization UUID" },
        team_name: { type: "string", description: "Name of the target team" },
        context: { type: "string", description: "Contextual findings from diagnosis" },
      },
      required: ["organization_id"],
    },
    handler: agentTools.trigger_manager_action_brief,
  },
  {
    name: "simulate_and_handle_failure",
    description: "Demonstrates autonomous failure detection on primary notification endpoints and live fallback adaptation.",
    permission: "admin",
    risk: TOOL_RISK_LEVELS.READ,
    requiresConfirmation: false,
    organizationScope: true,
    inputSchema: {
      type: "object",
      properties: {
        organization_id: { type: "string", description: "Target organization UUID" },
        channel: { type: "string", description: "Delivery channel name to test" },
      },
      required: ["organization_id"],
    },
    handler: agentTools.simulate_and_handle_failure,
  },
];

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    TOOL_DEFINITIONS.forEach((t) => this.tools.set(t.name, t));
  }

  getTool(name) {
    return this.tools.get(name) || null;
  }

  getAllTools() {
    return Array.from(this.tools.values()).map(({ handler, ...meta }) => meta);
  }

  async execute(toolName, rawArgs = {}, context = {}) {
    const tool = this.getTool(toolName);
    if (!tool) {
      throw new Error(`Unknown tool '${toolName}'. Tool is not registered in the allowlisted registry.`);
    }

    const { user, activeOrganization, role } = context;
    const activeOrgId = activeOrganization?.id;

    // Strict Tenant Scoping: enforce active organization ID
    const scopedArgs = {
      ...rawArgs,
      organization_id: activeOrgId,
    };

    // Pre-Execution Authorization Check
    const authCheck = authorizeToolExecution({
      user,
      role,
      tool,
      activeOrgId,
      args: scopedArgs,
    });

    if (!authCheck.authorized) {
      agentAudit.record({
        organizationId: activeOrgId,
        userId: user?.id,
        userEmail: user?.email,
        tool: toolName,
        input: scopedArgs,
        status: "blocked",
        outcome: authCheck.reason,
      });
      throw new Error(`Authorization failed: ${authCheck.reason}`);
    }

    // Execute real tool handler
    try {
      const result = await tool.handler(scopedArgs);

      // Record in safe audit store
      agentAudit.record({
        organizationId: activeOrgId,
        userId: user?.id,
        userEmail: user?.email,
        tool: toolName,
        input: scopedArgs,
        status: "completed",
        outcome: typeof result === "object" ? JSON.stringify(result).slice(0, 300) : String(result),
      });

      return result;
    } catch (err) {
      agentAudit.record({
        organizationId: activeOrgId,
        userId: user?.id,
        userEmail: user?.email,
        tool: toolName,
        input: scopedArgs,
        status: "failed",
        outcome: err.message,
      });
      throw err;
    }
  }
}

export const toolRegistry = new ToolRegistry();
