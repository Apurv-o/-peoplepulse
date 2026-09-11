import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "../../lib/auth";
import { useOrganization } from "../../lib/organization";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { calculateEngagementScore } from "../../lib/engagementScoring";
import { getCurrentWeekMonday, formatWeekLabel, getTodayDate, getCurrentWeekSaturday, getSaturdayCycleRange } from "../../lib/dateUtils";

import { T, Card, ToggleSwitch, RiskBadge, Avatar, Delta, Sparkline, AIInsightCard, KPICard, Dropdown, RatingSelector, ToggleRow } from "../ui";
import { CHECKIN_DIMENSIONS } from "../../lib/constants";

import {
  Home, MessageSquare, TrendingUp, Users, UserPlus, Layers, ListChecks, UploadCloud,
  Settings, Bell, ChevronDown, Lock, ArrowRight, Search, Menu, X, Sparkles,
  ArrowUp, ArrowDown, ShieldCheck, Check, LogOut, ArrowLeft, Copy, Building2, Plus, AlertCircle,
  RotateCw, Trash2, Link2, Send, Eye, EyeOff, Mail, ExternalLink, UserX, AlertTriangle, FileText, Download,
  Activity, Calendar, Clock, Heart, Award, Bot, Save, RefreshCw, CheckCircle2, ChevronRight, HelpCircle
} from "lucide-react";

import Topbar from "../layout/Topbar";

export default function EmployeeCheckin({ setMobileOpen, onSubmitted }) {
  const { user } = useAuth();
  const { activeOrganizationId } = useOrganization();
  const [ratings, setRatings] = useState({});
  const [note, setNote] = useState("");
  const [anon, setAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [teamId, setTeamId] = useState(null);
  const [teamError, setTeamError] = useState(null);
  const [calculatedScore, setCalculatedScore] = useState(null);

  const DAILY_PROMPTS = [
    { key: "focus", label: "🎯 Today's Focus", prompt: "What was your main focus or accomplishment today?" },
    { key: "blocker", label: "🚧 Blockers", prompt: "Did any unexpected blockers or challenges slow you down today?" },
    { key: "win", label: "🌟 Wins & Highlights", prompt: "What went really well or gave you positive energy today?" },
    { key: "shoutout", label: "🤝 Team Kudos", prompt: "Would you like to give a shoutout to a teammate who supported you today?" },
    { key: "reflection", label: "💭 General Reflection", prompt: "Any thoughts on your workload, stress level, or wellbeing today?" },
  ];
  const [selectedPromptKey, setSelectedPromptKey] = useState("focus");

  const complete = CHECKIN_DIMENSIONS.every((d) => ratings[d.key]);

  // Resolve user's trusted team from database on mount or when active organization changes
  useEffect(() => {
    if (!user || !supabase) return;
    let isMounted = true;
    const rpcParams = activeOrganizationId ? { p_org_id: activeOrganizationId } : {};

    supabase.rpc("get_current_user_team_id", rpcParams).then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        if (error.message?.includes("NO_TEAM_ASSIGNED")) {
          setTeamError("Your account is not assigned to a team in this organization. Please contact your workspace administrator.");
        } else if (error.message?.includes("MULTIPLE_TEAMS_ASSIGNED")) {
          setTeamError("Your account is assigned to multiple teams. Please contact your workspace administrator.");
        } else {
          setTeamError(error.message);
        }
      } else {
        setTeamId(data);
        setTeamError(null);
      }
    });
    return () => { isMounted = false; };
  }, [user, activeOrganizationId]);

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!complete) return;
    if (note.length > 500) {
      setSubmitError("Comments must be 500 characters or less.");
      return;
    }

    if (supabase && user) {
      setSubmitting(true);
      try {
        // 1. Verify authenticated user directly from the active Supabase session
        const { data: userData, error: userError } = await supabase.auth.getUser();
        const authUser = userData?.user;

        if (userError || !authUser) {
          console.error("[Checkin Error] No active authenticated session:", userError);
          setSubmitError("No active authentication session. Please sign in again.");
          setSubmitting(false);
          return;
        }

        // 2. Resolve trusted team ID directly using the active organization
        const rpcParams = (activeOrganizationId) ? { p_org_id: activeOrganizationId } : {};
        const { data: currentTeamId, error: teamRpcError } = await supabase.rpc("get_current_user_team_id", rpcParams);
        if (teamRpcError || !currentTeamId) {
          console.error("[Checkin Error] Failed resolving team ID:", teamRpcError);
          if (teamRpcError?.message?.includes("NO_TEAM_ASSIGNED")) {
            setSubmitError("Your account is not assigned to a team in this organization. Please contact your workspace administrator.");
          } else if (teamRpcError?.message?.includes("MULTIPLE_TEAMS_ASSIGNED")) {
            setSubmitError("Your account is assigned to multiple teams. Please contact your administrator.");
          } else {
            setSubmitError(teamRpcError?.message || "Failed to resolve your assigned team.");
          }
          setSubmitting(false);
          return;
        }

        const todayDate = getTodayDate();
        const safeUUID = () => (typeof window !== "undefined" && window.crypto && typeof window.crypto.randomUUID === "function" ? window.crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; const v = c === "x" ? r : (r & 0x3) | 0x8; return v.toString(16); }));
        const checkinId = safeUUID();
        const processingToken = anon ? safeUUID() : null;

        // Resolve active organization ID from team
        let targetOrgId = activeOrganizationId;
        if (!targetOrgId) {
          const { data: teamRow } = await supabase
            .from("teams")
            .select("organization_id")
            .eq("id", currentTeamId)
            .maybeSingle();
          targetOrgId = teamRow?.organization_id;
        }

        // 3. Build payload strictly according to RLS specifications
        const payload = {
          id: checkinId,
          organization_id: targetOrgId,
          team_id: currentTeamId,
          user_id: anon ? null : authUser.id,
          week_start: todayDate,
          workload: Number(ratings.workload),
          manager_support: Number(ratings.support),
          team_collaboration: Number(ratings.collab),
          motivation: Number(ratings.motivation),
          stress_level: Number(ratings.stress),
          free_text: note.trim() || null,
          is_anonymous: Boolean(anon),
          processing_token: processingToken,
          source: "manual",
        };

        let insertErr = null;
        let insertedId = checkinId;

        if (anon) {
          const res = await supabase.from("checkins").insert(payload);
          insertErr = res.error;
        } else {
          const res = await supabase.from("checkins").insert(payload).select("id").maybeSingle();
          insertErr = res.error;
          if (res.data?.id) insertedId = res.data.id;
        }

        if (insertErr) {
          console.error("[Checkin Insert Error Details]:", insertErr);
          if (insertErr.code === "23505" || insertErr.message?.includes("unique_named")) {
            setSubmitError("You've already submitted your check-in for today.");
          } else {
            setSubmitError(insertErr.message || "Failed to submit check-in. Please try again.");
          }
          setSubmitting(false);
          return;
        }

        // 6. Retrieve trigger-calculated engagement score if named, or calculate for confirmation
        let dbScore = null;
        if (!anon && insertedId) {
          const { data: scoreData } = await supabase
            .from("sentiment_results")
            .select("engagement_score")
            .eq("checkin_id", insertedId)
            .maybeSingle();
          if (scoreData?.engagement_score != null) {
            dbScore = Math.round(Number(scoreData.engagement_score));
          }
        }

        const finalScore = dbScore ?? calculateEngagementScore(ratings);
        setCalculatedScore(finalScore);
        setSubmitted(true);

        // Broadcast instant pulse event across active organization dashboard tabs
        try {
          const broadcastChannel = supabase.channel(`org-pulse-${targetOrgId}`);
          const sendPulse = () => {
            broadcastChannel.send({
              type: "broadcast",
              event: "checkin_submitted",
              payload: {
                teamId: currentTeamId,
                organizationId: targetOrgId,
                isAnonymous: Boolean(anon),
                timestamp: new Date().toISOString(),
              },
            });
          };
          if (broadcastChannel.state === "joined" || broadcastChannel.state === "subscribed") {
            sendPulse();
          } else {
            broadcastChannel.subscribe((status) => {
              if (status === "SUBSCRIBED") {
                sendPulse();
              }
            });
          }
        } catch (bErr) {
          console.warn("[Broadcast Diagnostic]", bErr);
        }

        // 7. Asynchronously trigger Gemini AI sentiment analysis if meaningful free_text was entered (at least 3 characters)
        if (note.trim().length >= 3 && insertedId) {
          (async () => {
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              const accessToken = sessionData?.session?.access_token;

              if (!accessToken) {
                console.warn("[AI Sentiment Background Diagnostic] No active session access token available for sentiment processing.");
                return;
              }

              const { data, error } = await supabase.functions.invoke("analyze-sentiment", {
                body: {
                  checkin_id: insertedId,
                  processing_token: processingToken || undefined,
                },
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              });

              if (error) {
                console.warn("[AI Sentiment Background Warning] Sentiment processing failed:", error.message);
              } else {
                console.log("[AI Sentiment Background Success] Sentiment processing completed successfully.");
              }
            } catch (err) {
              console.warn("[AI Sentiment Background Network Warning] Network failure during sentiment invocation:", err.message);
            }
          })();
        }
      } catch (err) {
        console.error("[Check-in Submission Unexpected Error]", err);
        setSubmitError(err.message || "An unexpected error occurred during submission.");
      } finally {
        setSubmitting(false);
      }
    } else {
      // Demo simulation fallback
      const demoScore = calculateEngagementScore(ratings);
      setCalculatedScore(demoScore);
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto text-center py-12 animate-scale-in">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg animate-pop-in"
          style={{ background: T.positiveBg }}
        >
          <Check size={30} style={{ color: T.positive }} />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: T.text }}>Daily check-in complete!</h2>
        <p className="text-sm mt-1" style={{ color: T.muted }}>Thank you for sharing today's pulse.</p>

        <Card className="mt-8 text-left interactive-card">
          <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: T.muted }}>Your engagement index today</p>
          <div className="flex items-baseline gap-1 mt-1.5">
            <span className="text-4xl font-extrabold tracking-tight" style={{ color: T.text }}>{calculatedScore ?? 80}</span>
            <span className="text-sm font-medium" style={{ color: T.muted }}>/ 100</span>
          </div>
          <p className="text-xs mt-2.5 leading-relaxed" style={{ color: T.muted }}>
            Calculated deterministically based on workload, manager support, team collaboration, motivation, and stress balance.
          </p>
        </Card>

        <button
          onClick={() => onSubmitted?.()}
          className="w-full mt-6 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          style={{ background: T.primary }}
        >
          View your wellbeing history <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  const activePromptObj = DAILY_PROMPTS.find((p) => p.key === selectedPromptKey) || DAILY_PROMPTS[0];

  return (
    <div className="max-w-lg mx-auto">
      <Topbar
        title="Daily Check-in"
        subtitle={`Takes ~60 seconds to complete. Today's pulse • ${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}`}
        setMobileOpen={setMobileOpen}
      />

      {teamError && (
        <div className="mb-4 p-3.5 rounded-xl text-xs bg-amber-50 border border-amber-200 text-amber-800 leading-relaxed flex items-start gap-2">
          <span className="text-sm">⚠️</span>
          <span>{teamError}</span>
        </div>
      )}

      {submitError && (
        <div className="mb-4 p-3.5 rounded-xl text-xs bg-red-50 border border-red-200 text-red-700 leading-relaxed flex items-start gap-2">
          <span className="text-sm">❌</span>
          <span>{submitError}</span>
        </div>
      )}

      <Card>
        {CHECKIN_DIMENSIONS.map((d) => (
          <RatingSelector
            key={d.key}
            label={d.label}
            value={ratings[d.key]}
            onChange={(v) => setRatings((r) => ({ ...r, [d.key]: v }))}
          />
        ))}
      </Card>

      {/* Daily Reflection Prompt */}
      <Card className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">💡</span>
            <p className="text-sm font-semibold" style={{ color: T.text }}>Daily Reflection Prompt</p>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
            Today's Prompt
          </span>
        </div>

        {/* Prompt Category Chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {DAILY_PROMPTS.map((p) => {
            const isSelected = selectedPromptKey === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setSelectedPromptKey(p.key)}
                className="text-xs px-2.5 py-1 rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  borderColor: isSelected ? T.primary : T.border,
                  background: isSelected ? "#EEF1FA" : "white",
                  color: isSelected ? T.primaryDark : T.text,
                  fontWeight: isSelected ? 600 : 400,
                  boxShadow: isSelected ? "0 2px 8px rgba(78, 106, 191, 0.12)" : "none",
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-gray-600 mb-2 italic">
          "{activePromptObj.prompt}"
        </p>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 500))}
          placeholder="Share your thoughts, blockers, or highlights today..."
          rows={3}
          className="w-full rounded-xl border p-3 text-sm outline-none resize-none bg-[#FDFDFD] focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
          style={{ borderColor: T.border }}
        />
        <p className="text-xs text-right mt-1" style={{ color: T.muted }}>{note.length} / 500</p>
      </Card>

      <Card className={`mt-4 transition-all duration-300 ${anon ? "border-blue-200/90 bg-blue-50/15 shadow-sm" : ""}`}>
        <div
          className="flex items-center justify-between gap-4 cursor-pointer select-none"
          onClick={() => setAnon(!anon)}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold" style={{ color: T.text }}>Submit anonymously</p>
              {anon ? (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
                  <ShieldCheck size={11} className="text-emerald-600" /> Identity Protected
                </span>
              ) : (
                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  Public Check-in
                </span>
              )}
            </div>
            <p className="text-xs mt-1 flex items-center gap-1.5 text-gray-500 leading-relaxed">
              <Lock size={12} className={`shrink-0 transition-colors duration-200 ${anon ? "text-[#4E6ABF]" : "text-gray-400"}`} />
              <span>
                {anon
                  ? "Your name and account are completely detached before saving to the database."
                  : "Your manager will see your name attached to this check-in."}
              </span>
            </p>
          </div>
          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
            <ToggleSwitch
              checked={anon}
              onChange={() => setAnon(!anon)}
              ariaLabel="Submit anonymously toggle"
            />
          </div>
        </div>
      </Card>

      <button
        disabled={!complete || submitting || Boolean(user && teamError)}
        onClick={handleSubmit}
        className="w-full mt-5 py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] group cursor-pointer relative overflow-hidden"
        style={{
          background: complete
            ? "linear-gradient(135deg, #4E6ABF 0%, #344A91 100%)"
            : T.primary,
          boxShadow: complete
            ? "0 12px 24px -6px rgba(78, 106, 191, 0.45), 0 4px 12px -2px rgba(78, 106, 191, 0.2)"
            : "none",
        }}
      >
        {complete && !submitting && (
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
        )}

        {submitting ? (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            <span>Submitting securely...</span>
          </>
        ) : (
          <>
            <span>Submit daily check-in</span>
            <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
          </>
        )}
      </button>
    </div>
  );
}

