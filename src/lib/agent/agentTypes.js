/**
 * PeoplePulse — PulseAgent Type Definitions & System Constants
 */

export const AGENT_EVENT_TYPES = {
  GOAL: "goal",
  DECISION: "decision",
  TOOL_START: "tool_start",
  TOOL_RESULT: "tool_result",
  OBSERVATION: "observation",
  EVALUATION: "evaluation",
  ADAPTATION: "adaptation",
  CONFIRMATION_REQUIRED: "confirmation_required",
  FINAL: "final",
  ERROR: "error",
};

export const TOOL_RISK_LEVELS = {
  READ: "read",
  WRITE: "write",
  SENSITIVE: "sensitive",
  DESTRUCTIVE: "destructive",
};

export const ROLE_HIERARCHY = {
  owner: 4,
  admin: 3,
  manager: 2,
  employee: 1,
};

export const MAX_EXECUTION_STEPS = 8;
