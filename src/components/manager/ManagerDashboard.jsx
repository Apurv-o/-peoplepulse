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

export default function ManagerDashboard({ setMobileOpen, setView }) {
  const { profile, user } = useAuth();
  const { activeOrganizationId } = useOrganization();
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => getTodayDate());
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Fetch available teams & prioritize user's managed team
  useEffect(() => {
    if (!supabase || !activeOrganizationId) return;
    let isMounted = true;
    supabase
      .from("teams")
      .select("id, name, manager_id")
      .eq("organization_id", activeOrganizationId)
      .then(({ data, error: tErr }) => {
        if (!isMounted) return;
        if (tErr) {
          setError(tErr.message);
        } else if (data && data.length > 0) {
          const sorted = [...data].sort((a, b) => {
            if (a.manager_id === user?.id) return -1;
            if (b.manager_id === user?.id) return 1;
            return a.name.localeCompare(b.name);
          });
          setTeams(sorted);
          if (!selectedTeamId || !data.some((t) => t.id === selectedTeamId)) {
            const myTeam = sorted.find((t) => t.manager_id === user?.id) || sorted[0];
            setSelectedTeamId(myTeam.id);
          }
        } else {
          setTeams([]);
        }
      });
    return () => { isMounted = false; };
  }, [activeOrganizationId, user?.id]);

  // 2. Fetch insights for selected team with live real-time sync
  const fetchInsights = useCallback(async () => {
    if (!supabase || !selectedTeamId) return;
    setLoading(true);
    setError(null);

    const { data, error: rpcErr } = await supabase.rpc("get_team_aggregated_insights", {
      p_team_id: selectedTeamId,
      p_week_start: selectedDate,
    });

    if (rpcErr) {
      setError(rpcErr.message);
      setInsights(null);
    } else {
      setError(null);
      setInsights(data);
    }
    setLoading(false);
  }, [selectedTeamId, selectedDate]);

  useEffect(() => {
    fetchInsights();

    if (!supabase || !selectedTeamId || !activeOrganizationId) return;

    // Real-time multi-layer subscriptions (checkins, touched teams, sentiment_results, and broadcast)
    const channel = supabase
      .channel(`manager-team-insights-${selectedTeamId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checkins",
          filter: `team_id=eq.${selectedTeamId}`,
        },
        () => {
          fetchInsights();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teams",
          filter: `id=eq.${selectedTeamId}`,
        },
        () => {
          fetchInsights();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sentiment_results",
        },
        () => {
          fetchInsights();
        }
      )
      .on(
        "broadcast",
        { event: "checkin_submitted" },
        () => {
          fetchInsights();
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchInsights();
      }
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [selectedTeamId, selectedDate, activeOrganizationId, fetchInsights]);

  const currentTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];
  const isPrivacyProtected = insights?.status === "insufficient_team_sample";
  const metrics = insights?.team_metrics;

  const avgEngagement = metrics
    ? Math.round(
        (((0.2 * (metrics.avg_workload + metrics.avg_manager_support + metrics.avg_team_collaboration + metrics.avg_motivation + (6 - metrics.avg_stress_level))) - 1) / 4) * 100
      )
    : 78;

  const managerName = profile?.name ? profile.name.split(" ")[0] : "Manager";

  return (
    <div>
      <Topbar
        title={`Good morning, ${managerName} 👋`}
        subtitle={currentTeam ? `Daily team pulse for ${currentTeam.name}.` : "Here is how your team is feeling today."}
        setMobileOpen={setMobileOpen}
        right={
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Realtime
            </span>
            {teams.length > 1 && (
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="text-xs font-semibold px-3 py-2 rounded-xl border bg-white outline-none cursor-pointer"
                style={{ borderColor: T.border }}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.manager_id === user?.id ? " (Your Team)" : ""}
                  </option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border bg-white" style={{ borderColor: T.border }}>
              <span className="text-xs text-gray-400 font-medium">Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-semibold bg-transparent text-gray-700 outline-none cursor-pointer"
              />
              {selectedDate === getTodayDate() && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                  Today
                </span>
              )}
            </div>
          </div>
        }
      />

      {/* PulseAgent AI Autonomous Copilot Feature Showcase for Managers */}
      <div className="mb-6">
        <Card className="bg-gradient-to-r from-blue-50 via-indigo-50/40 to-white border-blue-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#4E6ABF] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Bot size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold" style={{ color: T.text }}>PulseAgent HR Copilot</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Monitors employee wellbeing, spots burnout early, and provides actionable 1:1 talking points.
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

      {error && (
        <div className="mb-6 p-4 rounded-xl text-sm bg-red-50 border border-red-200 text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Privacy Guard Notice if n < 3 */}
      {isPrivacyProtected && (
        <Card className="mb-6 bg-blue-50/70 border-blue-200">
          <div className="flex items-start gap-3">
            <ShieldCheck size={22} className="text-[#4E6ABF] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-[#1F2A28]">
                {insights.total_count === 0 ? "Awaiting Check-in Submissions" : "Privacy Threshold Active (n \u2265 3 Rule)"}
              </p>
              <p className="text-xs text-[#7B8494] leading-relaxed">
                {insights.total_count === 0
                  ? `No check-ins have been recorded for ${currentTeam?.name || "this team"} in this pulse cycle. Responses update in real time as employees submit daily check-ins.`
                  : (insights.message || "Fewer than 3 total team check-ins received. Team metrics are locked to protect employee privacy.")}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white border border-blue-100 text-[#1F2A28]">
                  Total responses: {insights.total_count} / 3
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white border border-blue-100 text-gray-600">
                  Named: {insights.named_count}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white border border-blue-100 text-gray-600">
                  Anonymous: {insights.anonymous_count}
                </span>
                {typeof insights.today_count === "number" && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white border border-blue-100 text-blue-700">
                    Today: {insights.today_count}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Team Engagement"
          value={metrics ? avgEngagement : (isPrivacyProtected ? "Locked" : "—")}
          unit={metrics ? "/ 100" : ""}
          delta={undefined}
          deltaSuffix="% daily pulse"
          goodDirection="up"
          extra={isPrivacyProtected ? <span className="text-xs text-gray-400">Requires n &ge; 3</span> : null}
        />
        <Card interactive>
          <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: T.muted }}>Daily Submissions</p>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-3xl font-extrabold tracking-tight" style={{ color: T.text }}>
              {insights ? insights.total_count : 0}
            </span>
            <span className="text-sm font-medium" style={{ color: T.muted }}>check-ins</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
              {insights ? `${insights.anonymous_count} anonymous` : "0 anonymous"}
            </span>
          </div>
        </Card>
        <Card interactive>
          <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: T.muted }}>Average Stress</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-extrabold tracking-tight" style={{ color: T.text }}>
              {metrics ? metrics.avg_stress_level : (isPrivacyProtected ? "—" : "—")}
            </span>
            {metrics && <span className="text-sm font-medium" style={{ color: T.muted }}>/ 5</span>}
          </div>
          <div className="mt-3 flex items-center gap-2">
            {metrics ? (
              <span
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1"
                style={{
                  background: metrics.avg_stress_level <= 2.5 ? T.positiveBg : T.amberBg,
                  color: metrics.avg_stress_level <= 2.5 ? "#3F7A5C" : "#9A6B1E",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: metrics.avg_stress_level <= 2.5 ? "#3F7A5C" : "#9A6B1E" }} />
                {metrics.avg_stress_level <= 2.5 ? "Healthy" : "Elevated"}
              </span>
            ) : (
              <span className="text-xs text-gray-400">Awaiting data</span>
            )}
          </div>
        </Card>
        <Card interactive onClick={() => setView?.("manager-insights")}>
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: T.muted }}>Anonymous Privacy</p>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active (n ≥ 3)
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-extrabold tracking-tight text-[#1F2A28]">100% Protected</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1.5" title="Author identity is detached from submissions and protected by a 3-person minimum cohort threshold">
              <ShieldCheck size={14} className="text-emerald-600 shrink-0" /> Zero Identity Tracking
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setView?.("manager-insights");
              }}
              className="text-xs font-semibold flex items-center gap-1 hover:underline text-[#4E6ABF] transition-colors"
            >
              Privacy Model <ArrowRight size={12} />
            </button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-base font-semibold" style={{ color: T.text }}>Dimension Breakdown</p>
              <p className="text-xs mt-0.5" style={{ color: T.muted }}>Today's metric averages (1-5 scale)</p>
            </div>
          </div>
          {metrics ? (
            <div className="space-y-3 pt-2">
              {[
                { label: "Workload Manageability", val: metrics.avg_workload },
                { label: "Manager Support", val: metrics.avg_manager_support },
                { label: "Team Collaboration", val: metrics.avg_team_collaboration },
                { label: "Motivation & Energy", val: metrics.avg_motivation },
                { label: "Stress Balance", val: (6 - metrics.avg_stress_level) },
              ].map((m) => (
                <div key={m.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span style={{ color: T.text }}>{m.label}</span>
                    <span style={{ color: T.primary }}>{m.val} / 5.0</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(m.val / 5) * 100}%`, background: T.primary }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-xs text-gray-400">
              {isPrivacyProtected ? "Dimension metrics protected under n >= 3 rule." : "No check-in metrics recorded for this date."}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-base font-semibold" style={{ color: T.text }}>Anonymous Comments</p>
              <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-600" /> Identity detached &bull; n &ge; 3 protection
              </p>
            </div>
            {insights?.anonymous_breakdown?.status === "available" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#4E6ABF] border border-blue-100">
                {insights.anonymous_breakdown.comments?.length || 0} notes
              </span>
            )}
          </div>
          {insights?.anonymous_breakdown?.status === "available" ? (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {(insights.anonymous_breakdown.comments || []).map((c, i) => (
                <div key={i} className="p-2.5 rounded-lg text-xs leading-relaxed bg-gray-50 border border-gray-100 text-gray-700 italic">
                  "{c}"
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center text-xs text-gray-500 space-y-1">
              <Lock size={16} className="mx-auto text-gray-400" />
              <p className="font-medium text-gray-700">Comments Locked</p>
              <p className="text-[11px]">Requires at least 3 anonymous submissions to protect privacy.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
   MANAGER TEAM & INSIGHTS
   ============================================================ */
