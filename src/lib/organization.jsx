import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { useAuth } from "./auth";

const OrganizationContext = createContext(null);

const STORAGE_ACTIVE_ORG_KEY = "peoplepulse_active_org_id";

export function OrganizationProvider({ children }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [activeOrganization, setActiveOrganization] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState({ used: 0, limit: 10 });
  const [seatUsage, setSeatUsage] = useState({ used: 0, max: 10 });
  const [teamUsage, setTeamUsage] = useState({ used: 0, max: 1 });

  // Fetch all organizations the authenticated user belongs to
  const fetchOrganizations = useCallback(async () => {
    if (!user || !supabase || !isSupabaseConfigured) {
      setOrganizations([]);
      setActiveOrganization(null);
      setActiveRole(null);
      setLoading(false);
      return [];
    }

    try {
      setLoading(true);
      const { data: memberRows, error } = await supabase
        .from("organization_members")
        .select(`
          organization_id,
          role,
          is_active,
          organizations (
            id,
            name,
            slug,
            plan,
            subscription_status,
            max_seats,
            max_teams,
            created_at
          )
        `)
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) {
        console.error("[Organization] Error fetching memberships:", error.message);
        setLoading(false);
        return [];
      }

      const orgs = (memberRows || [])
        .filter((row) => row.organizations != null)
        .map((row) => ({
          ...row.organizations,
          role: row.role,
        }));

      setOrganizations(orgs);

      // Determine active organization:
      // Check localStorage preference first, or default to first organization
      const savedOrgId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_ACTIVE_ORG_KEY) : null;
      let matchedOrg = orgs.find((o) => o.id === savedOrgId) || orgs[0] || null;

      setActiveOrganization(matchedOrg);
      setActiveRole(matchedOrg?.role || null);

      if (matchedOrg) {
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_ACTIVE_ORG_KEY, matchedOrg.id);
        }
        await fetchUsageAndLimits(matchedOrg.id, matchedOrg);
      }

      setLoading(false);
      return orgs;
    } catch (err) {
      console.error("[Organization] Unexpected fetch error:", err);
      setLoading(false);
      return [];
    }
  }, [user]);

  // Fetch quota, seat, and team counts for the active organization
  const fetchUsageAndLimits = async (orgId, orgObj) => {
    if (!supabase || !orgId) return;
    try {
      // 1. Member / Seat count
      const { count: memberCount } = await supabase
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("is_active", true);

      // 2. Team count
      const { count: teamCount } = await supabase
        .from("teams")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId);

      // 3. Current month AI usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const periodMonth = startOfMonth.toISOString().slice(0, 10);

      const { data: usageRow } = await supabase
        .from("organization_usage")
        .select("ai_analyses_count")
        .eq("organization_id", orgId)
        .eq("period_month", periodMonth)
        .maybeSingle();

      setSeatUsage({
        used: memberCount || 0,
        max: orgObj?.max_seats || 10,
      });

      setTeamUsage({
        used: teamCount || 0,
        max: orgObj?.max_teams || 1,
      });

      setUsage({
        used: usageRow?.ai_analyses_count || 0,
        limit: orgObj?.plan === "free" ? 10 : null,
      });
    } catch (err) {
      console.warn("[Organization] Limits lookup error:", err.message);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Switch to another authorized organization
  const switchOrganization = async (orgId) => {
    const target = organizations.find((o) => o.id === orgId);
    if (!target) {
      console.warn("[Organization] Cannot switch: User is not an active member of organization", orgId);
      return;
    }
    setActiveOrganization(target);
    setActiveRole(target.role);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_ACTIVE_ORG_KEY, target.id);
    }
    await fetchUsageAndLimits(target.id, target);
  };

  // Onboard a new organization via RPC
  const createOrganization = async (name, slug) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data, error } = await supabase.rpc("create_organization_with_owner", {
      p_name: name,
      p_slug: slug,
    });
    if (error) throw error;
    await fetchOrganizations();
    return data;
  };

  // Send invitation via RPC
  const sendInvitation = async ({ email, role, teamId }) => {
    if (!supabase || !activeOrganization) throw new Error("Active organization is required.");
    const { data, error } = await supabase.rpc("create_org_invitation", {
      p_organization_id: activeOrganization.id,
      p_email: email,
      p_role: role,
      p_team_id: teamId || null,
    });
    if (error) throw error;
    return data;
  };

  // Accept invitation via RPC
  const acceptInvitation = async (token) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data, error } = await supabase.rpc("accept_org_invitation", {
      p_token: token,
    });
    if (error) throw error;
    await fetchOrganizations();
    return data;
  };

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        activeOrganization,
        activeOrganizationId: activeOrganization?.id || null,
        activeRole,
        plan: activeOrganization?.plan || "free",
        subscriptionStatus: activeOrganization?.subscription_status || "active",
        seatUsage,
        teamUsage,
        usage,
        loading,
        switchOrganization,
        refreshOrganization: fetchOrganizations,
        createOrganization,
        sendInvitation,
        acceptInvitation,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}
export default useOrganization;
