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

export default function AdminInsights({ setMobileOpen }) {
  const { activeOrganization, activeOrganizationId } = useOrganization();
  const orgName = activeOrganization?.name || "Organization";
  const [orgData, setOrgData] = useState(null);
  const [allTeamInsights, setAllTeamInsights] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("all");
  const [teamInsight, setTeamInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [recentlyUpdated, setRecentlyUpdated] = useState(false);

  const loadOrgInsights = useCallback(async () => {
    if (!supabase || !activeOrganizationId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_org_team_comparison", {
        p_org_id: activeOrganizationId,
      });
      if (!error && data) {
        setOrgData(data);
        setAllTeamInsights(Array.isArray(data.teams) ? data.teams : []);
        setLastSyncTime(new Date());
        setRecentlyUpdated(true);
        setTimeout(() => setRecentlyUpdated(false), 2500);
      }
    } catch (err) {
      console.error("[Admin Insights Load Error]", err);
    } finally {
      setLoading(false);
    }
  }, [activeOrganizationId]);

  // Load team-specific insight when a team is selected
  const loadTeamInsight = useCallback(async (teamId) => {
    if (!supabase || !teamId || teamId === "all") {
      setTeamInsight(null);
      return;
    }
    try {
      const { data } = await supabase.rpc("get_team_aggregated_insights", {
        p_team_id: teamId,
        p_week_start: getTodayDate(),
      });
      if (data) setTeamInsight(data);
    } catch (err) {
      console.error("[Team Insight Load Error]", err);
    }
  }, []);

  useEffect(() => {
    loadOrgInsights();
  }, [loadOrgInsights]);

  useEffect(() => {
    loadTeamInsight(selectedTeamId);
  }, [selectedTeamId, loadTeamInsight]);

  // Real-time subscriptions
  useEffect(() => {
    if (!supabase || !activeOrganizationId) return;
    const channel = supabase
      .channel(`admin-insights-live-${activeOrganizationId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "checkins", filter: `organization_id=eq.${activeOrganizationId}` }, () => { loadOrgInsights(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "teams", filter: `organization_id=eq.${activeOrganizationId}` }, () => { loadOrgInsights(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "sentiment_results" }, () => { loadOrgInsights(); })
      .on("broadcast", { event: "checkin_submitted" }, () => { loadOrgInsights(); })
      .subscribe((status) => { setIsLiveActive(status === "SUBSCRIBED"); });

    const interval = setInterval(() => { if (document.visibilityState === "visible") loadOrgInsights(); }, 15000);

    // Automatic Saturday Midnight Rollover: Refresh insights when cycle resets at 12:00 AM Saturday
    const now = new Date();
    const currentDay = now.getDay();
    const daysUntilNextSat = currentDay === 6 ? 7 : (6 - currentDay);
    const nextSaturdayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilNextSat, 0, 0, 1);
    const msUntilSatMidnight = Math.max(1000, nextSaturdayMidnight.getTime() - now.getTime());
    const saturdayResetTimer = setTimeout(() => {
      loadOrgInsights();
    }, msUntilSatMidnight);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      clearTimeout(saturdayResetTimer);
    };
  }, [activeOrganizationId, loadOrgInsights]);

  const aiFeedback = orgData ? generateAIGrowthFeedback(orgData, allTeamInsights) : [];
  const selectedTeamData = allTeamInsights.find((t) => t.team_id === selectedTeamId);
  const teamMetrics = teamInsight?.team_metrics;
  const isTeamProtected = teamInsight?.status === "insufficient_team_sample";
  const satCycle = getSaturdayCycleRange();

  const typeStyles = {
    positive: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "text-emerald-600", badge: "bg-emerald-100 text-emerald-800" },
    attention: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600", badge: "bg-amber-100 text-amber-800" },
    critical: { bg: "bg-red-50", border: "border-red-200", icon: "text-red-600", badge: "bg-red-100 text-red-800" },
    growth: { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-600", badge: "bg-blue-100 text-blue-800" },
  };

  return (
    <div>
      <Topbar
        title="Insights & Feedback"
        subtitle={`AI-powered growth analysis for ${orgName} · Weekly Cycle (${satCycle.label}).`}
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
          <span className="text-xs text-gray-400">• Last synced: {lastSyncTime.toLocaleTimeString()}</span>
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-medium border border-blue-100">
            Cycle: {satCycle.label} (Resets Sat 12:00 AM)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="text-xs font-semibold py-1.5 px-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 outline-none focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer"
          >
            <option value="all">All Teams — Organization Overview</option>
            {allTeamInsights.map((t) => (
              <option key={t.team_id} value={t.team_id}>{t.team}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => { loadOrgInsights(); if (selectedTeamId !== "all") loadTeamInsight(selectedTeamId); }}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-all active:scale-95 disabled:opacity-50"
          >
            <RotateCw size={13} className={loading ? "animate-spin text-[#4E6ABF]" : "text-gray-500"} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Organization-Level KPI Summary (when "All Teams" selected) */}
      {selectedTeamId === "all" && orgData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[11px] font-medium text-gray-500 mb-1">Org Engagement</p>
            <p className="text-2xl font-bold text-[#1F2A28]">{orgData.org_score ?? "—"}<span className="text-xs text-gray-400 font-normal">/ 100</span></p>
            <p className="text-[10px] text-gray-400 mt-1">This week · Resets Sat</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[11px] font-medium text-gray-500 mb-1">Weekly Check-ins</p>
            <p className="text-2xl font-bold text-[#4E6ABF]">{orgData.total_checkins ?? 0}</p>
            <p className="text-[10px] text-gray-400 mt-1">Cycle: {satCycle.label}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[11px] font-medium text-gray-500 mb-1">Active Teams</p>
            <p className="text-2xl font-bold text-[#1F2A28]">{allTeamInsights.filter((t) => t.total_checkins > 0).length}<span className="text-xs text-gray-400 font-normal"> / {allTeamInsights.length}</span></p>
            <p className="text-[10px] text-gray-400 mt-1">With check-in data</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[11px] font-medium text-gray-500 mb-1">Sentiment</p>
            {orgData.sentiment_split && orgData.sentiment_split.length > 0 ? (
              <div className="flex items-center gap-1 mt-1">
                {orgData.sentiment_split.map((s) => (
                  <span key={s.name} className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: s.color + "20", color: s.color }}>
                    {s.name}: {s.value}%
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm font-bold text-gray-400 mt-1">No data</p>
            )}
            <p className="text-[10px] text-gray-400 mt-1">Feedback tone</p>
          </div>
        </div>
      )}

      {/* Team-Specific Metrics (when a specific team is selected) */}
      {selectedTeamId !== "all" && teamMetrics && !isTeamProtected && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[11px] font-medium text-gray-500 mb-1">Check-ins</p>
            <p className="text-lg font-bold text-[#1F2A28]">{teamInsight?.total_count ?? 0}</p>
            <p className="text-[10px] text-gray-400">{teamInsight?.anonymous_count ?? 0} anon • {teamInsight?.named_count ?? 0} named</p>
          </div>
          {[
            { label: "Workload", val: teamMetrics.avg_workload, sub: "Manageable" },
            { label: "Support", val: teamMetrics.avg_manager_support, sub: "Manager" },
            { label: "Collab", val: teamMetrics.avg_team_collaboration, sub: "Teamwork" },
            { label: "Motivation", val: teamMetrics.avg_motivation, sub: "Energy" },
            { label: "Stress", val: teamMetrics.avg_stress_level, sub: "1: High, 5: Low" },
          ].map((m) => (
            <div key={m.label} className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-[11px] font-medium text-gray-500 mb-1">{m.label}</p>
              <p className="text-lg font-bold text-[#4E6ABF]">{m.val ?? "—"}<span className="text-xs text-gray-400 font-normal">/5</span></p>
              <p className="text-[10px] text-emerald-600 font-medium">{m.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Team-specific privacy threshold */}
      {selectedTeamId !== "all" && isTeamProtected && (
        <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#4E6ABF] flex items-center justify-center font-bold text-sm shrink-0">
            {teamInsight?.total_count || 0}/3
          </div>
          <div>
            <p className="text-xs font-semibold text-[#1F2A28]">Privacy Threshold Active ({teamInsight?.total_count || 0} of 3 received)</p>
            <p className="text-[11px] text-gray-600">Aggregated metrics for "{selectedTeamData?.team}" unlock when 3+ check-ins are received.</p>
          </div>
        </div>
      )}

      {/* AI Growth Feedback Section */}
      {selectedTeamId === "all" && (
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1F2A28]">AI Growth Feedback</h3>
              <p className="text-xs text-gray-500">Actionable insights generated from your organization's pulse data</p>
            </div>
          </div>

          {aiFeedback.length > 0 ? (
            <div className="space-y-3">
              {aiFeedback.map((fb, i) => {
                const style = typeStyles[fb.type] || typeStyles.growth;
                return (
                  <div key={i} className={`rounded-2xl p-4 border ${style.bg} ${style.border} transition-all hover:shadow-sm`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${style.badge}`}>
                        {fb.type === "positive" ? <TrendingUp size={14} /> :
                         fb.type === "critical" ? <AlertCircle size={14} /> :
                         fb.type === "attention" ? <AlertCircle size={14} /> :
                         <Sparkles size={14} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-[#1F2A28]">{fb.title}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${style.badge}`}>
                            {fb.type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed mb-2">{fb.text}</p>
                        <div className="flex items-start gap-1.5 p-2.5 rounded-xl bg-white/70 border border-gray-100">
                          <ArrowRight size={12} className="text-[#4E6ABF] shrink-0 mt-0.5" />
                          <p className="text-[11px] text-gray-600 leading-relaxed"><span className="font-semibold text-[#4E6ABF]">Action:</span> {fb.action}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-200 border-t-[#4E6ABF] rounded-full animate-spin" />
            </div>
          ) : (
            <Card>
              <p className="text-xs text-gray-500 text-center py-8">
                No data available yet. AI feedback will be generated as employees begin submitting check-ins.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Team-specific anonymous comments (when a team is selected) */}
      {selectedTeamId !== "all" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <p className="text-base font-semibold" style={{ color: T.text }}>Dimension Breakdown</p>
            </div>
            {teamMetrics && !isTeamProtected ? (
              <div className="space-y-3 pt-2">
                {[
                  { label: "Workload Manageability", val: teamMetrics.avg_workload },
                  { label: "Manager Support", val: teamMetrics.avg_manager_support },
                  { label: "Team Collaboration", val: teamMetrics.avg_team_collaboration },
                  { label: "Motivation & Energy", val: teamMetrics.avg_motivation },
                  { label: "Stress Balance", val: (6 - teamMetrics.avg_stress_level) },
                ].map((m) => (
                  <div key={m.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span style={{ color: T.text }}>{m.label}</span>
                      <span style={{ color: T.primary }}>{m.val} / 5.0</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(m.val / 5) * 100}%`, background: T.primary }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-xs text-gray-400">
                {isTeamProtected ? "Metrics protected under n ≥ 3 rule." : "No check-in data for this team."}
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <p className="text-base font-semibold" style={{ color: T.text }}>Anonymous Comments</p>
              {teamInsight?.anonymous_breakdown?.status === "available" && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#4E6ABF] border border-blue-100">
                  {teamInsight.anonymous_breakdown.comments?.length || 0} comments
                </span>
              )}
            </div>
            {teamInsight?.anonymous_breakdown?.status === "available" ? (
              teamInsight.anonymous_breakdown.comments && teamInsight.anonymous_breakdown.comments.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {teamInsight.anonymous_breakdown.comments.map((c, i) => (
                    <div key={i} className="p-3 rounded-xl text-xs bg-gray-50 border border-gray-100 text-gray-700 italic">"{c}"</div>
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
                <span>Comments remain locked until at least 3 anonymous check-ins are received.</span>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Team Comparison Table (all teams view) */}
      {selectedTeamId === "all" && allTeamInsights.length > 0 && (
        <Card className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-base font-semibold" style={{ color: T.text }}>Team Engagement Comparison</p>
              <p className="text-xs mt-0.5" style={{ color: T.muted }}>Engagement scores across all teams in {orgName} · Cycle: {satCycle.label} (Resets Sat)</p>
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Realtime
            </span>
          </div>
          <div className="space-y-2">
            {allTeamInsights.map((t) => (
              <div key={t.team_id} className="flex items-center gap-3 group">
                <span className="text-xs font-medium text-gray-700 w-36 truncate shrink-0">{t.team}</span>
                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(t.score || 0, 100)}%`, background: t.score >= 70 ? "#4E6ABF" : t.score >= 40 ? "#E8B960" : "#D96B6B" }}
                  />
                </div>
                <span className="text-xs font-bold w-12 text-right" style={{ color: t.score >= 70 ? "#4E6ABF" : t.score >= 40 ? "#9A6B1E" : "#D96B6B" }}>
                  {t.score || 0}
                </span>
                <span className="text-[10px] text-gray-400 w-20 text-right">{t.total_checkins} check-ins</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ============================================================
   ADMIN OVERVIEW & MODULES
   ============================================================ */
