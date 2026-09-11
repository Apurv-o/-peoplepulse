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

export default function ManagerInsights({ setMobileOpen }) {
  const { user } = useAuth();
  const { activeOrganizationId } = useOrganization();
  const [insights, setInsights] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [teamName, setTeamName] = useState("Your Team");
  const [loading, setLoading] = useState(true);
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [recentlyUpdated, setRecentlyUpdated] = useState(false);

  // 1. Load teams in this organization
  const loadTeams = useCallback(async () => {
    if (!supabase || !activeOrganizationId) return;
    const { data } = await supabase
      .from("teams")
      .select("id, name, manager_id")
      .eq("organization_id", activeOrganizationId)
      .order("name", { ascending: true });

    if (data && data.length > 0) {
      setTeams(data);
      if (!selectedTeamId) {
        const myTeam = data.find((t) => t.manager_id === user?.id) || data[0];
        setSelectedTeamId(myTeam.id);
        setTeamName(myTeam.name);
      }
    }
  }, [activeOrganizationId, user?.id, selectedTeamId]);

  // 2. Fetch aggregated insights
  const loadInsights = useCallback(async (targetTeamId = selectedTeamId) => {
    if (!supabase || !activeOrganizationId) return;
    const effectiveTeamId = targetTeamId || selectedTeamId;
    if (!effectiveTeamId) return;

    setLoading(true);
    try {
      const res = await supabase.rpc("get_team_aggregated_insights", {
        p_team_id: effectiveTeamId,
        p_week_start: getTodayDate(),
      });
      if (res.data) {
        setInsights(res.data);
        setLastSyncTime(new Date());
        setRecentlyUpdated(true);
        setTimeout(() => setRecentlyUpdated(false), 2500);
      }
    } catch (err) {
      console.error("[Manager Insights Load Error]", err);
    } finally {
      setLoading(false);
    }
  }, [activeOrganizationId, selectedTeamId]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    if (selectedTeamId) {
      const t = teams.find((x) => x.id === selectedTeamId);
      if (t) setTeamName(t.name);
      loadInsights(selectedTeamId);
    }
  }, [selectedTeamId, teams, loadInsights]);

  // 3. Multi-layer Real-Time Subscriptions: Database WAL (teams & checkins) + Broadcast + Polling Fallback
  useEffect(() => {
    if (!supabase || !activeOrganizationId) return;

    const channel = supabase
      .channel(`manager-insights-live-${activeOrganizationId}`)
      // Triggered by trg_checkin_realtime_touch on checkin insert/update/delete (named AND anonymous!)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teams",
          filter: `organization_id=eq.${activeOrganizationId}`,
        },
        () => {
          loadInsights();
        }
      )
      // Triggered on named check-in inserts/updates
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checkins",
          filter: `organization_id=eq.${activeOrganizationId}`,
        },
        () => {
          loadInsights();
        }
      )
      // Triggered when sentiment processing finishes
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sentiment_results",
        },
        () => {
          loadInsights();
        }
      )
      // Immediate broadcast channel from active client submissions
      .on(
        "broadcast",
        { event: "checkin_submitted" },
        () => {
          loadInsights();
        }
      )
      .subscribe((status) => {
        setIsLiveActive(status === "SUBSCRIBED");
      });

    // 4. Polling fallback every 15 seconds to ensure freshness
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadInsights();
      }
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [activeOrganizationId, loadInsights]);

  const metrics = insights?.team_metrics;
  const isProtected = insights?.status === "insufficient_team_sample";

  return (
    <div>
      <Topbar
        title="Insights & Feedback"
        subtitle={`Privacy-preserving aggregated signals for ${teamName}.`}
        setMobileOpen={setMobileOpen}
      />

      {/* Live Real-time Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isLiveActive ? "bg-emerald-400" : "bg-amber-400"} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isLiveActive ? "bg-emerald-500" : "bg-amber-500"}`}></span>
          </span>
          <span className="text-xs font-semibold text-gray-800">
            {isLiveActive ? "Live Real-Time Sync Active" : "Connecting Live Feed..."}
          </span>
          {recentlyUpdated && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
              Updated just now
            </span>
          )}
          <span className="text-xs text-gray-400">
            • Last synced: {lastSyncTime.toLocaleTimeString()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {teams.length > 1 && (
            <select
              value={selectedTeamId || ""}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="text-xs font-semibold py-1.5 px-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 outline-none focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => loadInsights()}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-all active:scale-95 disabled:opacity-50"
            title="Force refresh insights"
          >
            <RotateCw size={13} className={loading ? "animate-spin text-[#4E6ABF]" : "text-gray-500"} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Real-time Metric Cards if threshold met */}
      {!isProtected && metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[11px] font-medium text-gray-500 mb-1">Check-ins</p>
            <p className="text-lg font-bold text-[#1F2A28]">{insights.total_count ?? 0}</p>
            <p className="text-[10px] text-gray-400">{insights.anonymous_count ?? 0} anon • {insights.named_count ?? 0} named</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[11px] font-medium text-gray-500 mb-1">Workload</p>
            <p className="text-lg font-bold text-[#4E6ABF]">{metrics.avg_workload ?? "—"}<span className="text-xs text-gray-400 font-normal">/5</span></p>
            <p className="text-[10px] text-emerald-600 font-medium">Manageable</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[11px] font-medium text-gray-500 mb-1">Support</p>
            <p className="text-lg font-bold text-[#4E6ABF]">{metrics.avg_manager_support ?? "—"}<span className="text-xs text-gray-400 font-normal">/5</span></p>
            <p className="text-[10px] text-emerald-600 font-medium">Manager</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[11px] font-medium text-gray-500 mb-1">Collab</p>
            <p className="text-lg font-bold text-[#4E6ABF]">{metrics.avg_team_collaboration ?? "—"}<span className="text-xs text-gray-400 font-normal">/5</span></p>
            <p className="text-[10px] text-emerald-600 font-medium">Teamwork</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[11px] font-medium text-gray-500 mb-1">Motivation</p>
            <p className="text-lg font-bold text-[#4E6ABF]">{metrics.avg_motivation ?? "—"}<span className="text-xs text-gray-400 font-normal">/5</span></p>
            <p className="text-[10px] text-emerald-600 font-medium">Energy</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[11px] font-medium text-gray-500 mb-1">Stress Level</p>
            <p className="text-lg font-bold text-[#4E6ABF]">{metrics.avg_stress_level ?? "—"}<span className="text-xs text-gray-400 font-normal">/5</span></p>
            <p className="text-[10px] text-gray-400 font-medium">1: High, 5: Low</p>
          </div>
        </div>
      )}

      {/* Threshold Privacy Banner if < 3 check-ins */}
      {isProtected && (
        <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#4E6ABF] flex items-center justify-center font-bold text-sm shrink-0">
              {insights?.total_count || 0}/3
            </div>
            <div>
              <p className="text-xs font-semibold text-[#1F2A28]">Privacy Threshold Active ({insights?.total_count || 0} of 3 received)</p>
              <p className="text-[11px] text-gray-600">Aggregated team metrics will unlock automatically in real time as soon as 3 check-ins are received.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Privacy & Anonymous Comments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-base font-semibold" style={{ color: T.text }}>Anonymous Privacy Guarantee</p>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck size={12} className="text-emerald-600" />
              100% Anonymized
            </span>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed mb-3.5">
            PeoplePulse guarantees psychological safety through irreversible database-level privacy protections:
          </p>

          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <ShieldCheck size={15} className="text-[#4E6ABF] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[#1F2A28]">Zero Identity Trace</p>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  When submitting anonymously, author accounts and identifying records are permanently detached before saving. Neither managers nor administrators can ever see who submitted a check-in.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <Lock size={15} className="text-[#4E6ABF] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[#1F2A28]">Anti-De-anonymization Threshold (n ≥ 3)</p>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Written comments and segmented metrics remain strictly locked until at least 3 teammates submit pulses, eliminating process-of-elimination guesswork.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <Sparkles size={15} className="text-[#4E6ABF] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[#1F2A28]">Aggregated Team Signals</p>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Leadership dashboards only present blended team averages to surface actionable trends without exposing individual responses.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-base font-semibold" style={{ color: T.text }}>Anonymous Comments</p>
            {insights?.anonymous_breakdown?.status === "available" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#4E6ABF] border border-blue-100">
                {insights.anonymous_breakdown.comments?.length || 0} comments
              </span>
            )}
          </div>

          {insights?.anonymous_breakdown?.status === "available" ? (
            insights.anonymous_breakdown.comments && insights.anonymous_breakdown.comments.length > 0 ? (
              <div className="space-y-2">
                {insights.anonymous_breakdown.comments.map((c, i) => (
                  <div key={i} className="p-3 rounded-xl text-xs bg-gray-50 border border-gray-100 text-gray-700 italic transition-all hover:bg-gray-100/70">
                    "{c}"
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center text-xs text-gray-500">
                No written feedback notes submitted in this cycle yet.
              </div>
            )
          ) : (
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center text-xs text-gray-500">
              <Lock size={16} className="mx-auto text-gray-400 mb-1" />
              <span>Anonymous feedback comments remain locked until at least 3 anonymous check-ins are received.</span>
              <span className="block mt-1 text-[11px] text-gray-400">
                (Current anonymous count: {insights?.anonymous_count ?? 0}/3)
              </span>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}


/* ============================================================
   EMPLOYEE CHECK-IN & WELLBEING
   ============================================================ */
const CHECKIN_DIMENSIONS = [
  { key: "workload", label: "Workload manageable" },
  { key: "support", label: "Manager support" },
  { key: "collab", label: "Team collaboration" },
  { key: "motivation", label: "Motivation & energy" },
  { key: "stress", label: "Stress level (1: High, 5: Low)" },
];

const FACES = ["😣", "🙁", "😐", "🙂", "😄"];

