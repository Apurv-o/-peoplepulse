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

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, CartesianGrid,
} from "recharts";

import Topbar from "../layout/Topbar";
import EmployeeDailyHistoryModal from "../modals/EmployeeDailyHistoryModal";
import {
  buildInviteLink,
  buildInviteEmailDetails,
  triggerEmailApp,
  triggerGmailWeb,
  dispatchInviteEmailViaBackend,
} from "../../lib/inviteUtils";

export default function AdminDashboard({ setMobileOpen }) {
  const { activeOrganization, activeOrganizationId, seatUsage, teamUsage } = useOrganization();
  const orgName = activeOrganization?.name || "Acme Corp";
  const [liveTeamCount, setLiveTeamCount] = useState(null);
  const [liveMemberCount, setLiveMemberCount] = useState(null);
  const memberCount = liveMemberCount !== null ? liveMemberCount : (seatUsage?.used || 0);
  const teamCount = liveTeamCount !== null ? liveTeamCount : (teamUsage?.used || 0);
  const [todayCheckins, setTodayCheckins] = useState(null);
  const [teamComparisonData, setTeamComparisonData] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [orgEngagementScore, setOrgEngagementScore] = useState(null);
  const [totalOrgCheckins, setTotalOrgCheckins] = useState(null);
  const [sentimentDistribution, setSentimentDistribution] = useState(null);
  const [engagementTrendData, setEngagementTrendData] = useState([]);
  const [eligibleEmployeeCount, setEligibleEmployeeCount] = useState(null);

  const loadDashboardData = useCallback(async () => {
    if (!supabase || !activeOrganizationId) return;
    try {
      setLoadingTeams(true);
      const localToday = getTodayDate();
      const utcToday = new Date().toISOString().slice(0, 10);
      const past24hIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // 0. Fetch live team count, total member count, and eligible employees count (excluding admin/manager)
      const [{ count: tCount }, { count: mCount }, { count: eCount }] = await Promise.all([
        supabase
          .from("teams")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", activeOrganizationId),
        supabase
          .from("organization_members")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", activeOrganizationId)
          .eq("is_active", true),
        supabase
          .from("organization_members")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", activeOrganizationId)
          .eq("is_active", true)
          .not("role", "in", '("admin","manager","owner")'),
      ]);

      if (tCount !== null && tCount !== undefined) setLiveTeamCount(tCount);
      if (mCount !== null && mCount !== undefined) setLiveMemberCount(mCount);
      if (eCount !== null && eCount !== undefined) setEligibleEmployeeCount(eCount);

      // 1. Fetch real-time daily participation (excludes admin & manager)
      let participationLoaded = false;
      try {
        const { data: partData, error: partErr } = await supabase.rpc(
          "get_org_today_participation",
          {
            p_org_id: activeOrganizationId,
            p_local_date: localToday,
          }
        );
        if (!partErr && partData && typeof partData.today_checkins === "number") {
          setTodayCheckins(partData.today_checkins);
          if (typeof partData.eligible_members === "number" && partData.eligible_members > 0) {
            setEligibleEmployeeCount(partData.eligible_members);
          }
          if (typeof partData.total_members === "number" && partData.total_members > 0) {
            setLiveMemberCount(partData.total_members);
          }
          participationLoaded = true;
        }
      } catch (rpcErr) {
        // Fall back gracefully to direct query
      }

      // Fallback: Direct query strictly for today (excluding admin & manager checkins)
      if (!participationLoaded) {
        try {
          const { count: cCount, error: cErr } = await supabase
            .from("checkins")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", activeOrganizationId)
            .or(`week_start.eq.${localToday},week_start.eq.${utcToday}`);

          if (!cErr && cCount !== null) {
            setTodayCheckins(cCount);
          }
        } catch (queryErr) {
          console.warn("[Daily Participation Query Fallback]", queryErr);
        }
      }

      // Ensure daily check-in notifications are queued for today (idempotent)
      try {
        supabase.rpc("dispatch_daily_checkin_notifications", {
          p_org_id: activeOrganizationId,
          p_target_date: localToday,
        }).catch(() => {});
      } catch (notifErr) {}

      // 2. Fetch real-time team comparison, org score, sentiment breakdown, and weekly engagement trend
      const { data, error } = await supabase.rpc("get_org_team_comparison", {
        p_org_id: activeOrganizationId,
      });

      if (!error && data) {
        setTeamComparisonData(Array.isArray(data.teams) ? data.teams : []);
        if (typeof data.org_score === "number") {
          setOrgEngagementScore(data.org_score);
        }
        if (typeof data.total_checkins === "number") {
          setTotalOrgCheckins(data.total_checkins);
        }
        if (Array.isArray(data.sentiment_split) && data.sentiment_split.length > 0) {
          setSentimentDistribution(data.sentiment_split);
        } else {
          setSentimentDistribution([]);
        }
        if (Array.isArray(data.engagement_trend) && data.engagement_trend.length > 0) {
          setEngagementTrendData(data.engagement_trend);
        }
      }

      // Fallback: Standalone get_org_engagement_trend RPC
      if (!data || !Array.isArray(data.engagement_trend) || data.engagement_trend.length === 0) {
        try {
          const { data: trendData, error: trendErr } = await supabase.rpc("get_org_engagement_trend", {
            p_org_id: activeOrganizationId,
          });
          if (!trendErr && Array.isArray(trendData) && trendData.length > 0) {
            setEngagementTrendData(trendData);
          }
        } catch (trendFetchErr) {
          console.warn("[Engagement Trend Fallback]", trendFetchErr);
        }
      }
    } catch (err) {
      console.error("Failed to load admin dashboard realtime metrics:", err);
    } finally {
        setLoadingTeams(false);
      }
    }, [activeOrganizationId]);

  useEffect(() => {
    loadDashboardData();

    if (!supabase || !activeOrganizationId) return;

    // Multi-layer Real-Time Subscriptions: Database WAL (checkins, teams, organizations, members) + Broadcast channel
    const channel = supabase
      .channel(`org-pulse-${activeOrganizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checkins",
          filter: `organization_id=eq.${activeOrganizationId}`,
        },
        () => {
          loadDashboardData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teams",
          filter: `organization_id=eq.${activeOrganizationId}`,
        },
        () => {
          loadDashboardData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "organizations",
          filter: `id=eq.${activeOrganizationId}`,
        },
        () => {
          loadDashboardData();
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
          loadDashboardData();
        }
      )
      // Immediate broadcast channel from active client submissions across all tabs
      .on(
        "broadcast",
        { event: "checkin_submitted" },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    // Fast polling fallback (every 10 seconds) to ensure real-time participation never drifts
    const interval = setInterval(() => {
      loadDashboardData();
    }, 10000);

    // Automatic Midnight Rollover: At 12:00 AM every day, reset daily participation to 0%
    const now = new Date();
    const tomorrowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const msUntilMidnight = Math.max(1000, tomorrowMidnight.getTime() - now.getTime());
    const midnightTimer = setTimeout(() => {
      loadDashboardData();
    }, msUntilMidnight);

    // Automatic Saturday Midnight Rollover: At 12:00 AM Saturday, reset weekly engagement data for the new cycle
    const currentDay = now.getDay(); // 0: Sun, ..., 6: Sat
    const daysUntilNextSat = currentDay === 6 ? 7 : (6 - currentDay);
    const nextSaturdayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilNextSat, 0, 0, 1);
    const msUntilSatMidnight = Math.max(1000, nextSaturdayMidnight.getTime() - now.getTime());
    const saturdayResetTimer = setTimeout(() => {
      loadDashboardData();
    }, msUntilSatMidnight);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      clearTimeout(midnightTimer);
      clearTimeout(saturdayResetTimer);
    };
  }, [activeOrganizationId, loadDashboardData]);

  const participationTarget = eligibleEmployeeCount !== null && eligibleEmployeeCount > 0
    ? eligibleEmployeeCount
    : memberCount;

  const displayCheckins = todayCheckins !== null
    ? Math.min(todayCheckins, participationTarget)
    : null;

  const dailyParticipationPct = participationTarget > 0 && displayCheckins !== null
    ? Math.min(100, Math.round((displayCheckins / participationTarget) * 100))
    : 0;

  const displaySentiment = sentimentDistribution && sentimentDistribution.length > 0
    ? sentimentDistribution
    : [];

  const satCycle = getSaturdayCycleRange();

  return (
    <div>
      <Topbar
        title="Organization Overview"
        subtitle={`${teamCount} active team(s) across ${orgName} · Weekly Cycle (${satCycle.label}).`}
        setMobileOpen={setMobileOpen}
        right={
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 text-xs font-medium">
              <span>Weekly Cycle: {satCycle.label}</span>
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Realtime</span>
            </div>
          </div>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Organization Members" value={String(memberCount)} unit={`/ ${seatUsage?.max || 100}`} />
        <KPICard label="Active Teams" value={String(teamCount)} unit={teamUsage?.max ? `/ ${teamUsage.max}` : ""} />
        <KPICard
          label="Daily participation"
          value={todayCheckins !== null ? `${dailyParticipationPct}%` : "0%"}
          unit={displayCheckins !== null ? `${displayCheckins} / ${participationTarget}` : `0 / ${participationTarget}`}
          delta={undefined}
          goodDirection="up"
          extra={
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Realtime</span>
            </div>
          }
        />
        <KPICard
          label="Org. engagement"
          value={orgEngagementScore !== null ? String(orgEngagementScore) : "—"}
          unit={orgEngagementScore !== null ? "/ 100" : "Awaiting data"}
          delta={orgEngagementScore !== null ? (orgEngagementScore >= 60 ? 2.5 : -1.5) : 0}
          goodDirection="up"
          extra={
            <div className="text-[10px] text-gray-500 font-normal">
              Resets every Saturday
            </div>
          }
        />
      </div>

      {/* PulseAgent Autonomous Activity Widget */}
      <div className="mb-6">
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#4E6ABF] to-[#6A8BE8] flex items-center justify-center text-white shrink-0 shadow-xs">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold" style={{ color: T.text }}>PulseAgent HR Copilot</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Monitors employee wellbeing, spots burnout early, and helps managers support their teams.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("peoplepulse_open_copilot"))}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-[#4E6ABF] text-white hover:bg-[#344A91] transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer shrink-0"
            >
              <Sparkles size={14} /> Open PulseAgent
            </button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-base font-semibold" style={{ color: T.text }}>Organization engagement</p>
              <p className="text-xs mt-0.5" style={{ color: T.muted }}>
                Cycle: {satCycle.label} &bull; Live score {orgEngagementScore !== null ? `${orgEngagementScore}%` : (engagementTrendData.length > 0 ? `${engagementTrendData[engagementTrendData.length - 1]?.score}%` : "—")}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Realtime
            </span>
          </div>
          {loadingTeams && engagementTrendData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm" style={{ color: T.muted }}>
              <div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full mr-2.5" />
              Syncing live engagement trend...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={engagementTrendData} margin={{ left: -20, right: 10 }}>
                <CartesianGrid vertical={false} stroke={T.border} strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: T.muted }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: T.muted }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: `1px solid ${T.border}`,
                    fontSize: 13,
                    backgroundColor: "#ffffff",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  formatter={(value, name, item) => [
                    `${value}% (${item?.payload?.count ?? 0} check-in${item?.payload?.count === 1 ? "" : "s"})`,
                    item?.payload?.week_date ? `Score (${item.payload.week_date})` : "Engagement Score",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={T.primary}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: T.primary, strokeWidth: 2, stroke: "#ffffff" }}
                  activeDot={{ r: 6, fill: T.primary }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-base font-semibold" style={{ color: T.text }}>Team comparison</p>
              <p className="text-xs mt-0.5" style={{ color: T.muted }}>
                Weekly cycle ({satCycle.label}) &bull; {teamComparisonData.length} team(s)
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Realtime
            </span>
          </div>

          {loadingTeams ? (
            <div className="h-[200px] flex items-center justify-center text-sm" style={{ color: T.muted }}>
              <div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full mr-2.5" />
              Syncing live team data...
            </div>
          ) : teamComparisonData.length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-xl" style={{ borderColor: T.border }}>
              <p className="text-sm font-semibold" style={{ color: T.text }}>No teams yet</p>
              <p className="text-xs mt-1 max-w-xs" style={{ color: T.muted }}>
                Add teams in the Teams tab to compare engagement and satisfaction across your organization.
              </p>
            </div>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={Math.max(190, teamComparisonData.length * 36)}>
                <BarChart data={teamComparisonData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: T.muted }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="team"
                    tick={{ fontSize: 12, fill: T.text }}
                    axisLine={false}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: `1px solid ${T.border}`, fontSize: 13 }}
                    formatter={(val, name, item) => [
                      `${val} / 100 (${item.payload.total_checkins || 0} check-ins this week)`,
                      "Engagement Score"
                    ]}
                  />
                  <Bar dataKey="score" fill={T.primary} radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
              {teamComparisonData.every(t => (t.total_checkins || 0) === 0) && (
                <p className="text-[11px] text-center mt-2 italic" style={{ color: T.muted }}>
                  Awaiting first check-in submissions for this weekly cycle. Scores reset every Saturday at 12:00 AM.
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-base font-semibold" style={{ color: T.text }}>Sentiment distribution</p>
              <p className="text-[11px]" style={{ color: T.muted }}>Current weekly cycle ({satCycle.label})</p>
            </div>
            {sentimentDistribution && sentimentDistribution.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: T.bg, color: T.muted }}>
                {totalOrgCheckins || 0} weekly check-ins
              </span>
            )}
          </div>
          {displaySentiment.length > 0 && displaySentiment.some(s => s.value > 0) ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={110} height={110}>
                <PieChart>
                  <Pie data={displaySentiment} dataKey="value" innerRadius={34} outerRadius={50}>
                    {displaySentiment.map((s, i) => <Cell key={i} fill={s.color} stroke="none" />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 flex-1">
                {displaySentiment.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span style={{ color: T.muted }}>{s.name}</span>
                    </div>
                    <span className="font-medium" style={{ color: T.text }}>
                      {s.value}% {typeof s.count === "number" ? `(${s.count})` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[110px] flex flex-col items-center justify-center text-center p-3 border border-dashed rounded-xl" style={{ borderColor: T.border }}>
              <p className="text-xs font-medium" style={{ color: T.muted }}>
                No sentiment data recorded yet.
              </p>
            </div>
          )}
        </Card>
        <Card>
          <p className="text-base font-semibold mb-3" style={{ color: T.text }}>Employee activity</p>
          <ul className="space-y-2.5 text-sm">
            <li className="flex justify-between">
              <span style={{ color: T.muted }}>Check-ins today</span>
              <span className="font-medium" style={{ color: T.text }}>{todayCheckins !== null ? todayCheckins : 0}</span>
            </li>
            <li className="flex justify-between">
              <span style={{ color: T.muted }}>Total check-ins</span>
              <span className="font-medium" style={{ color: T.text }}>{totalOrgCheckins !== null ? totalOrgCheckins : 0}</span>
            </li>
            <li className="flex justify-between">
              <span style={{ color: T.muted }}>Active members</span>
              <span className="font-medium" style={{ color: T.text }}>{memberCount}</span>
            </li>
            <li className="flex justify-between">
              <span style={{ color: T.muted }}>Active teams</span>
              <span className="font-medium" style={{ color: T.text }}>{teamCount}</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

const employeeRows = [
  { name: "Aditi Sharma", email: "aditi.sharma@company.com", team: "Engineering", manager: "Sarah Patel", role: "Member", status: "Active" },
  { name: "Rohan Kumar", email: "rohan.kumar@company.com", team: "Engineering", manager: "Sarah Patel", role: "Member", status: "Active" },
  { name: "Priya Singh", email: "priya.singh@company.com", team: "Design", manager: "Sarah Patel", role: "Member", status: "Active" },
  { name: "Nikhil Patel", email: "nikhil.patel@company.com", team: "Sales", manager: "Arjun Rao", role: "Member", status: "Invited" },
];


/* ============================================================
   EMPLOYEE DAILY FORM & STRESS TRACKING MODAL
   ============================================================ */
