import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "../../lib/auth";
import { useOrganization } from "../../lib/organization";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { T } from "../ui";
import {
  Home, MessageSquare, TrendingUp, Users, UserPlus, Layers, ListChecks, UploadCloud,
  Settings, Bell, ChevronDown, Lock, ArrowRight, Search, Menu, X, Sparkles,
  ArrowUp, ArrowDown, ShieldCheck, Check, LogOut, ArrowLeft, Copy, Building2, Plus, AlertCircle,
  RotateCw, Trash2, Link2, Send, Eye, EyeOff, Mail, ExternalLink, UserX, AlertTriangle, FileText, Download,
  Activity, Calendar, Clock, Heart, Award, Bot, Save, RefreshCw, CheckCircle2, ChevronRight, HelpCircle
} from "lucide-react";


export default function AcceptInviteView({ token, onAccepted, onGoToLogin }) {
  const { user, signUp, signIn, signOut } = useAuth();
  const { acceptInvitation } = useOrganization();

  // 1. Extract params from hash or query string
  const urlParams = useMemo(() => {
    if (typeof window === "undefined") return {};
    const raw = window.location.hash.includes("?")
      ? window.location.hash.split("?")[1]
      : (window.location.search ? window.location.search.replace(/^\?/, "") : "");
    const sp = new URLSearchParams(raw);
    return {
      token: sp.get("token") || token || "",
      email: sp.get("email") || "",
      org: sp.get("org") || "",
      role: sp.get("role") || "employee",
      team: sp.get("team") || "",
      name: sp.get("name") || "",
      temp: sp.get("temp") || "PeoplePulse123!",
    };
  }, [token]);

  // Derive sensible default human name from email (e.g. hemraj.patel -> Hemraj Patel)
  const deriveDefaultName = (email) => {
    if (!email) return "";
    const username = email.split("@")[0] || "";
    return username
      .replace(/[._-]/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  const [inputToken, setInputToken] = useState(urlParams.token || token || "");
  const [invitedEmail, setInvitedEmail] = useState(urlParams.email || "");
  const [orgName, setOrgName] = useState(urlParams.org || "");
  const [role, setRole] = useState(urlParams.role || "employee");
  const [teamName, setTeamName] = useState(urlParams.team || "");

  // Form states: pre-filled with zero-friction defaults
  const [fullName, setFullName] = useState(urlParams.name || deriveDefaultName(urlParams.email));
  const [password, setPassword] = useState(urlParams.temp || "PeoplePulse123!");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [successOrgName, setSuccessOrgName] = useState("");

  // Sync token if prop changes
  useEffect(() => {
    if (token) setInputToken(token);
  }, [token]);

  // Query verified invitation details from database if possible
  useEffect(() => {
    const curToken = inputToken.trim();
    if (!curToken || !supabase) return;

    let isMounted = true;
    supabase
      .rpc("get_invitation_details", { p_token: curToken })
      .then(({ data, error: rpcErr }) => {
        if (!isMounted) return;
        if (!rpcErr && data) {
          if (data.valid === false) {
            setError(data.error || "This invitation link is invalid or has expired.");
          } else {
            if (data.email) {
              setInvitedEmail(data.email);
              setFullName((prev) => prev || deriveDefaultName(data.email));
            }
            if (data.organization_name) setOrgName(data.organization_name);
            if (data.role) setRole(data.role);
            if (data.team_name) setTeamName(data.team_name);
          }
        }
      })
      .catch((err) => {
        // Fall back gracefully to URL parameters
        console.warn("Notice: get_invitation_details:", err.message);
      });

    return () => {
      isMounted = false;
    };
  }, [inputToken]);

  // Handle new employee account creation + acceptance
  const handleCreateAndAccept = async (e) => {
    e?.preventDefault();
    setError(null);

    const cleanToken = inputToken.trim();
    const cleanEmail = (invitedEmail || "").trim().toLowerCase();
    const cleanName = fullName.trim() || deriveDefaultName(cleanEmail) || "Employee";

    if (!cleanToken) {
      setError("Invitation token is missing. Please check your invitation link.");
      return;
    }
    if (!cleanEmail) {
      setError("Please provide the email address where you received the invitation.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Please choose a password with at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      if (isLoginMode) {
        // Mode 1: Log in with existing account credentials
        try {
          await signIn(cleanEmail, password);
        } catch (authErr) {
          // If sign-in failed, try provisioning in case password was set via invitation
          const { error: pErr } = await supabase.rpc("provision_and_accept_invitation", {
            p_token: cleanToken,
            p_password: password,
            p_full_name: cleanName,
          });
          if (pErr) throw authErr;
          await signIn(cleanEmail, password);
        }
        const result = await acceptInvitation(cleanToken);
        setSuccessOrgName(result?.organization_name || orgName || "the organization");
        setSuccess(true);
        setTimeout(() => onAccepted?.(), 1200);
      } else {
        // Mode 2: Zero-friction Instant Provisioning & Acceptance (Zero Supabase email rate limits!)
        const { data: provisionData, error: provisionErr } = await supabase.rpc("provision_and_accept_invitation", {
          p_token: cleanToken,
          p_password: password,
          p_full_name: cleanName,
        });

        if (provisionErr) {
          throw provisionErr;
        }

        // Direct sign-in immediately with newly verified credentials
        await signIn(cleanEmail, password);

        // Mark success and transition to employee dashboard
        setSuccessOrgName(provisionData?.organization_name || orgName || "the organization");
        setSuccess(true);
        setTimeout(() => onAccepted?.(), 1200);
      }
    } catch (err) {
      console.error("[Accept Invite Error]", err);
      setError(err.message || "Failed to complete setup. Please check your invitation link.");
    } finally {
      setLoading(false);
    }
  };

  // Handle accept when already logged in
  const handleLoggedInAccept = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await acceptInvitation(inputToken.trim());
      setSuccessOrgName(result?.organization_name || orgName || "the organization");
      setSuccess(true);
      setTimeout(() => onAccepted?.(), 1300);
    } catch (err) {
      setError(err.message || "Failed to accept invitation.");
    } finally {
      setLoading(false);
    }
  };

  const displayOrg = successOrgName || orgName || "the organization";
  const displayRole = (role || "employee").charAt(0).toUpperCase() + (role || "employee").slice(1);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: T.bg }}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border text-center relative overflow-hidden" style={{ borderColor: T.border }}>
        {/* Top brand header */}
        <img src="/logo.png" alt="PeoplePulse Logo" className="w-12 h-12 rounded-2xl mx-auto mb-4 shadow-sm object-cover" />

        <h2 className="text-2xl font-bold tracking-tight" style={{ color: T.text }}>
          Join {orgName || "PeoplePulse"}
        </h2>
        
        {/* Role & Team Badges */}
        <div className="flex items-center justify-center gap-2 mt-2 mb-3">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
            {displayRole}
          </span>
          {teamName && (
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
              {teamName}
            </span>
          )}
        </div>

        <p className="text-xs text-gray-500 leading-relaxed mb-6">
          You've been invited to join <b>{orgName || "your team"}</b> on PeoplePulse to participate in regular check-ins and confidential wellbeing insights.
        </p>

        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl text-xs bg-red-50 border border-red-200 text-red-700 leading-relaxed flex items-start gap-2 text-left animate-in fade-in">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Success celebration state */}
        {success ? (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center space-y-3 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-sm">
              <Check size={26} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-950">Welcome to {displayOrg}!</h3>
              <p className="text-xs text-emerald-700 mt-1">
                Your employee account is ready and joined to the team. Taking you to your dashboard...
              </p>
            </div>
            <div className="pt-2 flex justify-center">
              <div className="w-6 h-6 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
            </div>
          </div>
        ) : user ? (
          /* User already logged in */
          <div className="space-y-4 text-left">
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs space-y-1">
              <p className="text-gray-500 font-medium text-[11px]">Currently signed in as:</p>
              <p className="font-semibold text-blue-950 text-sm font-mono">{user.email}</p>
            </div>

            {invitedEmail && user.email.toLowerCase() !== invitedEmail.toLowerCase() && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Account Notice</p>
                  <p className="text-[11px] mt-0.5 text-amber-800 leading-relaxed">
                    This invite was sent to <b>{invitedEmail}</b>. To claim it with that email, sign out and set up your account.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut();
                      setIsLoginMode(false);
                    }}
                    className="mt-2 text-xs font-bold text-amber-900 underline hover:opacity-80 cursor-pointer"
                  >
                    Sign Out &amp; Join as {invitedEmail} &rarr;
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleLoggedInAccept}
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              style={{ background: T.primary }}
            >
              {loading ? "Joining Team..." : `Accept Invitation & Enter Dashboard →`}
            </button>
          </div>
        ) : (
          /* Unauthenticated: Create Employee Account Form */
          <form onSubmit={handleCreateAndAccept} className="space-y-3.5 text-left">
            {/* Fallback token input only if token was not in URL */}
            {!urlParams.token && (
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: T.text }}>Invitation Token</label>
                <input
                  type="text"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  placeholder="Paste invitation token here"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono outline-none focus:ring-2 bg-white transition-all"
                  style={{ borderColor: T.border }}
                />
              </div>
            )}

            {/* Invited Email Address */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700">Invited Email Address</label>
                {invitedEmail && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                    <Check size={10} /> Verified
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="email"
                  value={invitedEmail}
                  onChange={(e) => setInvitedEmail(e.target.value)}
                  placeholder="you@company.com"
                  readOnly={Boolean(urlParams.email)}
                  required
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all ${
                    urlParams.email ? "bg-gray-50 text-gray-700 cursor-not-allowed font-medium" : "bg-white focus:ring-2"
                  }`}
                  style={{ borderColor: T.border }}
                />
              </div>
            </div>

            {/* Full Name (for new employee account) */}
            {!isLoginMode && (
              <div>
                <label className="text-xs font-semibold block mb-1 text-gray-700">Your Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 bg-white transition-all"
                  style={{ borderColor: T.border }}
                />
              </div>
            )}

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700">
                  {isLoginMode ? "Account Password" : "Create or Set Password"}
                </label>
                {!isLoginMode && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Pre-filled default
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 bg-white transition-all"
                  style={{ borderColor: T.border }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {!isLoginMode && (
                <p className="text-[11px] text-gray-400 mt-1">
                  Default password pre-filled for 1-click join. You can keep it or change it now.
                </p>
              )}
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
              style={{ background: T.primary }}
            >
              {loading ? (
                <span>Setting up account &amp; joining...</span>
              ) : isLoginMode ? (
                <span>Log In &amp; Join {orgName || "Team"} &rarr;</span>
              ) : (
                <span>Join {orgName || "Team"} &amp; Open Dashboard &rarr;</span>
              )}
            </button>

            {/* Toggle Mode */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(!isLoginMode);
                  setError(null);
                }}
                className="text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
              >
                {isLoginMode ? (
                  <span>Need to create an account? <b className="text-[#4E6ABF] underline">Create one now</b></span>
                ) : (
                  <span>Already have an account? <b className="text-[#4E6ABF] underline">Log in with password</b></span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


/* ============================================================
   RESET PASSWORD VIEW (Supabase Recovery Email Link Flow)
   ============================================================ */
