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


export default function EmployeeDailyHistoryModal({ member, orgId, onClose }) {
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterMode, setFilterMode] = useState("all");

  const targetUserId = member?.user_id;

  useEffect(() => {
    if (!targetUserId || !orgId || !supabase) return;
    setLoading(true);
    setError(null);

    supabase
      .rpc("get_employee_daily_history", {
        p_org_id: orgId,
        p_target_user_id: targetUserId,
      })
      .then(({ data, error: rpcErr }) => {
        setLoading(false);
        if (rpcErr) {
          setError(rpcErr.message);
        } else if (data) {
          setHistoryData(data);
        }
      })
      .catch((err) => {
        setLoading(false);
        setError(err.message || "Failed to load employee history.");
      });
  }, [targetUserId, orgId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const p = member?.profiles || {};
  const empName = historyData?.employee?.name || p.name || "Team Member";
  const empEmail = historyData?.employee?.email || p.email || member?.user_id;
  const empId = historyData?.employee?.employee_id || member?.employee_id || p.employee_id;
  const teamName = historyData?.employee?.team_name || "Unassigned";
  const role = historyData?.employee?.role || member?.role || "employee";
  const joinedDate = historyData?.employee?.joined_at || member?.joined_at;

  const metrics = historyData?.metrics || {};
  const historyList = historyData?.history || [];

  const filteredHistory = historyList.filter((item) => {
    if (filterMode === "high-stress") return Number(item.stress_level) >= 3;
    if (filterMode === "with-notes") return Boolean(item.free_text && item.free_text.trim());
    return true;
  });

  const getStressBadge = (level) => {
    const lvl = Number(level);
    if (lvl >= 4) {
      return {
        label: `Critical (${lvl}/5)`,
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        dot: "bg-red-500",
        fg: "#DC2626",
      };
    }
    if (lvl === 3) {
      return {
        label: `Moderate (${lvl}/5)`,
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        dot: "bg-amber-500",
        fg: "#D97706",
      };
    }
    return {
      label: `Low / Healthy (${lvl}/5)`,
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
      fg: "#059669",
    };
  };

  const getInitials = (nameStr) => {
    if (!nameStr) return "TM";
    const parts = nameStr.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatDateLabel = (dStr) => {
    if (!dStr) return "Date Unknown";
    try {
      const parts = dStr.split("-");
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
      return new Date(dStr).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dStr;
    }
  };

  const formatSubmissionTime = (tStr) => {
    if (!tStr) return "";
    try {
      return new Date(tStr).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const overallStressBadge = getStressBadge(metrics.avg_stress || 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 modal-backdrop overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl relative border border-gray-200 overflow-hidden modal-dialog animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b bg-gradient-to-b from-gray-50/80 to-white flex items-start justify-between gap-4 shrink-0" style={{ borderColor: T.border }}>
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4E6ABF] to-[#344A91] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
              {getInitials(empName)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold truncate" style={{ color: T.text }}>{empName}</h3>
                {empId && (
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded border bg-slate-50 text-slate-700 border-slate-200 inline-flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 select-none">#</span>
                    {empId}
                  </span>
                )}
                <span className={`capitalize text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  role === "owner" ? "bg-purple-50 text-purple-700 border border-purple-200" :
                  role === "admin" ? "bg-indigo-50 text-indigo-700 border border-indigo-200" :
                  role === "manager" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                  "bg-gray-100 text-gray-700 border border-gray-200"
                }`}>
                  {role}
                </span>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {teamName}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                <span>{empEmail}</span>
                {joinedDate && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span>Joined {new Date(joinedDate).toLocaleDateString()}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-xl hover:bg-gray-100 cursor-pointer shrink-0"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-[#FBFBFA]">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
              <RotateCw size={28} className="animate-spin text-[#4E6ABF]" />
              <p className="text-sm font-semibold text-gray-700">Loading daily check-in forms & stress metrics...</p>
              <p className="text-xs text-gray-400">Fetching historical records for {empName}</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2.5">
              <AlertCircle size={16} className="text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* Analytics Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">Average Stress</p>
                    <span className={`w-2 h-2 rounded-full ${overallStressBadge.dot}`} />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold" style={{ color: overallStressBadge.fg }}>
                      {metrics.avg_stress || 0}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">/ 5.0</span>
                  </div>
                  <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${overallStressBadge.bg} ${overallStressBadge.text} ${overallStressBadge.border}`}>
                    {overallStressBadge.label}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs space-y-2">
                  <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">Avg Engagement</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-blue-600">
                      {metrics.avg_engagement || 0}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">/ 100</span>
                  </div>
                  <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {metrics.avg_engagement >= 70 ? "High Engagement" : metrics.avg_engagement >= 50 ? "Moderate" : "Needs Support"}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs space-y-2">
                  <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">Daily Forms Submitted</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-gray-800">
                      {metrics.total_checkins || 0}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">forms</span>
                  </div>
                  <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {metrics.total_checkins > 0 ? "Active Participant" : "No Submissions"}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs space-y-2">
                  <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">Workload & Support</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-gray-500">Workload:</span>
                      <span className="text-gray-800 font-bold">{metrics.avg_workload || 0}/5</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-gray-500">Support:</span>
                      <span className="text-gray-800 font-bold">{metrics.avg_manager_support || 0}/5</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5 Core Dimensions Visual Breakdown */}
              <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Activity size={16} className="text-[#4E6ABF]" />
                    <span>Core Dimensions Average Rating</span>
                  </h4>
                  <span className="text-[11px] text-gray-400">Based on {metrics.total_checkins || 0} check-in(s)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {[
                    { label: "Workload Manageability", val: metrics.avg_workload || 0, color: "#4E6ABF" },
                    { label: "Manager Support", val: metrics.avg_manager_support || 0, color: "#3B82F6" },
                    { label: "Team Collaboration", val: metrics.avg_team_collaboration || 0, color: "#6366F1" },
                    { label: "Motivation & Energy", val: metrics.avg_motivation || 0, color: "#8B5CF6" },
                    {
                      label: "Stress Level",
                      val: metrics.avg_stress || 0,
                      color: (metrics.avg_stress || 0) >= 4 ? "#DC2626" : (metrics.avg_stress || 0) >= 3 ? "#D97706" : "#059669",
                      isStress: true,
                    },
                  ].map((dim) => (
                    <div key={dim.label} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-gray-600">{dim.label}</span>
                        <span className="font-bold" style={{ color: dim.color }}>{dim.val} / 5.0</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, ((dim.val) / 5) * 100)}%`, background: dim.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Check-ins Timeline Section */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Calendar size={16} className="text-[#4E6ABF]" />
                      <span>Daily Form Submissions History</span>
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Review previous daily pulse answers, stress levels, and feedback comments.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 border border-gray-200 text-xs self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setFilterMode("all")}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        filterMode === "all" ? "bg-white text-gray-900 shadow-xs font-semibold" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      All ({historyList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode("high-stress")}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        filterMode === "high-stress" ? "bg-white text-red-700 shadow-xs font-semibold" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Elevated Stress ({historyList.filter((h) => Number(h.stress_level) >= 3).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode("with-notes")}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        filterMode === "with-notes" ? "bg-white text-blue-700 shadow-xs font-semibold" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      With Notes ({historyList.filter((h) => h.free_text && h.free_text.trim()).length})
                    </button>
                  </div>
                </div>

                {/* Submissions List */}
                {filteredHistory.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-white border border-gray-200 text-center space-y-2">
                    <Calendar size={24} className="mx-auto text-gray-400" />
                    <p className="text-sm font-bold text-gray-800">No matching check-in forms found</p>
                    <p className="text-xs text-gray-500">
                      {historyList.length === 0
                        ? `No daily forms have been submitted by ${empName} yet. The daily check-in cycle resets at 12:00 AM.`
                        : "Try selecting a different filter above."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {filteredHistory.map((item) => {
                      const stressBadge = getStressBadge(item.stress_level);
                      const isHighStress = Number(item.stress_level) >= 4;

                      return (
                        <div
                          key={item.id}
                          className={`p-4 sm:p-5 rounded-2xl bg-white border transition-all hover:shadow-sm space-y-3.5 ${
                            isHighStress ? "border-red-200 bg-red-50/10" : "border-gray-200"
                          }`}
                        >
                          {/* Form Date & Top Badges */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3" style={{ borderColor: T.border }}>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                                <Calendar size={14} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900">{formatDateLabel(item.date)}</p>
                                {item.created_at && (
                                  <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                    <Clock size={11} />
                                    <span>Submitted {formatSubmissionTime(item.created_at)}</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Stress Badge */}
                              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${stressBadge.bg} ${stressBadge.text} ${stressBadge.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${stressBadge.dot}`} />
                                <span>Stress: {item.stress_level} / 5</span>
                              </span>

                              {/* Engagement Score Badge */}
                              {item.engagement_score != null && (
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                  item.engagement_score >= 70 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  item.engagement_score >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" :
                                  "bg-red-50 text-red-700 border-red-200"
                                }`}>
                                  Engagement: {item.engagement_score}/100 ({item.sentiment_label || "Score"})
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 5 Dimensions Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-0.5">
                            <div className="p-2.5 rounded-xl bg-gray-50/80 border border-gray-100 space-y-0.5">
                              <span className="text-[10px] uppercase font-bold text-gray-400">Workload</span>
                              <p className="text-sm font-bold text-gray-800">{item.workload} / 5</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-gray-50/80 border border-gray-100 space-y-0.5">
                              <span className="text-[10px] uppercase font-bold text-gray-400">Support</span>
                              <p className="text-sm font-bold text-gray-800">{item.manager_support} / 5</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-gray-50/80 border border-gray-100 space-y-0.5">
                              <span className="text-[10px] uppercase font-bold text-gray-400">Team Collab</span>
                              <p className="text-sm font-bold text-gray-800">{item.team_collaboration} / 5</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-gray-50/80 border border-gray-100 space-y-0.5">
                              <span className="text-[10px] uppercase font-bold text-gray-400">Motivation</span>
                              <p className="text-sm font-bold text-gray-800">{item.motivation} / 5</p>
                            </div>
                            <div className={`p-2.5 rounded-xl border space-y-0.5 col-span-2 sm:col-span-1 ${
                              isHighStress ? "bg-red-50 border-red-200" : "bg-gray-50/80 border-gray-100"
                            }`}>
                              <span className={`text-[10px] uppercase font-bold ${isHighStress ? "text-red-500" : "text-gray-400"}`}>Stress Level</span>
                              <p className={`text-sm font-bold ${isHighStress ? "text-red-700" : "text-gray-800"}`}>
                                {item.stress_level} / 5
                              </p>
                            </div>
                          </div>

                          {/* Free-text comment / note */}
                          {item.free_text && item.free_text.trim() ? (
                            <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50/60 via-indigo-50/30 to-blue-50/40 border border-blue-200/70 space-y-1">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-900">
                                <MessageSquare size={13} className="text-[#4E6ABF]" />
                                <span>Employee Daily Form Comment:</span>
                              </div>
                              <p className="text-xs text-gray-700 italic leading-relaxed pl-1">
                                "{item.free_text}"
                              </p>
                            </div>
                          ) : (
                            <p className="text-[11px] text-gray-400 italic">No additional comments attached.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t bg-white flex items-center justify-between gap-3 shrink-0" style={{ borderColor: T.border }}>
          <p className="text-xs text-gray-400">
            Confidential employee wellbeing records · Admin access authorized
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

