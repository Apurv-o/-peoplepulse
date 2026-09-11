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

export default function EmployeeDashboard({ setMobileOpen, setView }) {
  const { user } = useAuth();
  const { activeOrganizationId } = useOrganization();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchEmployeeHistory = useCallback(() => {
    if (!user || !supabase) return;
    setLoading(true);

    let query = supabase
      .from("checkins")
      .select(`
        id,
        week_start,
        workload,
        manager_support,
        team_collaboration,
        motivation,
        stress_level,
        created_at,
        sentiment_results (
          engagement_score,
          sentiment_label
        )
      `)
      .order("week_start", { ascending: false });

    if (activeOrganizationId) {
      query = query.eq("organization_id", activeOrganizationId);
    }

    query.then(({ data, error }) => {
      if (!error && data) {
        setHistory(data);
      }
      setLoading(false);
    });
  }, [user, activeOrganizationId]);

  useEffect(() => {
    fetchEmployeeHistory();

    if (!user || !supabase) return;

    // Midnight rollover timer: refresh history at 12:00 AM midnight
    const now = new Date();
    const tomorrowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const msUntilMidnight = Math.max(1000, tomorrowMidnight.getTime() - now.getTime());
    const midnightTimer = setTimeout(() => {
      fetchEmployeeHistory();
    }, msUntilMidnight);

    const channel = supabase
      .channel(`employee-checkins-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checkins",
        },
        () => {
          fetchEmployeeHistory();
        }
      )
      .on(
        "broadcast",
        { event: "checkin_submitted" },
        () => {
          fetchEmployeeHistory();
        }
      )
      .subscribe();

    return () => {
      clearTimeout(midnightTimer);
      supabase.removeChannel(channel);
    };
  }, [user, activeOrganizationId, fetchEmployeeHistory]);

  const hasRealData = history.length > 0;
  const todayDateStr = getTodayDate();
  const hasCheckedInToday = history.some((c) => c.week_start === todayDateStr);
  const latest = history[0];
  const previous = history[1];

  const resolveSentiment = (c) => {
    const rawLabel = c?.sentiment_results?.sentiment_label;
    if (rawLabel) {
      return rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1).toLowerCase();
    }
    const score = c?.sentiment_results?.engagement_score != null
      ? Number(c.sentiment_results.engagement_score)
      : calculateEngagementScore(c);
    if (score >= 70) return "Positive";
    if (score >= 50) return "Neutral";
    return "Needs Attention";
  };

  const latestScore = hasRealData
    ? (latest.sentiment_results?.engagement_score != null
        ? Math.round(Number(latest.sentiment_results.engagement_score))
        : calculateEngagementScore(latest))
    : (user ? "—" : 82);

  const previousScore = previous
    ? (previous.sentiment_results?.engagement_score != null
        ? Math.round(Number(previous.sentiment_results.engagement_score))
        : calculateEngagementScore(previous))
    : null;

  const scoreDelta = previousScore != null && typeof latestScore === "number" ? (latestScore - previousScore) : null;
  const stressVal = hasRealData ? Number(latest.stress_level) : (user ? "—" : 2.1);
  const streak = hasRealData ? history.length : (user ? 0 : 6);
  const sentimentVal = hasRealData
    ? resolveSentiment(latest)
    : (user ? "—" : "Positive");

  const trendData = hasRealData
    ? [...history].reverse().map((c) => ({
        week: formatWeekLabel(c.week_start) || c.week_start,
        score: c.sentiment_results?.engagement_score != null
          ? Math.round(Number(c.sentiment_results.engagement_score))
          : calculateEngagementScore(c),
      }))
    : [];

  const displayList = hasRealData
    ? history.map((c) => {
        const sentiment = resolveSentiment(c);
        const score = c.sentiment_results?.engagement_score != null
          ? Math.round(Number(c.sentiment_results.engagement_score))
          : calculateEngagementScore(c);
        return {
          date: formatWeekLabel(c.week_start) || c.week_start,
          engagement: score,
          stress: `${c.stress_level} / 5`,
          sentiment,
        };
      })
    : [];

  const sentimentColor = sentimentVal === "Positive" ? "#3F7A5C" : sentimentVal === "Neutral" ? "#9A6B1E" : "#A3392F";
  const sentimentBg = sentimentVal === "Positive" ? T.positiveBg : sentimentVal === "Neutral" ? T.amberBg : T.negativeBg;

  return (
    <div>
      <Topbar
        title="Your Wellbeing"
        subtitle="A quiet look at how you've been doing over the past month."
        setMobileOpen={setMobileOpen}
        right={
          <button
            onClick={() => setView?.("employee-checkin")}
            className="text-xs font-semibold px-3 py-2 rounded-xl text-white flex items-center gap-1"
            style={{ background: T.primary }}
          >
            Check in now <ArrowRight size={12} />
          </button>
        }
      />

      {/* Daily Pulse Active Notification Banner */}
      {!hasCheckedInToday ? (
        <div className="mb-6 p-4 rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50/60 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0">
              <Bell size={18} className="animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                  New Day — Daily Pulse Active
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                  Cycle Reset at 12:00 AM
                </span>
              </div>
              <p className="text-xs text-blue-900/80 mt-0.5 leading-relaxed">
                Daily participation has reset for today. Share how you're feeling — your check-in is confidential and takes only ~60 seconds.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setView?.("employee-checkin")}
            className="w-full sm:w-auto shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#4E6ABF] hover:bg-[#344A91] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Complete Today's Check-in <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div className="mb-6 px-4 py-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
            <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
            <span>You have completed today's pulse check-in. Next daily cycle opens at 12:00 AM midnight.</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 shrink-0">
            Recorded for Today
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Engagement" value={latestScore} unit="/ 100" delta={scoreDelta} goodDirection="up" />
        <KPICard label="Stress level" value={stressVal} unit="/ 5" delta={-0.5} goodDirection="down" />
        <KPICard label="Check-in streak" value={streak} unit={streak === 1 ? "day" : "days"} />
        <Card interactive>
          <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: T.muted }}>Latest sentiment</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-extrabold tracking-tight" style={{ color: sentimentColor }}>
              {sentimentVal}
            </span>
          </div>
          <div className="mt-3 min-h-[24px] flex items-center">
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5"
              style={{ background: sentimentBg, color: sentimentColor }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: sentimentColor }} />
              {sentimentVal}
            </span>
          </div>
        </Card>
      </div>
      <Card className="mb-6">
        <p className="text-base font-semibold mb-4" style={{ color: T.text }}>Your engagement trend</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trendData} margin={{ left: -20 }}>
            <CartesianGrid vertical={false} stroke={T.border} />
            <XAxis dataKey="week" tick={{ fontSize: 12, fill: T.muted }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: T.muted }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${T.border}`, fontSize: 13 }} />
            <Line type="monotone" dataKey="score" stroke={T.primary} strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <p className="text-base font-semibold mb-3" style={{ color: T.text }}>Your recent check-ins</p>
        {displayList.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: T.muted }}>No identified check-ins yet. Submit your daily check-in to see your history.</p>
        ) : (
          <div className="space-y-2">
            {displayList.map((c, i) => {
              const isPos = c.sentiment === "Positive";
              const isNeut = c.sentiment === "Neutral";
              const fg = isPos ? "#3F7A5C" : isNeut ? "#9A6B1E" : "#A3392F";
              const bg = isPos ? T.positiveBg : isNeut ? T.amberBg : T.negativeBg;

              return (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl border transition-all hover:bg-gray-50/80"
                  style={{ borderColor: T.border }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#EEF1FA] text-[#4E6ABF] font-bold text-xs flex items-center justify-center shrink-0">
                      {c.date.slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: T.text }}>{c.date}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <span>Score: <b className="text-gray-700 font-semibold">{c.engagement}</b></span>
                        <span>•</span>
                        <span>Stress: <b className="text-gray-700 font-semibold">{c.stress}</b></span>
                      </div>
                    </div>
                  </div>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 inline-flex items-center gap-1.5"
                    style={{ background: bg, color: fg }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: fg }} />
                    {c.sentiment}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ============================================================
   ADMIN INSIGHTS — Organization-Wide AI Growth Feedback
   ============================================================ */
function generateAIGrowthFeedback(orgData, teams) {
  const feedback = [];
  const { org_score, total_checkins, sentiment_split } = orgData;
  const teamList = teams || [];

  // Overall engagement assessment
  if (org_score >= 75) {
    feedback.push({
      type: "positive",
      title: "Strong Organizational Health",
      text: `Your organization's engagement score of ${org_score}/100 indicates a healthy and motivated workforce. Employees are generally satisfied with their work environment, leadership, and collaboration.`,
      action: "Continue reinforcing positive practices. Consider sharing anonymized success metrics with teams to sustain momentum.",
    });
  } else if (org_score >= 50) {
    feedback.push({
      type: "attention",
      title: "Moderate Engagement — Room for Growth",
      text: `With an engagement score of ${org_score}/100, your organization shows functional engagement but there are clear opportunities for improvement. Some teams may be experiencing higher stress or lower motivation.`,
      action: "Identify underperforming teams and schedule 1:1s with their managers. Focus on workload balance and recognition programs.",
    });
  } else if (org_score > 0) {
    feedback.push({
      type: "critical",
      title: "Low Engagement Alert",
      text: `An engagement score of ${org_score}/100 signals significant organizational challenges. Employees may be experiencing burnout, lack of support, or disengagement.`,
      action: "Prioritize an all-hands wellbeing check-in. Consider anonymous feedback sessions and immediate workload audits across teams.",
    });
  }

  // Participation analysis
  if (total_checkins > 0 && teamList.length > 0) {
    const avgPerTeam = Math.round(total_checkins / teamList.length);
    const activeTeams = teamList.filter((t) => t.total_checkins > 0).length;
    const inactiveTeams = teamList.length - activeTeams;

    if (inactiveTeams > 0) {
      feedback.push({
        type: "attention",
        title: `${inactiveTeams} Team${inactiveTeams > 1 ? "s" : ""} with Zero Check-ins`,
        text: `${inactiveTeams} out of ${teamList.length} teams have not submitted any check-ins yet. Low participation reduces your visibility into team wellbeing and limits the accuracy of organizational insights.`,
        action: "Send a gentle reminder to inactive team managers. Consider making check-ins part of the weekly team routine.",
      });
    }

    if (avgPerTeam >= 5) {
      feedback.push({
        type: "positive",
        title: "Healthy Participation Rate",
        text: `Teams average ${avgPerTeam} check-ins each, showing strong adoption of the pulse survey system. This level of participation yields reliable and actionable insights.`,
        action: "Maintain this momentum by acknowledging participation and sharing aggregate trends with the organization.",
      });
    }
  } else if (total_checkins === 0) {
    feedback.push({
      type: "critical",
      title: "No Check-in Data Available",
      text: "No employees have submitted check-ins yet. Without participation data, organizational insights cannot be generated.",
      action: "Kickstart adoption by having managers lead by example. Send an organization-wide announcement about the purpose and confidentiality of check-ins.",
    });
  }

  // Sentiment analysis
  if (sentiment_split && sentiment_split.length > 0) {
    const positive = sentiment_split.find((s) => s.name === "Positive");
    const negative = sentiment_split.find((s) => s.name === "Negative");
    const neutral = sentiment_split.find((s) => s.name === "Neutral");

    if (negative && negative.value >= 30) {
      feedback.push({
        type: "critical",
        title: "High Negative Sentiment Detected",
        text: `${negative.value}% of employee feedback carries negative sentiment. This could indicate systemic issues with workload, management support, or team dynamics.`,
        action: "Investigate which teams drive the highest negative sentiment. Consider immediate manager training on empathetic leadership and stress management.",
      });
    } else if (positive && positive.value >= 60) {
      feedback.push({
        type: "positive",
        title: "Overwhelmingly Positive Sentiment",
        text: `${positive.value}% of employee feedback is positive, reflecting a supportive and energizing work culture. This is an excellent indicator of organizational health.`,
        action: "Publicly celebrate this milestone (anonymized). Use positive sentiment as a benchmark for future pulse cycles.",
      });
    } else if (neutral && neutral.value >= 50) {
      feedback.push({
        type: "attention",
        title: "Predominantly Neutral Sentiment",
        text: `${neutral.value}% of feedback is neutral, suggesting employees are neither particularly satisfied nor dissatisfied. This 'middle ground' can be an early warning signal.`,
        action: "Dig deeper with open-ended questions. Neutral sentiment often masks unspoken concerns — proactively engage with team leads.",
      });
    }
  }

  // Team variance analysis
  if (teamList.length >= 2) {
    const scores = teamList.filter((t) => t.score > 0).map((t) => t.score);
    if (scores.length >= 2) {
      const max = Math.max(...scores);
      const min = Math.min(...scores);
      const gap = max - min;
      if (gap > 30) {
        const bestTeam = teamList.find((t) => t.score === max);
        const worstTeam = teamList.find((t) => t.score === min);
        feedback.push({
          type: "attention",
          title: `${gap}-Point Engagement Gap Between Teams`,
          text: `"${bestTeam?.team}" scores ${max}/100 while "${worstTeam?.team}" scores ${min}/100. Large disparities suggest inconsistent management practices or uneven workload distribution.`,
          action: `Facilitate a cross-team knowledge share between "${bestTeam?.team}" and "${worstTeam?.team}". Identify what's working well and replicate those practices.`,
        });
      }
    }
  }

  // Growth recommendation
  feedback.push({
    type: "growth",
    title: "Growth Recommendation",
    text: teamList.length < 3
      ? "Consider structuring your organization into more focused teams (3+). Smaller, purpose-driven teams tend to have higher engagement and clearer accountability."
      : total_checkins < teamList.length * 3
        ? "Focus on increasing check-in participation to at least 3 per team. This unlocks privacy-protected insights and gives you a clearer picture of organizational health."
        : "Your organization is on a solid trajectory. To accelerate growth, establish weekly pulse review rituals with team leads and track engagement trends month-over-month.",
    action: "Set a recurring monthly review of these insights with your leadership team to identify trends early and course-correct proactively.",
  });

  return feedback;
}

