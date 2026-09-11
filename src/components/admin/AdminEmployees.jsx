import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "../../lib/auth";
import { useOrganization } from "../../lib/organization";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { calculateEngagementScore } from "../../lib/engagementScoring";
import { getCurrentWeekMonday, formatWeekLabel, getTodayDate, getCurrentWeekSaturday, getSaturdayCycleRange } from "../../lib/dateUtils";

import { T, Card, ToggleSwitch, RiskBadge, Avatar, Delta, Sparkline, AIInsightCard, KPICard, Dropdown, RatingSelector, ToggleRow } from "../ui";

import {
  Home, MessageSquare, TrendingUp, Users, UserPlus, Layers, ListChecks, UploadCloud,
  Settings, Bell, ChevronDown, Lock, ArrowRight, Search, Menu, X, Sparkles,
  ArrowUp, ArrowDown, ShieldCheck, Check, LogOut, ArrowLeft, Copy, Building2, Plus, AlertCircle,
  RotateCw, Trash2, Link2, Send, Eye, EyeOff, Mail, ExternalLink, UserX, AlertTriangle, FileText, Download,
  Activity, Calendar, Clock, Heart, Award, Bot, Save, RefreshCw, CheckCircle2, ChevronRight, HelpCircle
} from "lucide-react";

import Topbar from "../layout/Topbar";
import EmployeeDailyHistoryModal from "../modals/EmployeeDailyHistoryModal";
import {
  buildInviteLink,
  buildInviteEmailDetails,
  triggerEmailApp,
  triggerGmailWeb,
  dispatchInviteEmailViaBackend,
} from "../../lib/inviteUtils";

export default function AdminEmployees({ setMobileOpen }) {
  const {
    activeOrganizationId,
    activeOrganization,
    sendInvitation,
    resendInvitation,
    revokeInvitation,
    seatUsage,
    fetchOrganizations,
  } = useOrganization();
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamMemberships, setTeamMemberships] = useState({});
  const [assigningUserId, setAssigningUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState(null);

  // Invite modal form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("employee");
  const [inviteTeamId, setInviteTeamId] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [generatedInviteLink, setGeneratedInviteLink] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [autoSendEmail, setAutoSendEmail] = useState(true);
  const [copiedEmailText, setCopiedEmailText] = useState(false);
  const [emailDispatchedNotice, setEmailDispatchedNotice] = useState(null);

  // Actions state
  const [resendingInviteId, setResendingInviteId] = useState(null);
  const [revokingInviteId, setRevokingInviteId] = useState(null);
  const [copiedInviteId, setCopiedInviteId] = useState(null);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  const loadData = useCallback(async () => {
    if (!supabase || !activeOrganizationId) return;
    setLoading(true);
    try {
      // 1. Fetch active members with profile data
      const { data: mData, error: mErr } = await supabase
        .from("organization_members")
        .select(`
          id,
          role,
          employee_id,
          joined_at,
          user_id,
          profiles (
            id,
            name,
            email,
            employee_id
          )
        `)
        .eq("organization_id", activeOrganizationId)
        .eq("is_active", true);

      if (mErr) console.error("Error loading members:", mErr.message);

      // 2. Fetch pending invitations
      const { data: iData, error: iErr } = await supabase
        .from("invitations")
        .select("*")
        .eq("organization_id", activeOrganizationId)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (iErr) console.warn("Notice: invitations query:", iErr.message);

      // 3. Fetch teams for assignment
      const { data: tData } = await supabase
        .from("teams")
        .select("id, name, manager_id")
        .eq("organization_id", activeOrganizationId)
        .order("name", { ascending: true });

      // 4. Fetch team memberships
      const { data: tmData } = await supabase
        .from("team_members")
        .select("user_id, team_id");

      const tmMap = {};
      (tmData || []).forEach((tm) => {
        tmMap[tm.user_id] = tm.team_id;
      });
      (tData || []).forEach((t) => {
        if (t.manager_id && !tmMap[t.manager_id]) {
          tmMap[t.manager_id] = t.id;
        }
      });

      setMembers(mData || []);
      setInvitations(iData || []);
      setTeams(tData || []);
      setTeamMemberships(tmMap);
    } catch (err) {
      console.error("[AdminEmployees] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [activeOrganizationId]);

  useEffect(() => {
    loadData();

    if (!supabase || !activeOrganizationId) return;

    // Real-time Postgres changes subscription on invitations and members
    const channel = supabase
      .channel(`admin-employees-live-${activeOrganizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "invitations",
          filter: `organization_id=eq.${activeOrganizationId}`,
        },
        () => {
          loadData();
          fetchOrganizations?.();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "organization_members",
          filter: `organization_id=eq.${activeOrganizationId}`,
        },
        () => {
          loadData();
          fetchOrganizations?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrganizationId, loadData, fetchOrganizations]);

  const handleResendInvite = async (inv) => {
    setResendingInviteId(inv.id);
    setActionNotice(null);
    try {
      const res = await resendInvitation(inv.id);
      if (res?.token) {
        const assignedTeam = teams.find((t) => t.id === inv.team_id);
        const link = buildInviteLink({
          token: res.token,
          email: inv.email,
          orgName: activeOrganization?.name,
          role: inv.role,
          teamName: assignedTeam?.name,
        });
        await navigator.clipboard.writeText(link);
        setCopiedInviteId(inv.id);
        setActionNotice({
          type: "success",
          text: `Invite link renewed & copied to clipboard for ${inv.email}! Valid for 7 days.`,
        });
        setTimeout(() => setCopiedInviteId(null), 3500);
      } else {
        setActionNotice({
          type: "success",
          text: `Invitation renewed for ${inv.email}!`,
        });
      }
      await loadData();
    } catch (err) {
      console.error("[handleResendInvite] error:", err);
      setActionNotice({
        type: "error",
        text: err.message || "Failed to resend invitation.",
      });
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleEmailPendingInvite = async (inv) => {
    setResendingInviteId(inv.id);
    setActionNotice(null);
    const trimmed = (inv?.email || "").trim().toLowerCase();
    try {
      const res = await resendInvitation(inv.id);
      if (res?.token) {
        const assignedTeam = teams.find((t) => t.id === inv.team_id);
        const link = buildInviteLink({
          token: res.token,
          email: inv.email,
          orgName: activeOrganization?.name,
          role: inv.role,
          teamName: assignedTeam?.name,
        });
        await navigator.clipboard.writeText(link);
        // 1. Attempt automatic backend dispatch via Resend
        const emailRes = await dispatchInviteEmailViaBackend({
          email: trimmed,
          link,
          role: inv.role,
          orgName: activeOrganization?.name,
          teamName: assignedTeam?.name,
        });

        if (emailRes?.status === "sent") {
          setActionNotice({
            type: "success",
            text: `Invitation resent directly to ${trimmed} via Resend! Link also copied to clipboard.`,
          });
        } else {
          // Fallback to mail app
          if (trimmed.toLowerCase().endsWith("@gmail.com")) {
            triggerGmailWeb({
              email: trimmed,
              link,
              role: inv.role,
              orgName: activeOrganization?.name,
            });
          } else {
            triggerEmailApp({
              email: trimmed,
              link,
              role: inv.role,
              orgName: activeOrganization?.name,
            });
          }
          setActionNotice({
            type: "success",
            text: `Invitation link copied! Mail compose opened for ${trimmed}.`,
          });
        }
      } else {
        setActionNotice({
          type: "success",
          text: `Invitation renewed for ${inv.email}!`,
        });
      }
      await loadData();
    } catch (err) {
      console.error("[handleEmailPendingInvite] error:", err);
      setActionNotice({
        type: "error",
        text: err.message || "Failed to dispatch email for invitation.",
      });
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleRevokeInvite = async (inv) => {
    if (!window.confirm(`Are you sure you want to cancel the pending invitation for ${inv.email}?`)) {
      return;
    }
    setRevokingInviteId(inv.id);
    setActionNotice(null);
    try {
      await revokeInvitation(inv.id);
      setActionNotice({
        type: "success",
        text: `Invitation for ${inv.email} has been revoked.`,
      });
      await loadData();
      fetchOrganizations?.();
    } catch (err) {
      console.error("[handleRevokeInvite] error:", err);
      setActionNotice({
        type: "error",
        text: err.message || "Failed to revoke invitation.",
      });
    } finally {
      setRevokingInviteId(null);
    }
  };

  const cleanInviteEmail = inviteEmail.trim().toLowerCase();
  const isExistingMember = Boolean(
    cleanInviteEmail &&
    members.some((m) => (m.profiles?.email || "").trim().toLowerCase() === cleanInviteEmail)
  );
  const existingPendingInvite = cleanInviteEmail
    ? invitations.find(
        (i) => (i.email || "").trim().toLowerCase() === cleanInviteEmail && !i.accepted_at
      )
    : null;

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setInviteError(null);
    setEmailDispatchedNotice(null);

    const trimmedEmail = inviteEmail.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setInviteError("Please enter a valid email address.");
      return;
    }

    if (isExistingMember) {
      setInviteError("This user is already an active member of this organization. Duplicate accounts or memberships are not permitted.");
      return;
    }

    setInviteLoading(true);
    try {
      const res = await sendInvitation({
        email: trimmedEmail,
        role: inviteRole,
        teamId: inviteTeamId || null,
      });

      if (res?.token) {
        const teamObj = teams.find((t) => t.id === inviteTeamId);
        const link = buildInviteLink({
          token: res.token,
          email: trimmedEmail,
          orgName: activeOrganization?.name,
          role: inviteRole,
          teamName: teamObj?.name,
        });
        setGeneratedInviteLink(link);

        // Attempt automated delivery via backend Edge Function (Brevo / Resend)
        const emailRes = await dispatchInviteEmailViaBackend({
          email: trimmedEmail,
          link,
          role: inviteRole,
          orgName: activeOrganization?.name,
          teamName: teamObj?.name,
        });

        if (emailRes?.status === "sent") {
          const providerName = emailRes?.provider === "brevo" ? "Brevo" : "Resend";
          setEmailDispatchedNotice(`Invitation email sent automatically to ${trimmedEmail} via ${providerName}!`);
        } else {
          setEmailDispatchedNotice("Invitation created! You can copy the link below or send via your email client.");
        }
      }
      await loadData();
      fetchOrganizations?.();
    } catch (err) {
      setInviteError(err.message || "Failed to create invitation.");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyEmailText = async () => {
    if (!generatedInviteLink) return;
    const { subject, body } = buildInviteEmailDetails({
      email: inviteEmail.trim(),
      link: generatedInviteLink,
      role: inviteRole,
      orgName: activeOrganization?.name,
    });
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopiedEmailText(true);
    setTimeout(() => setCopiedEmailText(false), 2500);
  };

  const handleCopyLinkOnly = async () => {
    if (!generatedInviteLink) return;
    await navigator.clipboard.writeText(generatedInviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleAssignTeam = async (userId, newTeamId) => {
    setAssigningUserId(userId);
    try {
      const orgTeamIds = teams.map((t) => t.id);
      if (orgTeamIds.length > 0) {
        await supabase
          .from("team_members")
          .delete()
          .eq("user_id", userId)
          .in("team_id", orgTeamIds);
      }
      if (newTeamId) {
        await supabase.from("team_members").insert({
          team_id: newTeamId,
          user_id: userId,
        });
      }
      setTeamMemberships((prev) => ({
        ...prev,
        [userId]: newTeamId || null,
      }));
    } catch (err) {
      console.error("[handleAssignTeam] error:", err);
    } finally {
      setAssigningUserId(null);
    }
  };

  const handleRemoveMember = async (m) => {
    const p = m.profiles || {};
    const memberName = p.name || p.email || "this member";
    if (m.role === "owner") {
      alert("The organization owner cannot be removed.");
      return;
    }
    if (
      !window.confirm(
        `Are you sure you want to remove ${memberName} (${p.email || m.user_id}) from ${activeOrganization?.name || "this organization"}?\n\nThey will immediately lose access and their seat will be freed.`
      )
    ) {
      return;
    }

    setRemovingMemberId(m.id);
    setActionNotice(null);
    try {
      // 1. Try secure RPC remove_org_member first
      let removedViaRpc = false;
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc("remove_org_member", {
          p_org_id: activeOrganizationId,
          p_user_id: m.user_id,
        });
        if (!rpcErr && rpcData?.success) {
          removedViaRpc = true;
        }
      } catch (e) {
        // Fall back to direct table deletion
      }

      // 2. Fallback: direct table operations
      if (!removedViaRpc) {
        const orgTeamIds = teams.map((t) => t.id);
        if (orgTeamIds.length > 0 && m.user_id) {
          await supabase
            .from("team_members")
            .delete()
            .eq("user_id", m.user_id)
            .in("team_id", orgTeamIds);
        }

        const { error: delErr } = await supabase
          .from("organization_members")
          .delete()
          .eq("id", m.id);

        if (delErr) throw delErr;
      }

      setActionNotice({
        type: "success",
        text: `${memberName} has been removed from ${activeOrganization?.name || "the organization"}. 1 seat freed.`,
      });

      await loadData();
      fetchOrganizations?.();
    } catch (err) {
      console.error("[handleRemoveMember] error:", err);
      setActionNotice({
        type: "error",
        text: err.message || "Failed to remove member.",
      });
    } finally {
      setRemovingMemberId(null);
    }
  };

  const filteredMembers = members.filter((m) => {
    const p = m.profiles || {};
    const empId = (m.employee_id || p.employee_id || "").toLowerCase();
    const term = searchTerm.toLowerCase();
    const nameMatch = (p.name || "").toLowerCase().includes(term) ||
                      (p.email || "").toLowerCase().includes(term) ||
                      empId.includes(term);
    const roleMatch = roleFilter === "all" || m.role === roleFilter;
    return nameMatch && roleMatch;
  });

  return (
    <div>
      <Topbar
        title="Organization Members"
        subtitle={`${members.length} active seat(s) used of ${seatUsage.max} allowed.`}
        setMobileOpen={setMobileOpen}
        right={
          <button
            onClick={() => {
              setInviteEmail("");
              setInviteRole("employee");
              setInviteTeamId("");
              setInviteError(null);
              setGeneratedInviteLink(null);
              setCopiedLink(false);
              setCopiedEmailText(false);
              setEmailDispatchedNotice(null);
              setShowInviteModal(true);
            }}
            className="text-sm font-semibold text-white px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition-all hover:opacity-90"
            style={{ background: T.primary }}
          >
            <UserPlus size={15} /> Invite Member
          </button>
        }
      />

      {/* Invite Member Modal - Portaled to document.body for full viewport coverage */}
      {showInviteModal && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowInviteModal(false);
          }}
        >
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative modal-dialog border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: T.text }}>Invite Team Member</h3>
                  <p className="text-[11px] text-gray-500">Add a coworker to your organization workspace</p>
                </div>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {generatedInviteLink ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                    <Check size={14} className="text-emerald-600 shrink-0" />
                    <span>Invitation Created Successfully!</span>
                  </div>
                  <p className="text-emerald-700 leading-relaxed text-[11px]">
                    Single-use invite link is ready for <b className="text-emerald-900">{inviteEmail}</b>. Link expires automatically in 7 days.
                  </p>
                </div>

                {emailDispatchedNotice && (
                  <div className="p-3.5 rounded-xl bg-blue-50/90 border border-blue-200 text-blue-900 text-xs flex items-center gap-2.5">
                    <Mail size={16} className="text-blue-600 shrink-0" />
                    <span className="font-semibold text-xs leading-relaxed">{emailDispatchedNotice}</span>
                  </div>
                )}

                {/* Direct Link & Copy */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-700">Invitation Link</label>
                    <span className="text-[10px] text-gray-400">Shareable backup link</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl border bg-gray-50" style={{ borderColor: T.border }}>
                    <input
                      type="text"
                      readOnly
                      value={generatedInviteLink}
                      className="text-xs bg-transparent w-full outline-none text-gray-700 select-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLinkOnly}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white shrink-0 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      style={{ background: T.primary }}
                    >
                      {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                      {copiedLink ? "Copied!" : "Copy Link"}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="w-full mt-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm hover:opacity-95 cursor-pointer"
                  style={{ background: T.primary }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-4">
                {inviteError && (
                  <div className="p-3 rounded-xl text-xs bg-red-50 text-red-700 border border-red-200 flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{inviteError}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: T.text }}>Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      if (inviteError) setInviteError(null);
                    }}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 bg-white"
                    style={{ borderColor: isExistingMember ? "#F59E0B" : T.border }}
                  />
                  {isExistingMember && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 animate-in fade-in">
                      <AlertCircle size={14} className="text-amber-600 shrink-0" />
                      <span>This user is already an active member of this organization.</span>
                    </div>
                  )}
                  {existingPendingInvite && !isExistingMember && (
                    <div className="mt-2 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between gap-2 animate-in fade-in">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertCircle size={14} className="text-blue-600 shrink-0" />
                        <span className="truncate">A pending invite already exists for this email.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowInviteModal(false);
                          handleResendInvite(existingPendingInvite);
                        }}
                        className="shrink-0 text-[11px] font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                      >
                        Renew Invite →
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold block mb-1.5" style={{ color: T.text }}>Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border text-sm outline-none bg-white cursor-pointer"
                      style={{ borderColor: T.border }}
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1.5" style={{ color: T.text }}>Assign Team (Optional)</label>
                    <select
                      value={inviteTeamId}
                      onChange={(e) => setInviteTeamId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border text-sm outline-none bg-white cursor-pointer"
                      style={{ borderColor: T.border }}
                    >
                      <option value="">No team yet</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500">
                  Invitations include a 1-click joining link with pre-filled default password. Delivered via Resend.
                </p>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold border text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    style={{ borderColor: T.border }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteLoading || isExistingMember}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all hover:shadow-md cursor-pointer"
                    style={{ background: T.primary }}
                  >
                    {inviteLoading ? (
                      <>
                        <RotateCw size={14} className="animate-spin" />
                        <span>Preparing Email...</span>
                      </>
                    ) : (
                      <span>Send Invite &amp; Generate Link &rarr;</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {actionNotice && (
        <div
          className={`mb-4 p-3 text-xs flex items-center justify-between rounded-xl border ${
            actionNotice.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === "success" ? (
              <Check size={14} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={14} className="text-red-600 shrink-0" />
            )}
            <span>{actionNotice.text}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      <Card padded={false} className="overflow-hidden mb-6">
        <div className="p-4 flex flex-wrap gap-2 border-b" style={{ borderColor: T.border }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 min-w-[180px]" style={{ borderColor: T.border }}>
            <Search size={14} style={{ color: T.muted }} />
            <input
              placeholder="Search members by name, email, or employee ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-sm outline-none w-full bg-transparent"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 rounded-lg border bg-white outline-none cursor-pointer"
            style={{ borderColor: T.border }}
          >
            <option value="all">All Roles</option>
            <option value="owner">Owners</option>
            <option value="admin">Admins</option>
            <option value="manager">Managers</option>
            <option value="employee">Employees</option>
          </select>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-270px)] min-h-[380px] table-scrollbar">
          <table className="w-full text-sm min-w-[1060px] border-collapse">
            <thead className="sticky top-0 z-20 shadow-xs" style={{ background: "#FAFAF9" }}>
              <tr className="text-left border-b" style={{ borderColor: T.border, color: T.muted }}>
                <th className="px-4 py-3 font-semibold text-xs whitespace-nowrap min-w-[240px]">Member</th>
                <th className="px-4 py-3 font-semibold text-xs whitespace-nowrap min-w-[130px]">Employee ID</th>
                <th className="px-4 py-3 font-semibold text-xs whitespace-nowrap min-w-[110px]">Role</th>
                <th className="px-4 py-3 font-semibold text-xs whitespace-nowrap min-w-[190px]">Assigned Team</th>
                <th className="px-4 py-3 font-semibold text-xs whitespace-nowrap min-w-[90px]">Status</th>
                <th className="px-4 py-3 font-semibold text-xs whitespace-nowrap min-w-[110px]">Joined</th>
                <th className="px-4 py-3 font-semibold text-xs whitespace-nowrap min-w-[200px] text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => {
                const p = m.profiles || {};
                const isRemoving = removingMemberId === m.id;
                const isOwner = m.role === "owner";

                return (
                  <tr key={m.id} className="border-t hover:bg-gray-50 transition-colors" style={{ borderColor: T.border }}>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedEmployeeForHistory(m)}
                        className="text-left group flex items-center gap-3 w-full cursor-pointer focus:outline-none"
                        title="Click to view daily form check-ins & stress tracking"
                      >
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/20 text-[#4E6ABF] border border-blue-200/50 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 group-hover:border-blue-400 group-hover:shadow-xs transition-all">
                          {((p.name || "TM").slice(0, 2)).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm group-hover:text-blue-600 transition-colors flex items-center gap-1.5" style={{ color: T.text }}>
                            <span className="hover:underline underline-offset-2">{p.name || "Team Member"}</span>
                            <ExternalLink size={12} className="opacity-30 group-hover:opacity-100 text-blue-500 shrink-0 transition-opacity" />
                          </p>
                          <p className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors truncate">{p.email || m.user_id}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {m.employee_id || p.employee_id ? (
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded border bg-slate-50 text-slate-700 border-slate-200 inline-flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 select-none">#</span>
                          {m.employee_id || p.employee_id}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic font-mono">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`capitalize font-medium text-xs px-2.5 py-1 rounded-full ${
                        m.role === "owner" ? "bg-purple-50 text-purple-700" :
                        m.role === "admin" ? "bg-indigo-50 text-indigo-700" :
                        m.role === "manager" ? "bg-blue-50 text-blue-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {m.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {m.role === "owner" ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                          All Teams (Admin)
                        </span>
                      ) : (
                        <select
                          disabled={assigningUserId === m.user_id || isRemoving}
                          value={teamMemberships[m.user_id] || ""}
                          onChange={(e) => handleAssignTeam(m.user_id, e.target.value)}
                          className="text-xs border rounded-lg px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[170px] truncate"
                          style={{ borderColor: T.border, color: teamMemberships[m.user_id] ? T.text : T.muted }}
                        >
                          <option value="">No team assigned</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: T.positiveBg, color: "#3F7A5C" }}>
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: T.muted }}>
                      {(m.joined_at || m.created_at) ? new Date(m.joined_at || m.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right pr-6">
                      <div className="flex items-center justify-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedEmployeeForHistory(m)}
                          title={`View ${p.name || "employee"}'s daily pulse & stress tracking`}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border text-[#4E6ABF] bg-blue-50/50 hover:bg-blue-100/70 border-blue-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 whitespace-nowrap"
                        >
                          <Activity size={12} className="text-[#4E6ABF]" />
                          <span>Daily Pulse</span>
                        </button>
                        {isOwner ? (
                          <span className="text-xs text-gray-400 italic px-2 py-1 select-none whitespace-nowrap">
                            Owner
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRemoveMember(m)}
                            disabled={isRemoving}
                            title={`Remove ${p.name || p.email || "employee"} from organization`}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border text-red-600 hover:bg-red-50 hover:border-red-300 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shrink-0 whitespace-nowrap"
                            style={{ borderColor: T.border }}
                          >
                            {isRemoving ? (
                              <>
                                <RotateCw size={12} className="animate-spin" />
                                <span>Removing...</span>
                              </>
                            ) : (
                              <>
                                <UserX size={13} className="text-red-500" />
                                <span>Remove</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredMembers.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-gray-500">
                    No members matched your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pending Invitations Table */}
      {invitations.length > 0 && (
        <Card padded={false} className="overflow-hidden mt-6">
          <div className="p-4 border-b bg-gray-50/50 flex items-center justify-between" style={{ borderColor: T.border }}>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold" style={{ color: T.text }}>
                Pending Invitations ({invitations.length})
              </h4>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60">
                Awaiting claim
              </span>
            </div>
            <span className="text-xs text-gray-400">
              Links valid for 7 days
            </span>
          </div>

          {actionNotice && (
            <div
              className={`p-3 text-xs flex items-center justify-between border-b ${
                actionNotice.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-red-50 text-red-800 border-red-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {actionNotice.type === "success" ? (
                  <Check size={14} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle size={14} className="text-red-600 shrink-0" />
                )}
                <span>{actionNotice.text}</span>
              </div>
              <button onClick={() => setActionNotice(null)} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>
          )}

          <div className="overflow-x-auto table-scrollbar">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="text-left" style={{ color: T.muted }}>
                  {["Invited Email", "Role", "Assigned Team", "Expires", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium text-xs whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => {
                  const assignedTeam = teams.find((t) => t.id === inv.team_id);
                  const isExpiringSoon = new Date(inv.expires_at).getTime() - Date.now() < 2 * 24 * 3600 * 1000;
                  const isResending = resendingInviteId === inv.id;
                  const isRevoking = revokingInviteId === inv.id;
                  const isCopied = copiedInviteId === inv.id;

                  return (
                    <tr key={inv.id} className="border-t hover:bg-gray-50/50 transition-colors" style={{ borderColor: T.border }}>
                      <td className="px-4 py-3 font-medium" style={{ color: T.text }}>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          <span>{inv.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize bg-gray-100 text-gray-700">
                          {inv.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: T.text }}>
                        {assignedTeam ? assignedTeam.name : <span className="text-gray-400">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span style={{ color: isExpiringSoon ? "#D96B6B" : T.muted }}>
                          {new Date(inv.expires_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        {isExpiringSoon && (
                          <span className="ml-1.5 text-[10px] text-red-600 font-semibold">(Expiring soon)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: T.amberBg, color: "#9A6B1E" }}>
                          Pending Claim
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleEmailPendingInvite(inv)}
                            disabled={isResending || isRevoking}
                            title={`Renew & open email client for ${inv.email}`}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all hover:bg-blue-50 hover:border-blue-300 text-blue-700 disabled:opacity-50 cursor-pointer"
                            style={{ borderColor: T.border }}
                          >
                            <Mail size={12} className="text-blue-600" />
                            <span>Email</span>
                          </button>
                          <button
                            onClick={() => handleResendInvite(inv)}
                            disabled={isResending || isRevoking}
                            title="Renew token & copy fresh invite link"
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all hover:bg-indigo-50 hover:border-indigo-300 text-indigo-700 disabled:opacity-50 cursor-pointer"
                            style={{ borderColor: T.border }}
                          >
                            <RotateCw size={12} className={isResending ? "animate-spin" : ""} />
                            {isResending ? "Renewing..." : isCopied ? "Copied Link!" : "Copy Link"}
                          </button>
                          <button
                            onClick={() => handleRevokeInvite(inv)}
                            disabled={isResending || isRevoking}
                            title="Cancel invitation and free seat"
                            className="text-xs font-semibold px-2 py-1.5 rounded-lg border text-red-600 hover:bg-red-50 hover:border-red-300 flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
                            style={{ borderColor: T.border }}
                          >
                            <Trash2 size={12} />
                            {isRevoking ? "Revoking..." : "Revoke"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Employee Daily Check-in & Stress Tracking Modal */}
      {selectedEmployeeForHistory && (
        <EmployeeDailyHistoryModal
          member={selectedEmployeeForHistory}
          orgId={activeOrganizationId}
          onClose={() => setSelectedEmployeeForHistory(null)}
        />
      )}
    </div>
  );
}

