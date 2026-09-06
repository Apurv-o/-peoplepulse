/**
 * PeoplePulse — PulseAgent Authorization & Tenant Isolation Policy
 */

import { ROLE_HIERARCHY, TOOL_RISK_LEVELS } from "./agentTypes.js";

/**
 * Validates tenant isolation and ensures target organization strictly matches active context.
 */
export function validateTenantScope(activeOrgId, requestedOrgId) {
  if (!activeOrgId) {
    return { valid: false, error: "No active organization resolved in user session." };
  }
  if (requestedOrgId && requestedOrgId !== activeOrgId) {
    return {
      valid: false,
      error: `Cross-tenant access prohibited. Active: ${activeOrgId}, Target: ${requestedOrgId}`,
    };
  }
  return { valid: true, scopedOrgId: activeOrgId };
}

/**
 * Authorizes user role against tool requirements.
 */
export function authorizeToolExecution({ user, role, tool, activeOrgId, args = {} }) {
  if (!user || !user.id) {
    return { authorized: false, reason: "Authentication required." };
  }

  const effectiveRole = (role || "employee").toLowerCase();

  // 1. Check Role Hierarchy vs Required Tool Permission
  const toolRequiredRole = (tool.permission || "admin").toLowerCase();
  const userRoleLevel = ROLE_HIERARCHY[effectiveRole] || 0;
  const requiredRoleLevel = ROLE_HIERARCHY[toolRequiredRole] || 3;

  if (userRoleLevel < requiredRoleLevel) {
    return {
      authorized: false,
      reason: `Insufficient permissions. Tool requires '${toolRequiredRole}' or higher. Your role: '${effectiveRole}'.`,
    };
  }

  // 2. Strict Tenant Scope Enforcement
  const tenantCheck = validateTenantScope(activeOrgId, args.organization_id);
  if (!tenantCheck.valid) {
    return { authorized: false, reason: tenantCheck.error };
  }

  // 3. Manager Scope Restriction: Can only act on assigned team
  if (effectiveRole === "manager" && tool.name === "diagnose_team_health") {
    // If manager has an assigned team, ensure target matches or defaults to their team
    if (args.team_id && user.team_id && args.team_id !== user.team_id) {
      return {
        authorized: false,
        reason: "Managers may only inspect health metrics for their assigned team.",
      };
    }
  }

  // 4. Human Confirmation Policy for Sensitive / Destructive Actions
  if (tool.requiresConfirmation || tool.risk === TOOL_RISK_LEVELS.DESTRUCTIVE) {
    return {
      authorized: true,
      requiresConfirmation: true,
      confirmationMessage: `Action '${tool.name}' requires explicit administrator confirmation before execution.`,
    };
  }

  return { authorized: true, requiresConfirmation: false };
}
