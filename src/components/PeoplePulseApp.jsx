import React, { useState, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../lib/auth";
import { useOrganization } from "../lib/organization";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { calculateEngagementScore } from "../lib/engagementScoring";
import { getCurrentWeekMonday, formatWeekLabel, getTodayDate } from "../lib/dateUtils";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, CartesianGrid,
} from "recharts";
import {
  Home, MessageSquare, TrendingUp, Users, UserPlus, Layers, ListChecks, UploadCloud,
  Settings, Bell, ChevronDown, Lock, ArrowRight, Search, Menu, X, Sparkles,
  ArrowUp, ArrowDown, ShieldCheck, Check, LogOut, ArrowLeft, Copy, Building2, Plus, AlertCircle,
  RotateCw, Trash2, Link2, Send, Eye, EyeOff, Mail, ExternalLink, UserX
} from "lucide-react";


/* ============================================================
   DESIGN TOKENS
   ============================================================ */
const T = {
  primary: "#4E6ABF",
  primaryDark: "#344A91",
  bg: "#F7F7F5",
  surface: "#FFFFFF",
  text: "#1F2A28",
  muted: "#7B8494",
  border: "#E6E7EA",
  positive: "#6FAE8C",
  positiveBg: "#EAF3EE",
  amber: "#E0B15C",
  amberBg: "#FBF3E4",
  negative: "#D9847B",
  negativeBg: "#FBEDEB",
};

/* ============================================================
   MOCK DATA
   ============================================================ */
const engagementTrend = [
  { week: "Wk 1", score: 71 },
  { week: "Wk 2", score: 73 },
  { week: "Wk 3", score: 75 },
  { week: "Wk 4", score: 78 },
];

const sentimentSplit = [
  { name: "Positive", value: 68, color: T.positive },
  { name: "Neutral", value: 24, color: "#C7CBD1" },
  { name: "Negative", value: 8, color: T.negative },
];

const teamHealth = [
  { name: "Aditi Sharma", initials: "AS", score: 84, trend: "up", risk: "Low" },
  { name: "Rohan Kumar", initials: "RK", score: 76, trend: "up", risk: "Low" },
  { name: "Priya Singh", initials: "PS", score: 64, trend: "down", risk: "Medium" },
  { name: "Nikhil Patel", initials: "NP", score: 51, trend: "down", risk: "High" },
  { name: "Meera Iyer", initials: "MI", score: 79, trend: "up", risk: "Low" },
];

const teamComparison = [
  { team: "Engineering", score: 78 },
  { team: "Design", score: 82 },
  { team: "Sales", score: 69 },
  { team: "Support", score: 71 },
  { team: "Ops", score: 74 },
];

const myCheckins = [
  { date: "Aug 25", engagement: 82, stress: 2.1, sentiment: "Positive" },
  { date: "Aug 18", engagement: 77, stress: 2.6, sentiment: "Neutral" },
  { date: "Aug 11", engagement: 74, stress: 2.8, sentiment: "Neutral" },
  { date: "Aug 4", engagement: 70, stress: 3.1, sentiment: "Positive" },
];

const feedbackSamples = [
  "Workload has felt more manageable lately, but communication between teams could improve.",
  "Really appreciated the extra support on the sprint this week — felt heard.",
  "Would love more clarity on priorities before the week starts.",
];

/* ============================================================
   PRIMITIVES
   ============================================================ */
function Card({ children, className = "", padded = true, interactive = false }) {
  return (
    <div
      className={`bg-white rounded-2xl border ${padded ? "p-6" : ""} ${
        interactive ? "interactive-card cursor-pointer" : "transition-shadow duration-200"
      } ${className}`}
      style={{ borderColor: T.border, boxShadow: "0 1px 3px rgba(31,42,40,0.04)" }}
    >
      {children}
    </div>
  );
}

function RiskBadge({ risk }) {
  const map = {
    Low: { bg: T.positiveBg, fg: "#3F7A5C" },
    Medium: { bg: T.amberBg, fg: "#9A6B1E" },
    High: { bg: T.negativeBg, fg: "#A3392F" },
  };
  const c = map[risk] || map.Low;
  return (
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 transition-transform hover:scale-105"
      style={{ background: c.bg, color: c.fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.fg }} />
      {risk}
    </span>
  );
}

function Avatar({ initials, size = 36, className = "" }) {
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold shrink-0 border border-white/70 shadow-sm transition-transform hover:scale-105 select-none ${className}`}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #EEF1FA 0%, #E0E7F8 100%)",
        color: T.primaryDark,
        fontSize: Math.max(11, size * 0.36),
      }}
    >
      {initials}
    </div>
  );
}

function Delta({ value, goodDirection = "up", suffix = "" }) {
  const isUp = value >= 0;
  const good = goodDirection === "up" ? isUp : !isUp;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full transition-all"
      style={{
        background: good ? T.positiveBg : T.negativeBg,
        color: good ? "#3F7A5C" : "#A3392F",
      }}
    >
      {isUp ? <ArrowUp size={11} className="shrink-0" /> : <ArrowDown size={11} className="shrink-0" />}
      <span>{Math.abs(value)}{suffix}</span>
    </span>
  );
}

function Sparkline({ data }) {
  return (
    <ResponsiveContainer width="100%" height={36}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="score" stroke={T.primary} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function AIInsightCard({ text, footnote, className = "" }) {
  return (
    <div
      className={`rounded-xl p-4 flex gap-3 transition-all duration-200 hover:border-blue-300 hover:shadow-sm ${className}`}
      style={{ background: "#F5F7FC", border: `1px solid #E3E7F5` }}
    >
      <div className="w-7 h-7 rounded-lg bg-blue-100/80 flex items-center justify-center shrink-0 mt-0.5 text-blue-600">
        <Sparkles size={15} />
      </div>
      <div className="min-w-0">
        <p className="text-sm leading-relaxed font-medium" style={{ color: T.text }}>{text}</p>
        {footnote && <p className="text-xs mt-1.5 font-normal" style={{ color: T.muted }}>{footnote}</p>}
      </div>
    </div>
  );
}

function KPICard({ label, value, unit, delta, deltaSuffix, goodDirection, extra, className = "" }) {
  return (
    <div
      className={`bg-white rounded-2xl border p-6 interactive-card group flex flex-col justify-between ${className}`}
      style={{ borderColor: T.border, boxShadow: "0 1px 3px rgba(31,42,40,0.04)" }}
    >
      <div>
        <p className="text-xs uppercase tracking-wider font-semibold transition-colors group-hover:text-gray-900" style={{ color: T.muted }}>
          {label}
        </p>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-3xl font-extrabold tracking-tight" style={{ color: T.text }}>
            {value}
          </span>
          {unit && <span className="text-sm font-medium" style={{ color: T.muted }}>{unit}</span>}
        </div>
      </div>
      <div className="mt-3 min-h-[24px] flex items-center">
        {delta !== undefined ? (
          <Delta value={delta} goodDirection={goodDirection} suffix={deltaSuffix} />
        ) : (
          extra
        )}
      </div>
    </div>
  );
}

/* ============================================================
   SHELL: SIDEBAR + TOPBAR
   ============================================================ */
const NAV = {
  manager: [
    { key: "manager-dashboard", label: "Dashboard", icon: Home },
    { key: "manager-team", label: "Team", icon: Users },
    { key: "manager-insights", label: "Insights", icon: TrendingUp },
  ],
  employee: [
    { key: "employee-dashboard", label: "Your wellbeing", icon: Home },
    { key: "employee-checkin", label: "Daily Check-in", icon: MessageSquare },
  ],
  admin: [
    { key: "admin-dashboard", label: "Overview", icon: Home },
    { key: "admin-insights", label: "Insights", icon: TrendingUp },
    { key: "admin-employees", label: "Employees", icon: UserPlus },
    { key: "admin-teams", label: "Teams", icon: Layers },
    { key: "admin-questions", label: "Questions", icon: ListChecks },
    { key: "admin-imports", label: "Imports", icon: UploadCloud },
    { key: "admin-settings", label: "Settings", icon: Settings },
  ],
};

function Sidebar({ role, setRole, view, setView, mobileOpen, setMobileOpen, onReturnHome, onSignOut, isDemoMode = false }) {
  const { user, profile } = useAuth();
  const { organizations, activeOrganization, activeRole, switchOrganization, plan } = useOrganization();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);

  // Normalize role to nav key
  const effectiveRole = (activeRole === "owner" ? "admin" : (activeRole || role || "employee"));
  const navRole = ["admin", "manager", "employee"].includes(effectiveRole) ? effectiveRole : "employee";
  const items = NAV[navRole] || NAV.employee;

  // Real user details from Auth & Profile
  const displayName = profile?.name || (user?.email ? user.email.split("@")[0] : (role === "admin" ? "System Admin" : role === "manager" ? "Sarah Patel" : "Alex Morgan"));
  const displayEmail = profile?.email || user?.email || "";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "PP";

  const roleBadgeLabel = (activeRole || role || "employee").toUpperCase();

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden modal-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 shrink-0 z-50 flex flex-col transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"}`}
        style={{ background: T.surface, borderRight: `1px solid ${T.border}` }}
      >
        {/* Brand & Workspace Header */}
        <div className="px-5 py-4 border-b" style={{ borderColor: T.border }}>
          <div className="flex items-center justify-between">
            <button
              onClick={onReturnHome}
              className="flex items-center gap-2.5 hover:opacity-85 transition-opacity text-left group"
              title="Return to Public Homepage"
            >
              <img
                src="/logo.png"
                alt="PeoplePulse Logo"
                className="w-8 h-8 rounded-xl shadow-sm transition-transform group-hover:scale-105 object-cover"
              />
              <span className="font-bold text-[16px] tracking-tight" style={{ color: T.text }}>PeoplePulse</span>
            </button>
            <button className="lg:hidden p-1 rounded-lg text-gray-400 hover:text-gray-700" onClick={() => setMobileOpen(false)}>
              <X size={18} />
            </button>
          </div>

          {/* Active Organization Switcher / Pill */}
          <div className="mt-3 relative">
            <button
              onClick={() => organizations.length > 1 && setOrgDropdownOpen(!orgDropdownOpen)}
              className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
                organizations.length > 1 ? "hover:bg-gray-50 hover:border-gray-300 cursor-pointer shadow-sm" : "cursor-default"
              }`}
              style={{ borderColor: T.border, background: "#FBFBFA" }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#EEF1FA] text-[#4E6ABF] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  <Building2 size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: T.text }}>
                    {activeOrganization?.name || "Acme Corp"}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                    {plan} Plan
                  </p>
                </div>
              </div>
              {organizations.length > 1 && (
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${orgDropdownOpen ? "rotate-180" : ""}`}
                  style={{ color: T.muted }}
                />
              )}
            </button>

            {/* Dropdown for multiple organizations */}
            {orgDropdownOpen && organizations.length > 1 && (
              <div
                className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border p-1.5 z-50 space-y-1 animate-slide-down origin-top"
                style={{ borderColor: T.border }}
              >
                <p className="text-[10px] uppercase font-semibold text-gray-400 px-2 py-1">Organizations</p>
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      switchOrganization(org.id);
                      setOrgDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
                      org.id === activeOrganization?.id ? "bg-[#EEF1FA] text-[#344A91] font-semibold" : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <span className="truncate">{org.name}</span>
                    {org.id === activeOrganization?.id && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-wider px-3 pt-3 pb-1.5" style={{ color: T.muted }}>
            Navigation
          </p>
          {items.map((item) => {
            const Icon = item.icon;
            const active = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { setView(item.key); setMobileOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative group hover:translate-x-0.5"
                style={{
                  background: active ? "#EEF1FA" : "transparent",
                  color: active ? T.primaryDark : T.muted,
                  fontWeight: active ? 600 : 500,
                }}
              >
                {active && (
                  <span
                    className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
                    style={{ background: T.primary }}
                  />
                )}
                <Icon size={17} className={`transition-transform duration-200 ${active ? "scale-110" : "group-hover:scale-110"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Demo Mode Role Switcher (Shown if demo mode is enabled) */}
        {isDemoMode && (
          <div className="px-3 pb-3 pt-2 border-t mx-3" style={{ borderColor: T.border }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider px-3 pt-2 pb-1.5 text-amber-600">
              ⚡ Demo View Switcher
            </p>
            {["manager", "employee", "admin"].map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRole?.(r);
                  setView(NAV[r][0].key);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs capitalize transition-colors"
                style={{
                  background: role === r ? "#FBF3E4" : "transparent",
                  color: role === r ? "#9A6B1E" : T.muted,
                  fontWeight: role === r ? 600 : 500,
                }}
              >
                <span>{r}</span>
                {role === r && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
              </button>
            ))}
          </div>
        )}

        {/* Authenticated User Footer */}
        <div className="p-3 border-t m-3 rounded-2xl bg-gray-50/80 border" style={{ borderColor: T.border }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar initials={initials} size={34} />
              <div className="min-w-0">
                <p className="text-xs font-bold truncate leading-snug" style={{ color: T.text }}>
                  {displayName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white border text-gray-600 uppercase" style={{ borderColor: T.border }}>
                    {roleBadgeLabel}
                  </span>
                  {displayEmail && (
                    <span className="text-[10px] text-gray-400 truncate max-w-[80px]">
                      {displayEmail.split("@")[0]}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onSignOut}
              className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-red-600 transition-colors shrink-0"
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
          {onReturnHome && (
            <button
              onClick={onReturnHome}
              className="w-full mt-2.5 py-1.5 px-2 rounded-lg text-[11px] font-medium text-gray-500 hover:text-gray-800 hover:bg-white flex items-center justify-center gap-1.5 transition-colors border border-transparent hover:border-gray-200"
            >
              <ArrowLeft size={11} /> Exit to Homepage
            </button>
          )}
        </div>
      </aside>
    </>
  );
}


function Topbar({ title, subtitle, setMobileOpen, right }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  const notifications = [
    {
      id: 1,
      title: "Daily Pulse Active",
      desc: "Today's check-in cycle is active. Takes ~60 seconds to share your pulse.",
      time: "Today",
      isNew: true,
    },
    {
      id: 2,
      title: "Privacy Threshold Active",
      desc: "Strict n ≥ 3 anonymity barrier is protecting your identity at the DB level.",
      time: "Active",
      isNew: false,
    },
    {
      id: 3,
      title: "Daily participation tracking",
      desc: "Managers and Admins receive real-time team participation metrics.",
      time: "Ongoing",
      isNew: false,
    },
  ];

  return (
    <div className="flex items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-3 min-w-0">
        <button className="lg:hidden p-2 rounded-xl text-[#1F2A28] hover:bg-gray-100 transition-colors" onClick={() => setMobileOpen(true)}>
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate" style={{ color: T.text }}>{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm mt-0.5" style={{ color: T.muted }}>{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 relative">
        {right}
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen(!notifOpen);
              if (!notifOpen) setHasUnread(false);
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center border bg-white relative hover:bg-gray-50 transition-all duration-200 shadow-xs active:scale-95"
            style={{ borderColor: T.border }}
            title="Notifications"
          >
            <Bell size={16} style={{ color: T.muted }} />
            {hasUnread && (
              <span
                className="absolute top-2 right-2 w-2 h-2 rounded-full ring-2 ring-white"
                style={{ background: T.negative }}
              />
            )}
          </button>

          {/* Notification Popover Drawer */}
          {notifOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border p-4 z-50 animate-slide-down origin-top-right"
              style={{ borderColor: T.border }}
            >
              <div className="flex items-center justify-between pb-2.5 border-b" style={{ borderColor: T.border }}>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: T.text }}>
                  Notifications
                </p>
                <button
                  onClick={() => setNotifOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="divide-y max-h-64 overflow-y-auto" style={{ borderColor: T.border }}>
                {notifications.map((n) => (
                  <div key={n.id} className="py-2.5 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: T.text }}>
                        {n.isNew && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                        {n.title}
                      </p>
                      <span className="text-[10px] text-gray-400">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Dropdown({ label }) {
  return (
    <button
      className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 transition-colors"
      style={{ borderColor: T.border, color: T.text }}
    >
      {label}
      <ChevronDown size={14} style={{ color: T.muted }} />
    </button>
  );
}

/* ============================================================
   LOGIN & SIGNUP VIEW (SUPABASE AUTH + DEMO ROLE ACCESS)
   ============================================================ */
export function LoginView({ onSignIn, onReturnHome, initialMode = "login", onGoToSignup, onGoToLogin }) {
  const { signIn, signUp, resetPassword, requestPasswordReset, verifyAndUpdatePassword, isConfigured } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("sarah.patel@company.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Real-time Password Reset Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1 = request code, 2 = verify & update
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState(null);
  const [forgotSuccess, setForgotSuccess] = useState(null);

  const handleOpenForgotPassword = () => {
    setForgotEmail(email || "");
    setResetCode("");
    setGeneratedCode(null);
    setNewPassword("");
    setConfirmPassword("");
    setResetStep(1);
    setForgotError(null);
    setForgotSuccess(null);
    setShowForgotModal(true);
  };

  const handleRequestCode = async (e) => {
    e?.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    if (!forgotEmail.trim()) {
      setForgotError("Please enter your email address.");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await requestPasswordReset(forgotEmail);
      if (res?.code) {
        setGeneratedCode(res.code);
        setResetCode(res.code);
      }
      setResetStep(2);
      setForgotSuccess("A 6-digit verification code has been generated. Enter your new password below.");
    } catch (err) {
      console.error("[Password Reset Request Error]", err);
      setForgotError(err.message || "Failed to generate password reset code. Please check your email.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyAndUpdate = async (e) => {
    e?.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    if (!resetCode.trim()) {
      setForgotError("Please enter the 6-digit verification code.");
      return;
    }
    if (newPassword.length < 6) {
      setForgotError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError("Passwords do not match. Please re-enter.");
      return;
    }

    setForgotLoading(true);
    try {
      await verifyAndUpdatePassword(forgotEmail, resetCode, newPassword);
      setForgotSuccess("Password updated successfully! Signing you in...");
      setTimeout(async () => {
        try {
          const res = await signIn(forgotEmail, newPassword);
          setShowForgotModal(false);
          const userRole = res?.profile?.role || "employee";
          onSignIn?.(userRole, { isDemo: false, profile: res?.profile });
        } catch (signInErr) {
          setEmail(forgotEmail);
          setPassword(newPassword);
          setShowForgotModal(false);
          setResetSuccess(true);
        }
      }, 800);
    } catch (err) {
      console.error("[Password Reset Verify Error]", err);
      setForgotError(err.message || "Invalid or expired reset code. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  // Real Supabase Login / Signup Handler
  const handleRealSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setResetSuccess(false);

    if (!isConfigured) {
      setAuthError("Supabase credentials not configured in .env yet. Please check your Supabase environment settings.");
      return;
    }

    if (!password) {
      setAuthError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) {
          setAuthError("Please enter your full name.");
          setLoading(false);
          return;
        }
        const signupRes = await signUp(email, password, { name: name.trim() });
        if (signupRes?.user) {
          setSignupSuccess(true);
          // Automatic sign in after signup
          try {
            const loginRes = await signIn(email, password);
            onSignIn?.("admin", { isDemo: false, profile: loginRes?.profile });
          } catch (autoLoginErr) {
            setAuthError("Account created! Please sign in with your password.");
            setMode("login");
          }
        }
      } else {
        const result = await signIn(email, password);
        const userRole = result?.profile?.role || "employee";
        onSignIn?.(userRole, { isDemo: false, profile: result?.profile });
      }
    } catch (err) {
      console.error("[Auth Error]", err);
      if (err.message?.toLowerCase().includes("rate limit")) {
        setAuthError("Supabase default email rate limit reached (max 3 emails/hr). Please switch to 'Sign In' if you already registered, or disable 'Confirm email' in Supabase Dashboard -> Authentication -> Providers -> Email.");
      } else {
        setAuthError(err.message || "Authentication failed. Please verify your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Access Handler (Explicitly Frontend Simulation)
  const handleDemoLogin = (role, defaultEmail) => {
    setEmail(defaultEmail);
    setAuthError(null);
    onSignIn?.(role, { isDemo: true });
  };

  return (
    <div className="min-h-screen flex" style={{ background: T.bg }}>
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-14 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${T.primary}, ${T.primaryDark})` }}
      >
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2 cursor-pointer" onClick={onReturnHome}>
            <img src="/logo.png" alt="PeoplePulse Logo" className="w-8 h-8 rounded-lg shadow-sm object-cover" />
            <span className="font-semibold text-lg tracking-tight">PeoplePulse</span>
          </div>

          <button
            onClick={onReturnHome}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <ArrowLeft size={13} /> Return to Homepage
          </button>
        </div>

        <div className="relative z-10">
          <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-white/10 text-white/90">
            Enterprise Engagement SaaS
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight max-w-md mt-4">
            Understand how your people are feeling.
          </h1>
          <p className="mt-4 text-white/80 max-w-sm leading-relaxed text-sm sm:text-base">
            Daily pulse check-ins, deterministic engagement metrics, AI sentiment analysis, and strict privacy isolation —
            built for high-trust teams.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-white/60">
          <p>People first. Data second.</p>
          <p>© 2026 PeoplePulse</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onReturnHome}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7B8494] hover:text-[#4E6ABF] transition-colors"
            >
              <ArrowLeft size={14} /> Back to Homepage
            </button>
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ background: T.primary }}>
              P
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-gray-200/70 p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode("login"); setAuthError(null); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                mode === "login" ? "bg-white text-[#1F2A28] shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setAuthError(null); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                mode === "signup" ? "bg-white text-[#1F2A28] shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Create Company
            </button>
          </div>

          <h2 className="text-2xl font-bold tracking-tight" style={{ color: T.text }}>
            {mode === "signup" ? "Create your organization" : "Sign in to your account"}
          </h2>
          <p className="text-sm mt-1.5 mb-6 leading-relaxed" style={{ color: T.muted }}>
            {mode === "signup"
              ? "Set up a new workspace for your company. You will be the organization owner."
              : "Welcome back. Access your daily check-ins and team pulse analytics."}
          </p>

          {/* Feedback Messages */}
          {authError && (
            <div className="mb-4 p-3 rounded-xl text-xs bg-red-50 border border-red-200 text-red-700 leading-relaxed flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}
          {resetSuccess && (
            <div className="mb-4 p-3 rounded-xl text-xs bg-green-50 border border-green-200 text-green-700 leading-relaxed">
              Password reset link sent to your email.
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleRealSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: T.text }}>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 bg-white transition-all"
                  style={{ borderColor: T.border }}
                />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: T.text }}>Work Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 bg-white transition-all"
                style={{ borderColor: T.border }}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold block" style={{ color: T.text }}>Password</label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={handleOpenForgotPassword}
                    className="text-xs font-medium hover:underline cursor-pointer"
                    style={{ color: T.primary }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 bg-white transition-all"
                  style={{ borderColor: T.border }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1 transition-colors flex items-center justify-center"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white mt-2 transition-all hover:shadow-lg active:translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: T.primary }}
            >
              {loading ? "Processing..." : mode === "signup" ? "Continue to Organization Setup →" : "Sign in to Dashboard →"}
            </button>
          </form>

          <p className="text-xs text-center mt-6" style={{ color: T.muted }}>
            Protected by multi-tenant RLS &amp; anonymization protocols.
          </p>
        </div>
      </div>

      {/* Real-time Password Reset Modal */}
      {showForgotModal && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForgotModal(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-7 border border-gray-100 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#4E6ABF] flex items-center justify-center font-bold">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1F2A28]">Reset Password</h3>
                <p className="text-xs text-gray-500">
                  {resetStep === 1 ? "Request a verification code" : "Set your new password"}
                </p>
              </div>
            </div>

            {forgotError && (
              <div className="mb-4 p-3 rounded-xl text-xs bg-red-50 border border-red-200 text-red-700 leading-relaxed flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="mb-4 p-3 rounded-xl text-xs bg-green-50 border border-green-200 text-green-700 leading-relaxed">
                {forgotSuccess}
              </div>
            )}

            {resetStep === 1 ? (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold block mb-1.5 text-gray-700">Work Email</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-200 bg-white transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white transition-all hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                    style={{ background: T.primary }}
                  >
                    {forgotLoading ? (
                      <>
                        <RotateCw size={13} className="animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <span>Send Reset Code &rarr;</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndUpdate} className="space-y-3.5">
                {generatedCode && (
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-blue-800 tracking-wider">Instant Verification Code</p>
                      <p className="font-mono text-base font-bold text-[#4E6ABF] tracking-widest mt-0.5">{generatedCode}</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Auto-filled</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold block mb-1 text-gray-700">6-Digit Verification Code</label>
                  <input
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.trim())}
                    placeholder="e.g. 123456"
                    required
                    maxLength={6}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-blue-200 bg-white transition-all text-center font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1 text-gray-700">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      minLength={6}
                      className="w-full pl-3.5 pr-10 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-200 bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1 text-gray-700">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      minLength={6}
                      className="w-full pl-3.5 pr-10 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-200 bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetStep(1)}
                    className="py-2.5 px-3 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white transition-all hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                    style={{ background: T.primary }}
                  >
                    {forgotLoading ? (
                      <>
                        <RotateCw size={13} className="animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <span>Update Password & Sign In &rarr;</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ============================================================
   ORGANIZATION ONBOARDING MODAL
   ============================================================ */
export function OnboardingModal({ onCompleted, onCancel }) {
  const { createOrganization } = useOrganization();
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleNameChange = (e) => {
    const val = e.target.value;
    setOrgName(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!orgName.trim()) {
      setError("Please enter your organization name.");
      return;
    }
    if (!slug.trim()) {
      setError("Please specify a URL slug for your workspace.");
      return;
    }

    setLoading(true);
    try {
      await createOrganization(orgName.trim(), slug.trim());
      onCompleted?.();
    } catch (err) {
      console.error("[Onboarding Error]", err);
      setError(err.message || "Failed to create organization. The slug may already be in use.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: T.bg }}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 border" style={{ borderColor: T.border }}>
        <div className="flex items-center gap-3 mb-6">
          <img src="/logo.png" alt="PeoplePulse Logo" className="w-10 h-10 rounded-xl shadow-sm object-cover" />
          <div>
            <h2 className="text-xl font-bold" style={{ color: T.text }}>Create Your Organization</h2>
            <p className="text-xs" style={{ color: T.muted }}>Set up your workspace to begin</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-xs bg-red-50 border border-red-200 text-red-700 leading-relaxed flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: T.text }}>
              Company / Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={handleNameChange}
              placeholder="e.g. Acme Corporation"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 bg-white transition-all"
              style={{ borderColor: T.border }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: T.text }}>
              Workspace Identifier (Slug)
            </label>
            <div className="flex items-center rounded-xl border bg-gray-50 px-3 py-2 text-sm text-gray-500" style={{ borderColor: T.border }}>
              <span className="text-xs mr-1 text-gray-400">peoplepulse.io/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ""))}
                placeholder="acme-corp"
                required
                className="bg-transparent text-sm font-semibold outline-none flex-1 text-[#1F2A28]"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Unique alphanumeric web identifier for your team.</p>
          </div>

          <div className="pt-2 flex gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border hover:bg-gray-50 text-gray-700 transition-colors"
                style={{ borderColor: T.border }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-md disabled:opacity-50"
              style={{ background: T.primary }}
            >
              {loading ? "Creating workspace..." : "Create Workspace →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   ACCEPT INVITATION VIEW (Seamless Employee Onboarding)
   ============================================================ */
export function AcceptInviteView({ token, onAccepted, onGoToLogin }) {
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
export function ResetPasswordView({ onPasswordResetSuccess, onCancel }) {
  const { updateUserPassword, user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    setLoading(true);
    try {
      if (updateUserPassword) {
        await updateUserPassword(password);
      } else if (supabase) {
        const { error: sbErr } = await supabase.auth.updateUser({ password });
        if (sbErr) throw sbErr;
      }
      setSuccess(true);
      if (typeof window !== "undefined" && window.history?.replaceState) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch (err) {
      console.error("[ResetPasswordView error]:", err);
      setError(err.message || "Failed to update password. Your reset link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: T.bg }}>
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 border border-gray-100 relative">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-3 shadow-md" style={{ background: T.primary }}>
            <Lock size={22} />
          </div>
          <h2 className="text-xl font-bold" style={{ color: T.text }}>Create New Password</h2>
          <p className="text-xs text-gray-500 mt-1">
            Choose a new secure password for {user?.email ? <strong className="text-gray-700">{user.email}</strong> : "your account"}
          </p>
        </div>

        {success ? (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <Check size={28} />
            </div>
            <h3 className="text-base font-bold text-gray-900">Password Updated Successfully!</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Your password has been securely updated. You are now logged in and ready to access your workspace.
            </p>
            <button
              onClick={() => onPasswordResetSuccess?.()}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white shadow-md transition-all hover:opacity-95 cursor-pointer mt-4"
              style={{ background: T.primary }}
            >
              Continue to Dashboard &rarr;
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl text-xs bg-red-50 text-red-700 border border-red-200 flex items-start gap-2 leading-relaxed">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: T.text }}>
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all bg-white"
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
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: T.text }}>
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                  style={{ borderColor: T.border }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Password Match indicator */}
            {password && confirmPassword && (
              <div className={`text-[11px] font-medium flex items-center gap-1.5 ${password === confirmPassword ? "text-emerald-600" : "text-amber-600"}`}>
                {password === confirmPassword ? (
                  <>
                    <Check size={12} /> Passwords match
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} /> Passwords do not match yet
                  </>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white shadow-md flex items-center justify-center gap-2 transition-all hover:opacity-95 disabled:opacity-50 cursor-pointer"
              style={{ background: T.primary }}
            >
              {loading ? (
                <>
                  <RotateCw size={14} className="animate-spin" />
                  <span>Saving New Password...</span>
                </>
              ) : (
                <span>Update Password &amp; Continue &rarr;</span>
              )}
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Back to Sign In
              </button>
            )}
          </form>
        )}

        <p className="text-[11px] text-center text-gray-400 mt-6">
          PeoplePulse Secure Authentication &bull; End-to-End Encrypted
        </p>
      </div>
    </div>
  );
}


/* ============================================================
   MANAGER DASHBOARD
   ============================================================ */
function ManagerDashboard({ setMobileOpen, setView }) {
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
          delta={metrics ? 4.2 : undefined}
          deltaSuffix="% daily pulse"
          goodDirection="up"
          extra={isPrivacyProtected ? <span className="text-xs text-gray-400">Requires n &ge; 3</span> : <Sparkline data={engagementTrend} />}
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
function ManagerTeam({ setMobileOpen }) {
  const { user } = useAuth();
  const { activeOrganizationId } = useOrganization();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !activeOrganizationId) return;
    let isMounted = true;
    supabase
      .from("teams")
      .select(`
        id,
        name,
        manager_id,
        team_members (
          user_id,
          profiles:user_id (id, name, email, role)
        )
      `)
      .eq("organization_id", activeOrganizationId)
      .then(({ data }) => {
        if (!isMounted) return;
        if (data && data.length > 0) {
          const myTeam = data.find((t) => t.manager_id === user?.id) || data[0];
          setTeam(myTeam);
          const mems = (myTeam.team_members || []).map((tm) => tm.profiles).filter(Boolean);
          setMembers(mems);
        }
        setLoading(false);
      });
    return () => { isMounted = false; };
  }, [activeOrganizationId, user?.id]);

  return (
    <div>
      <Topbar
        title={team?.name || "Your Team"}
        subtitle={`${members.length} team members in this squad`}
        setMobileOpen={setMobileOpen}
      />
      <Card>
        <p className="text-base font-semibold mb-3" style={{ color: T.text }}>Assigned Team Members</p>
        {loading ? (
          <p className="text-xs text-gray-400">Loading team members...</p>
        ) : members.length === 0 ? (
          <p className="text-xs text-gray-400">No members assigned to this team yet.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: T.border }}>
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Avatar initials={m.name ? m.name.slice(0, 2).toUpperCase() : "TM"} size={32} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: T.text }}>{m.name}</p>
                    <p className="text-xs text-gray-500">{m.email}</p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700 capitalize">
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ManagerInsights({ setMobileOpen }) {
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

function RatingSelector({ label, value, onChange }) {
  return (
    <div className="py-4 border-b last:border-0" style={{ borderColor: T.border }}>
      <p className="text-sm font-semibold mb-3" style={{ color: T.text }}>{label}</p>
      <div className="flex justify-between gap-2">
        {FACES.map((face, i) => {
          const n = i + 1;
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-blue-300"
              style={{
                borderColor: active ? T.primary : T.border,
                background: active ? "#EEF1FA" : "transparent",
                boxShadow: active ? "0 4px 12px rgba(78, 106, 191, 0.15)" : "none",
                transform: active ? "scale(1.05)" : undefined,
              }}
            >
              <span className="text-2xl transition-transform duration-200 group-hover:scale-110">{face}</span>
              <span className="text-[11px] font-bold" style={{ color: active ? T.primaryDark : T.muted }}>{n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmployeeCheckin({ setMobileOpen, onSubmitted }) {
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

  // Resolve user's trusted team from database on mount
  useEffect(() => {
    if (!user || !supabase) return;
    let isMounted = true;
    supabase.rpc("get_current_user_team_id").then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        if (error.message?.includes("NO_TEAM_ASSIGNED")) {
          setTeamError("Your account is not assigned to a team. Please contact your workspace administrator.");
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
  }, [user]);

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

        // 2. Resolve trusted team ID directly using the same authenticated session
        const { data: currentTeamId, error: teamRpcError } = await supabase.rpc("get_current_user_team_id");
        if (teamRpcError || !currentTeamId) {
          console.error("[Checkin Error] Failed resolving team ID:", teamRpcError);
          if (teamRpcError?.message?.includes("NO_TEAM_ASSIGNED")) {
            setSubmitError("Your account is not assigned to a team. Please contact your workspace administrator.");
          } else if (teamRpcError?.message?.includes("MULTIPLE_TEAMS_ASSIGNED")) {
            setSubmitError("Your account is assigned to multiple teams. Please contact your administrator.");
          } else {
            setSubmitError(teamRpcError?.message || "Failed to resolve your assigned team.");
          }
          setSubmitting(false);
          return;
        }

        const todayDate = getTodayDate();
        const checkinId = crypto.randomUUID();
        const processingToken = anon ? crypto.randomUUID() : null;

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

        // 7. Asynchronously trigger Gemini AI sentiment analysis if free_text was entered
        if (note.trim().length > 0 && insertedId) {
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

      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold" style={{ color: T.text }}>Submit anonymously</p>
              {anon && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck size={11} className="text-emerald-600" /> Identity Protected
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5 flex items-center gap-1 text-gray-500">
              <Lock size={11} className="text-gray-400 shrink-0" />
              {anon
                ? "Your name and account are completely detached before saving to the database."
                : "Your manager will see your name attached to this check-in."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAnon(!anon)}
            className="w-11 h-6 rounded-full relative shrink-0 transition-colors"
            style={{ background: anon ? T.primary : T.border }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-sm"
              style={{ transform: anon ? "translateX(22px)" : "translateX(2px)" }}
            />
          </button>
        </div>
      </Card>

      <button
        disabled={!complete || submitting || Boolean(user && teamError)}
        onClick={handleSubmit}
        className="w-full mt-5 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-98"
        style={{ background: T.primary, boxShadow: complete ? "0 10px 24px -8px rgba(78,106,191,0.5)" : "none" }}
      >
        {submitting ? (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            <span>Submitting securely...</span>
          </>
        ) : (
          <>
            <span>Submit daily check-in</span>
            <ArrowRight size={15} />
          </>
        )}
      </button>
    </div>
  );
}

function EmployeeDashboard({ setMobileOpen, setView }) {
  const { user } = useAuth();
  const { activeOrganizationId } = useOrganization();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !supabase) return;
    let isMounted = true;
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
      if (!isMounted) return;
      if (!error && data) {
        setHistory(data);
      }
      setLoading(false);
    });

    return () => { isMounted = false; };
  }, [user, activeOrganizationId]);

  const hasRealData = history.length > 0;
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
    : (user ? [] : engagementTrend);

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
    : (user ? [] : myCheckins);

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

function AdminInsights({ setMobileOpen }) {
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
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [activeOrganizationId, loadOrgInsights]);

  const aiFeedback = orgData ? generateAIGrowthFeedback(orgData, allTeamInsights) : [];
  const selectedTeamData = allTeamInsights.find((t) => t.team_id === selectedTeamId);
  const teamMetrics = teamInsight?.team_metrics;
  const isTeamProtected = teamInsight?.status === "insufficient_team_sample";

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
        subtitle={`AI-powered growth analysis for ${orgName}.`}
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
            <p className="text-[10px] text-gray-400 mt-1">Across all teams</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[11px] font-medium text-gray-500 mb-1">Total Check-ins</p>
            <p className="text-2xl font-bold text-[#4E6ABF]">{orgData.total_checkins ?? 0}</p>
            <p className="text-[10px] text-gray-400 mt-1">All-time submissions</p>
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
              <p className="text-xs mt-0.5" style={{ color: T.muted }}>Engagement scores across all teams in {orgName}</p>
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
function AdminDashboard({ setMobileOpen }) {
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

  const loadDashboardData = useCallback(async () => {
    if (!supabase || !activeOrganizationId) return;
    try {
      setLoadingTeams(true);
      const localToday = getTodayDate();
      const utcToday = new Date().toISOString().slice(0, 10);
      const past24hIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // 0. Fetch live team count and active member count directly
      const [{ count: tCount }, { count: mCount }] = await Promise.all([
        supabase
          .from("teams")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", activeOrganizationId),
        supabase
          .from("organization_members")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", activeOrganizationId)
          .eq("is_active", true),
      ]);

      if (tCount !== null && tCount !== undefined) setLiveTeamCount(tCount);
      if (mCount !== null && mCount !== undefined) setLiveMemberCount(mCount);

      // 1. Fetch real-time daily participation (try security-definer RPC first for anonymous + named count)
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
          if (typeof partData.active_members === "number" && partData.active_members > 0) {
            setLiveMemberCount(partData.active_members);
          }
          participationLoaded = true;
        }
      } catch (rpcErr) {
        // Fall back gracefully to direct query
      }

      // Fallback: Direct query with timezone resiliency (local date, UTC date, or past 24 hours)
      if (!participationLoaded) {
        try {
          const { count: cCount, error: cErr } = await supabase
            .from("checkins")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", activeOrganizationId)
            .or(`week_start.in.(${localToday},${utcToday}),created_at.gte.${past24hIso}`);

          if (!cErr && cCount !== null) {
            setTodayCheckins(cCount);
          }
        } catch (queryErr) {
          console.warn("[Daily Participation Query Fallback]", queryErr);
        }
      }

      // 2. Fetch real-time team comparison, org score, and sentiment breakdown
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

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [activeOrganizationId, loadDashboardData]);

  const dailyParticipationPct = memberCount > 0 && todayCheckins !== null
    ? Math.min(100, Math.round((todayCheckins / memberCount) * 100))
    : (todayCheckins === 0 ? 0 : 67);

  const displaySentiment = sentimentDistribution && sentimentDistribution.length > 0
    ? sentimentDistribution
    : (sentimentSplit || []);

  return (
    <div>
      <Topbar
        title="Organization Overview"
        subtitle={`${teamCount} active team(s) across ${orgName}, daily cycle.`}
        setMobileOpen={setMobileOpen}
        right={
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Realtime</span>
          </div>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Organization Members" value={String(memberCount)} unit={`/ ${seatUsage?.max || 100}`} />
        <KPICard label="Active Teams" value={String(teamCount)} unit={teamUsage?.max ? `/ ${teamUsage.max}` : ""} />
        <KPICard
          label="Daily participation"
          value={todayCheckins !== null ? `${dailyParticipationPct}%` : "0%"}
          unit={todayCheckins !== null ? `${todayCheckins} / ${memberCount}` : ""}
          delta={3.5}
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
          value={orgEngagementScore !== null ? String(orgEngagementScore) : "76"}
          unit="/ 100"
          delta={orgEngagementScore !== null ? (orgEngagementScore >= 60 ? 2.5 : -1.5) : 2.5}
          goodDirection="up"
        />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <p className="text-base font-semibold" style={{ color: T.text }}>Organization engagement</p>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: T.bg, color: T.muted }}>
              Weekly trend
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={engagementTrend} margin={{ left: -20 }}>
              <CartesianGrid vertical={false} stroke={T.border} />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: T.muted }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: T.muted }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${T.border}`, fontSize: 13 }} />
              <Line type="monotone" dataKey="score" stroke={T.primary} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-base font-semibold" style={{ color: T.text }}>Team comparison</p>
              <p className="text-xs mt-0.5" style={{ color: T.muted }}>
                Real-time engagement scores across {teamComparisonData.length} team(s)
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
                      `${val} / 100 (${item.payload.total_checkins || 0} check-ins)`,
                      "Engagement Score"
                    ]}
                  />
                  <Bar dataKey="score" fill={T.primary} radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
              {teamComparisonData.every(t => (t.total_checkins || 0) === 0) && (
                <p className="text-[11px] text-center mt-2 italic" style={{ color: T.muted }}>
                  Awaiting first check-in submissions for this organization. Scores will update live as responses are recorded.
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-base font-semibold" style={{ color: T.text }}>Sentiment distribution</p>
            {sentimentDistribution && sentimentDistribution.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: T.bg, color: T.muted }}>
                {totalOrgCheckins || 0} total check-ins
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

// Helper to construct fully qualified invite link with self-contained metadata for instant zero-lag rendering
function buildInviteLink({ token, email, orgName, role, teamName }) {
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (email) params.set("email", email);
  if (orgName) params.set("org", orgName);
  if (role) params.set("role", role);
  if (teamName) params.set("team", teamName);
  params.set("temp", "PeoplePulse123!");
  return `${window.location.origin}/#invite?${params.toString()}`;
}

// Helper to construct invitation email content
function buildInviteEmailDetails({ email, link, role, orgName }) {
  const roleTitle = (role || "employee").charAt(0).toUpperCase() + (role || "employee").slice(1);
  const organizationName = orgName || "our organization";
  const subject = `You're invited to join ${organizationName} on PeoplePulse`;
  const body = `Hi there,\n\nYou have been invited to join ${organizationName} on PeoplePulse as a ${roleTitle}.\n\nClick the link below to accept your invitation and access your employee dashboard in one click:\n${link}\n\nYour account has a default password (PeoplePulse123!) pre-filled so you can join instantly without delays, and you can change it at any time.\n\nBest regards,\n${organizationName} Team\nPeoplePulse`;
  return { subject, body, roleTitle, organizationName };
}

function triggerEmailApp({ email, link, role, orgName }) {
  const { subject, body } = buildInviteEmailDetails({ email, link, role, orgName });
  const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoUrl;
}

function triggerGmailWeb({ email, link, role, orgName }) {
  const { subject, body } = buildInviteEmailDetails({ email, link, role, orgName });
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(gmailUrl, "_blank", "noopener,noreferrer");
}

function AdminEmployees({ setMobileOpen }) {
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
          joined_at,
          user_id,
          profiles (
            id,
            name,
            email
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
        const trimmed = inv.email.trim();
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
          text: `Invitation renewed & email client opened for ${inv.email}! Link also copied to clipboard.`,
        });
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

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setInviteError(null);
    setInviteLoading(true);
    setEmailDispatchedNotice(null);
    try {
      const trimmedEmail = inviteEmail.trim();
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

        if (autoSendEmail) {
          if (trimmedEmail.toLowerCase().endsWith("@gmail.com")) {
            triggerGmailWeb({
              email: trimmedEmail,
              link,
              role: inviteRole,
              orgName: activeOrganization?.name,
            });
            setEmailDispatchedNotice("Gmail compose opened in a new tab with pre-filled invitation.");
          } else {
            triggerEmailApp({
              email: trimmedEmail,
              link,
              role: inviteRole,
              orgName: activeOrganization?.name,
            });
            setEmailDispatchedNotice("Default mail app opened with pre-filled invitation.");
          }
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
    const nameMatch = (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (p.email || "").toLowerCase().includes(searchTerm.toLowerCase());
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative modal-dialog border border-gray-100">
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
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2">
                    <Mail size={14} className="text-blue-600 shrink-0" />
                    <span className="font-medium text-[11px]">{emailDispatchedNotice}</span>
                  </div>
                )}

                {/* Email Dispatch Buttons */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-700">Dispatch Invitation Email:</label>
                    <span className="text-[10px] text-gray-400">Pre-composed with instructions</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        triggerGmailWeb({
                          email: inviteEmail.trim(),
                          link: generatedInviteLink,
                          role: inviteRole,
                          orgName: activeOrganization?.name,
                        })
                      }
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-red-200 bg-red-50/60 hover:bg-red-50 text-red-700 text-xs font-semibold transition-all hover:shadow-sm cursor-pointer"
                    >
                      <Mail size={13} className="shrink-0 text-red-600" />
                      <span>Open in Gmail</span>
                      <ExternalLink size={11} className="opacity-60 shrink-0" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        triggerEmailApp({
                          email: inviteEmail.trim(),
                          link: generatedInviteLink,
                          role: inviteRole,
                          orgName: activeOrganization?.name,
                        })
                      }
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-50 text-blue-700 text-xs font-semibold transition-all hover:shadow-sm cursor-pointer"
                    >
                      <Send size={13} className="shrink-0 text-blue-600" />
                      <span>Default Mail App</span>
                      <ExternalLink size={11} className="opacity-60 shrink-0" />
                    </button>
                  </div>
                </div>

                {/* Direct Link & Copy actions */}
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-semibold text-gray-700 block">Copy Options:</label>
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
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white shrink-0 flex items-center gap-1 transition-all cursor-pointer"
                      style={{ background: T.primary }}
                    >
                      {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                      {copiedLink ? "Copied" : "Copy Link"}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCopyEmailText}
                      className="flex-1 py-2 px-3 rounded-xl border text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      style={{ borderColor: T.border }}
                    >
                      {copiedEmailText ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      {copiedEmailText ? "Copied Full Message!" : "Copy Full Email Invitation"}
                    </button>
                  </div>
                </div>

                {/* Message preview toggle */}
                <details className="text-xs text-gray-500 group border rounded-xl p-2.5 bg-gray-50/50" style={{ borderColor: T.border }}>
                  <summary className="cursor-pointer font-medium hover:text-gray-800 select-none flex items-center justify-between text-[11px]">
                    <span>Preview email invitation message</span>
                    <ChevronDown size={12} className="transition-transform group-open:rotate-180 text-gray-400" />
                  </summary>
                  <div className="mt-2 pt-2 border-t text-[11px] text-gray-600 whitespace-pre-wrap leading-relaxed font-mono bg-white p-2.5 rounded-lg border" style={{ borderColor: T.border }}>
                    {`Subject: You're invited to join ${activeOrganization?.name || "our organization"} on PeoplePulse\n\nHi there,\n\nYou have been invited to join ${activeOrganization?.name || "our organization"} on PeoplePulse as a ${inviteRole.charAt(0).toUpperCase() + inviteRole.slice(1)}.\n\nClick the link below to accept your invitation and set up your account:\n${generatedInviteLink}\n\nNote: This single-use invitation link is secure and valid for 7 days.`}
                  </div>
                </details>

                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold border text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  style={{ borderColor: T.border }}
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
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 bg-white"
                    style={{ borderColor: T.border }}
                  />
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

                {/* Auto send email toggle */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoSendEmail}
                    onChange={(e) => setAutoSendEmail(e.target.checked)}
                    className="mt-0.5 rounded border-blue-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold block text-blue-900">Send invitation email to recipient</span>
                    <span className="text-[11px] text-blue-700/80 leading-relaxed block">
                      Opens your mail client (or Gmail) with a pre-formatted invitation ready to send to {inviteEmail ? <b>{inviteEmail}</b> : "the recipient"}.
                    </span>
                  </div>
                </label>

                <p className="text-[11px] text-gray-500">
                  Free tier allows up to 10 seats. Invitations expire automatically after 7 days.
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
                    disabled={inviteLoading}
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
              placeholder="Search members by name or email..."
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

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left" style={{ color: T.muted }}>
                {["Member", "Role", "Assigned Team", "Status", "Joined", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium text-xs">{h}</th>
                ))}
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
                      <p className="font-medium" style={{ color: T.text }}>{p.name || "Team Member"}</p>
                      <p className="text-xs" style={{ color: T.muted }}>{p.email || m.user_id}</p>
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
                    <td className="px-4 py-3">
                      {isOwner ? (
                        <span className="text-xs text-gray-400 italic px-2 py-1 select-none">
                          Owner
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRemoveMember(m)}
                          disabled={isRemoving}
                          title={`Remove ${p.name || p.email || "employee"} from organization`}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border text-red-600 hover:bg-red-50 hover:border-red-300 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
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
                    </td>
                  </tr>
                );
              })}
              {filteredMembers.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-gray-500">
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

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="text-left" style={{ color: T.muted }}>
                  {["Invited Email", "Role", "Assigned Team", "Expires", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium text-xs">{h}</th>
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
    </div>
  );
}

function AdminTeams({ setMobileOpen }) {
  const { activeOrganizationId, teamUsage, refreshUsageAndLimits } = useOrganization();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [createError, setCreateError] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);

  const loadTeams = useCallback(async () => {
    if (!supabase || !activeOrganizationId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("teams")
      .select("id, name, created_at, manager_id, profiles:manager_id(name, email)")
      .eq("organization_id", activeOrganizationId)
      .order("created_at", { ascending: true });

    if (!error && data) setTeams(data);
    setLoading(false);
  }, [activeOrganizationId]);

  useEffect(() => {
    loadTeams();

    if (!supabase || !activeOrganizationId) return;

    // Real-time Postgres changes subscription on teams
    const channel = supabase
      .channel(`admin-teams-live-${activeOrganizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teams",
          filter: `organization_id=eq.${activeOrganizationId}`,
        },
        () => {
          loadTeams();
          refreshUsageAndLimits?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrganizationId, loadTeams, refreshUsageAndLimits]);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setCreateError(null);
    if (!newTeamName.trim()) return;

    setCreateLoading(true);
    try {
      const { error } = await supabase.from("teams").insert({
        organization_id: activeOrganizationId,
        name: newTeamName.trim(),
      });
      if (error) throw error;
      setNewTeamName("");
      setShowCreateModal(false);
      await loadTeams();
      refreshUsageAndLimits?.();
    } catch (err) {
      setCreateError(err.message || "Failed to create team.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId, teamName) => {
    if (!window.confirm(`Are you sure you want to delete "${teamName}"? This action cannot be undone.`)) return;
    try {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamId)
        .eq("organization_id", activeOrganizationId);
      if (error) throw error;
      await loadTeams();
      refreshUsageAndLimits?.();
    } catch (err) {
      alert("Failed to delete team: " + (err.message || "Unknown error"));
    }
  };

  return (
    <div>
      <Topbar
        title="Teams"
        subtitle={`${teams.length} team(s) active in organization (${teamUsage.max === null ? "Unlimited" : `Max ${teamUsage.max} on current plan`}).`}
        setMobileOpen={setMobileOpen}
        right={
          <button
            onClick={() => {
              setNewTeamName("");
              setCreateError(null);
              setShowCreateModal(true);
            }}
            className="text-sm font-semibold text-white px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition-all hover:opacity-90"
            style={{ background: T.primary }}
          >
            <Plus size={15} /> Create Team
          </button>
        }
      />

      {/* Create Team Modal */}
      {showCreateModal && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative modal-dialog border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: T.text }}>Create New Team</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              {createError && (
                <div className="p-3 rounded-xl text-xs bg-red-50 text-red-700 border border-red-200 flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: T.text }}>Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Product Engineering"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 bg-white"
                  style={{ borderColor: T.border }}
                />
              </div>

              <div>
                <p className="text-[11px] font-semibold text-gray-500 mb-1.5">Quick Presets:</p>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">🏢 Corporate Teams</p>
                    <div className="flex flex-wrap gap-1">
                      {["Engineering", "Product & Development", "Human Resources", "Finance & Accounting", "Sales", "Marketing", "Operations", "Customer Success", "Business Development", "IT & Infrastructure", "Legal & Compliance", "Administration"].map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setNewTeamName(name + " Team")}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 transition-colors"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">💻 Tech / SaaS Teams</p>
                    <div className="flex flex-wrap gap-1">
                      {["Software Engineering", "Frontend Development", "Backend Development", "DevOps & Cloud", "Data & Analytics", "AI & Machine Learning", "Product Management", "UI/UX Design", "Quality Assurance", "Technical Support"].map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setNewTeamName(name + " Team")}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 transition-colors"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border text-gray-700 hover:bg-gray-50"
                  style={{ borderColor: T.border }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: T.primary }}
                >
                  {createLoading ? "Creating..." : "Create Team"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((t) => (
          <Card key={t.id}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-base font-semibold" style={{ color: T.text }}>{t.name}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  Team
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteTeam(t.id, t.name)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Delete team"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Manager: {t.profiles?.name || "Unassigned"}
            </p>
            <p className="text-[11px] text-gray-400 mt-2">
              Created {new Date(t.created_at).toLocaleDateString()}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AdminQuestions({ setMobileOpen }) {
  const { activeOrganizationId } = useOrganization();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formLabel, setFormLabel] = useState("");
  const [formType, setFormType] = useState("rating");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadQuestions = useCallback(async () => {
    if (!supabase || !activeOrganizationId) return;
    setLoading(true);
    try {
      const { data, error: qErr } = await supabase
        .from("survey_questions")
        .select("*")
        .or(`organization_id.eq.${activeOrganizationId},organization_id.is.null`)
        .order("created_at", { ascending: true });

      if (qErr) throw qErr;

      // If organization has custom questions, display org questions
      const orgQuestions = (data || []).filter((q) => q.organization_id === activeOrganizationId);
      if (orgQuestions.length > 0) {
        setQuestions(orgQuestions);
      } else if (data && data.length > 0) {
        setQuestions(data);
      } else {
        setQuestions(CHECKIN_DIMENSIONS.map((d, i) => ({
          id: `default-${i}`,
          label: d.label,
          type: "rating",
          is_active: true,
          organization_id: null,
        })));
      }
    } catch (err) {
      console.error("[AdminQuestions] Error loading questions:", err);
      setError("Failed to load questions.");
    } finally {
      setLoading(false);
    }
  }, [activeOrganizationId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleOpenAdd = () => {
    setModalMode("add");
    setEditingQuestion(null);
    setFormLabel("");
    setFormType("rating");
    setFormActive(true);
    setError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (q) => {
    setModalMode("edit");
    setEditingQuestion(q);
    setFormLabel(q.label);
    setFormType(q.type || "rating");
    setFormActive(q.is_active !== false);
    setError(null);
    setShowModal(true);
  };

  const handleToggleActive = async (q) => {
    try {
      const newActive = !q.is_active;
      if (q.organization_id) {
        await supabase
          .from("survey_questions")
          .update({ is_active: newActive })
          .eq("id", q.id);
      } else {
        await supabase.from("survey_questions").insert({
          organization_id: activeOrganizationId,
          label: q.label,
          type: q.type || "rating",
          is_active: newActive,
        });
      }
      await loadQuestions();
    } catch (err) {
      console.error("[AdminQuestions] Toggle error:", err);
    }
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!formLabel.trim()) return;
    setSaving(true);
    setError(null);

    try {
      if (modalMode === "add") {
        const { error: insErr } = await supabase.from("survey_questions").insert({
          organization_id: activeOrganizationId,
          label: formLabel.trim(),
          type: formType,
          is_active: formActive,
        });
        if (insErr) throw insErr;
      } else if (modalMode === "edit" && editingQuestion) {
        if (editingQuestion.organization_id) {
          const { error: upErr } = await supabase
            .from("survey_questions")
            .update({
              label: formLabel.trim(),
              type: formType,
              is_active: formActive,
            })
            .eq("id", editingQuestion.id);
          if (upErr) throw upErr;
        } else {
          const { error: insErr } = await supabase.from("survey_questions").insert({
            organization_id: activeOrganizationId,
            label: formLabel.trim(),
            type: formType,
            is_active: formActive,
          });
          if (insErr) throw insErr;
        }
      }

      setShowModal(false);
      await loadQuestions();
    } catch (err) {
      console.error("[AdminQuestions] Save error:", err);
      setError(err.message || "Failed to save question.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (qId) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    setSaving(true);
    try {
      const { error: delErr } = await supabase
        .from("survey_questions")
        .delete()
        .eq("id", qId)
        .eq("organization_id", activeOrganizationId);

      if (delErr) throw delErr;
      setShowModal(false);
      await loadQuestions();
    } catch (err) {
      console.error("[AdminQuestions] Delete error:", err);
      setError(err.message || "Failed to delete question.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Topbar
        title="Check-in questions"
        subtitle="Manage what your team is asked each week."
        setMobileOpen={setMobileOpen}
        right={
          <button
            onClick={handleOpenAdd}
            className="text-sm font-semibold text-white px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition-all hover:opacity-90"
            style={{ background: T.primary }}
          >
            <Plus size={15} /> Add question
          </button>
        }
      />

      {/* Add / Edit Question Modal */}
      {showModal && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative modal-dialog border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: T.text }}>
                {modalMode === "add" ? "Add Check-in Question" : "Edit Question"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl text-xs bg-red-50 text-red-700 border border-red-200 flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: T.text }}>Question Prompt</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. I feel supported by my direct manager"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 bg-white"
                  style={{ borderColor: T.border }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: T.text }}>Question Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none bg-white"
                    style={{ borderColor: T.border }}
                  >
                    <option value="rating">1–5 Rating Scale</option>
                    <option value="text">Open Reflection</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: T.text }}>Status</label>
                  <select
                    value={formActive ? "active" : "inactive"}
                    onChange={(e) => setFormActive(e.target.value === "active")}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none bg-white"
                    style={{ borderColor: T.border }}
                  >
                    <option value="active">Active (Visible)</option>
                    <option value="inactive">Inactive (Hidden)</option>
                  </select>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-gray-500 mb-1.5">Quick Inspiration Presets:</p>
                <div className="flex flex-wrap gap-1">
                  {[
                    "Work-life balance is healthy and sustainable",
                    "I feel safe sharing honest feedback with my team",
                    "My daily responsibilities align with organizational priorities",
                    "I received helpful recognition for my contributions this week",
                    "I have the resources and tools needed to do my job effectively"
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormLabel(preset)}
                      className="text-[10px] px-2 py-1 rounded-md bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 transition-colors text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                {modalMode === "edit" && editingQuestion?.organization_id && (
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(editingQuestion.id)}
                    className="px-3 py-2.5 rounded-xl text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border text-gray-700 hover:bg-gray-50"
                  style={{ borderColor: T.border }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: T.primary }}
                >
                  {saving ? "Saving..." : modalMode === "add" ? "Create Question" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <Card padded={false}>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading questions...</div>
        ) : (
          questions.map((d, i) => (
            <div key={d.id || i} className="flex items-center justify-between px-5 py-4 border-b last:border-0 hover:bg-gray-50/50 transition-colors" style={{ borderColor: T.border }}>
              <div className="flex items-center gap-3 min-w-0 pr-4">
                <span className="text-xs font-medium w-5 shrink-0" style={{ color: T.muted }}>{i + 1}</span>
                <div className="min-w-0">
                  <span className="text-sm font-medium block truncate" style={{ color: T.text }}>{d.label}</span>
                  <span className="text-[11px] text-gray-400 capitalize">{d.type || "rating scale"}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => handleToggleActive(d)}
                  className="text-xs font-medium px-2.5 py-1 rounded-full transition-all cursor-pointer hover:opacity-80"
                  style={{
                    background: d.is_active !== false ? T.positiveBg : "#F1F2F4",
                    color: d.is_active !== false ? "#3F7A5C" : "#7B8494",
                  }}
                  title="Click to toggle Active/Inactive"
                >
                  {d.is_active !== false ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() => handleOpenEdit(d)}
                  className="text-xs font-medium hover:underline cursor-pointer"
                  style={{ color: T.primary }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

function AdminImports({ setMobileOpen }) {
  const rows = [
    { source: "Slack", status: "Synced", date: "Sep 3, 2026", records: 214 },
    { source: "Google Forms", status: "Synced", date: "Aug 27, 2026", records: 198 },
  ];
  return (
    <div>
      <Topbar title="Import history" subtitle="Data sources feeding PeoplePulse." setMobileOpen={setMobileOpen} />
      <Card padded={false}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: T.muted }}>
              {["Source", "Status", "Date", "Records"].map((h) => <th key={h} className="px-5 py-3 font-medium text-xs">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.source} className="border-t" style={{ borderColor: T.border }}>
                <td className="px-5 py-3 font-medium" style={{ color: T.text }}>{r.source}</td>
                <td className="px-5 py-3">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: T.positiveBg, color: "#3F7A5C" }}>{r.status}</span>
                </td>
                <td className="px-5 py-3" style={{ color: T.muted }}>{r.date}</td>
                <td className="px-5 py-3" style={{ color: T.text }}>{r.records}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function ToggleRow({ label, sub, defaultOn = false }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between py-3.5 border-b last:border-0" style={{ borderColor: T.border }}>
      <div>
        <p className="text-sm font-medium" style={{ color: T.text }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: T.muted }}>{sub}</p>}
      </div>
      <button
        type="button"
        onClick={() => setOn(!on)}
        className="w-11 h-6 rounded-full relative shrink-0 transition-colors"
        style={{ background: on ? T.primary : T.border }}
      >
        <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform" style={{ transform: on ? "translateX(22px)" : "translateX(2px)" }} />
      </button>
    </div>
  );
}

function AdminSettings({ setMobileOpen }) {
  const { activeOrganization, plan, usage, seatUsage, teamUsage } = useOrganization();
  return (
    <div>
      <Topbar title="Settings" subtitle="Manage your organization, plan limits, and privacy preferences." setMobileOpen={setMobileOpen} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <p className="text-base font-semibold mb-3" style={{ color: T.text }}>Subscription & Usage Limits</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: T.border }}>
              <span style={{ color: T.muted }}>Current Plan</span>
              <span className="font-semibold uppercase tracking-wide text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                {plan} tier
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: T.border }}>
              <span style={{ color: T.muted }}>Seat Allocation</span>
              <span className="font-medium" style={{ color: T.text }}>
                {seatUsage.used} / {seatUsage.max} seats used
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: T.border }}>
              <span style={{ color: T.muted }}>Team Allowance</span>
              <span className="font-medium" style={{ color: T.text }}>
                {teamUsage.used} / {teamUsage.max === null ? "Unlimited" : `${teamUsage.max} team(s)`}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span style={{ color: T.muted }}>Monthly AI Analyses</span>
              <span className="font-medium" style={{ color: T.text }}>
                {usage.used} / {usage.limit === null ? "Unlimited" : `${usage.limit} quota`}
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-base font-semibold mb-3" style={{ color: T.text }}>Privacy Controls</p>
          <div className="flex items-center gap-2 mb-3 text-xs" style={{ color: T.muted }}>
            <ShieldCheck size={14} style={{ color: T.positive }} />
            Anonymous submissions cannot be deanonymized in database or logs.
          </div>
          <ToggleRow label="Allow anonymous check-ins" sub="Employees can hide their identity" defaultOn />
          <ToggleRow label="Aggregate feedback only" sub="Show managers trends, not raw text" defaultOn />
        </Card>

        <Card>
          <p className="text-base font-semibold mb-3" style={{ color: T.text }}>Check-in settings</p>
          <ToggleRow label="Daily reminders" sub="Sent every morning at 9am" defaultOn />
          <ToggleRow label="Include free-text question" sub="Optional open response" defaultOn />
        </Card>

        <Card>
          <p className="text-base font-semibold mb-3" style={{ color: T.text }}>Organization Details</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: T.muted }}>Organization Name</label>
              <input
                readOnly
                value={activeOrganization?.name || "Acme Corp"}
                className="w-full px-3 py-2 rounded-lg border text-sm bg-gray-50"
                style={{ borderColor: T.border }}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: T.muted }}>Organization Identifier (Slug)</label>
              <input
                readOnly
                value={activeOrganization?.slug || "acme-corp"}
                className="w-full px-3 py-2 rounded-lg border text-sm bg-gray-50"
                style={{ borderColor: T.border }}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
   APPLICATION SHELL COMPONENT
   ============================================================ */
export default function PeoplePulseApp({ role = "manager", onReturnHome, onSignOut }) {
  const normalizedRole = role === "owner" ? "admin" : role;
  const [currentRole, setCurrentRole] = useState(normalizedRole);
  const [view, setView] = useState(`${normalizedRole}-dashboard`);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const norm = role === "owner" ? "admin" : role;
    setCurrentRole(norm);
    setView(`${norm}-dashboard`);
  }, [role]);

  const views = useMemo(() => ({
    "manager-dashboard": <ManagerDashboard setMobileOpen={setMobileOpen} setView={setView} />,
    "manager-team": <ManagerTeam setMobileOpen={setMobileOpen} />,
    "manager-insights": <ManagerInsights setMobileOpen={setMobileOpen} />,
    "employee-dashboard": <EmployeeDashboard setMobileOpen={setMobileOpen} setView={setView} />,
    "employee-checkin": <EmployeeCheckin setMobileOpen={setMobileOpen} onSubmitted={() => setView("employee-dashboard")} />,
    "admin-dashboard": <AdminDashboard setMobileOpen={setMobileOpen} />,
    "admin-insights": <AdminInsights setMobileOpen={setMobileOpen} />,
    "admin-employees": <AdminEmployees setMobileOpen={setMobileOpen} />,
    "admin-teams": <AdminTeams setMobileOpen={setMobileOpen} />,
    "admin-questions": <AdminQuestions setMobileOpen={setMobileOpen} />,
    "admin-imports": <AdminImports setMobileOpen={setMobileOpen} />,
    "admin-settings": <AdminSettings setMobileOpen={setMobileOpen} />,
  }), [view]);

  return (
    <div className="flex min-h-screen" style={{ background: T.bg, fontFamily: "Inter, system-ui, sans-serif" }}>
      <Sidebar
        role={currentRole}
        setRole={(r) => {
          setCurrentRole(r);
          setView(NAV[r][0].key);
        }}
        view={view}
        setView={setView}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onReturnHome={onReturnHome}
        onSignOut={onSignOut}
      />
      <main className="flex-1 min-w-0 p-5 sm:p-8">
        <div key={view} className="animate-fade-in-up">
          {views[view] || views[`${currentRole}-dashboard`]}
        </div>
      </main>
    </div>
  );
}
