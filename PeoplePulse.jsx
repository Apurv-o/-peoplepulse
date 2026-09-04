import React, { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, CartesianGrid,
} from "recharts";
import {
  Home, MessageSquare, TrendingUp, Users, UserPlus, Layers, ListChecks, UploadCloud,
  Settings, Bell, ChevronDown, Lock, ArrowRight, Search, Menu, X, Sparkles,
  ArrowUp, ArrowDown, ShieldCheck, Check,
} from "lucide-react";

/* ============================================================
   DESIGN TOKENS
   Primary #4E6ABF · Dark #344A91 · Bg #F7F7F5 · Surface #FFFFFF
   Text #1F2A28 · Muted #7B8494 · Border #E6E7EA
   Positive #6FAE8C · Amber #E0B15C · Negative #D9847B
   Font: Inter throughout, weight does the hierarchy work.
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

function Card({ children, className = "", padded = true }) {
  return (
    <div
      className={`bg-white rounded-2xl border ${padded ? "p-6" : ""} ${className}`}
      style={{ borderColor: T.border, boxShadow: "0 1px 2px rgba(31,42,40,0.04)" }}
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
  const c = map[risk];
  return (
    <span
      className="text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ background: c.bg, color: c.fg }}
    >
      {risk}
    </span>
  );
}

function Avatar({ initials, size = 36 }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold shrink-0"
      style={{
        width: size,
        height: size,
        background: "#E9EDF8",
        color: T.primaryDark,
        fontSize: size * 0.36,
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
      className="inline-flex items-center gap-1 text-xs font-medium"
      style={{ color: good ? "#3F7A5C" : "#A3392F" }}
    >
      {isUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {Math.abs(value)}
      {suffix}
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

function AIInsightCard({ text, footnote }) {
  return (
    <div
      className="rounded-xl p-4 flex gap-3"
      style={{ background: "#F3F5FC", border: `1px solid #E3E7F5` }}
    >
      <Sparkles size={16} style={{ color: T.primary, marginTop: 2 }} className="shrink-0" />
      <div>
        <p className="text-sm leading-relaxed" style={{ color: T.text }}>{text}</p>
        {footnote && <p className="text-xs mt-2" style={{ color: T.muted }}>{footnote}</p>}
      </div>
    </div>
  );
}

function KPICard({ label, value, unit, delta, deltaSuffix, goodDirection, extra }) {
  return (
    <Card>
      <p className="text-sm font-medium" style={{ color: T.muted }}>{label}</p>
      <div className="flex items-baseline gap-1 mt-2">
        <span className="text-3xl font-bold" style={{ color: T.text }}>{value}</span>
        {unit && <span className="text-sm" style={{ color: T.muted }}>{unit}</span>}
      </div>
      <div className="mt-2">
        {delta !== undefined ? (
          <Delta value={delta} goodDirection={goodDirection} suffix={deltaSuffix} />
        ) : (
          extra
        )}
      </div>
    </Card>
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
    { key: "employee-checkin", label: "Check-in", icon: MessageSquare },
  ],
  admin: [
    { key: "admin-dashboard", label: "Overview", icon: Home },
    { key: "admin-employees", label: "Employees", icon: UserPlus },
    { key: "admin-teams", label: "Teams", icon: Layers },
    { key: "admin-questions", label: "Questions", icon: ListChecks },
    { key: "admin-imports", label: "Imports", icon: UploadCloud },
    { key: "admin-settings", label: "Settings", icon: Settings },
  ],
};

function Sidebar({ role, setRole, view, setView, mobileOpen, setMobileOpen }) {
  const items = NAV[role];
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 shrink-0 z-50 flex flex-col transition-transform
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ background: T.surface, borderRight: `1px solid ${T.border}` }}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: T.primary }}
            >
              <span className="text-white text-xs font-bold">P</span>
            </div>
            <span className="font-semibold text-[15px]" style={{ color: T.text }}>PeoplePulse</span>
          </div>
          <button className="lg:hidden" onClick={() => setMobileOpen(false)}>
            <X size={18} style={{ color: T.muted }} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { setView(item.key); setMobileOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: active ? "#EEF1FA" : "transparent",
                  color: active ? T.primaryDark : T.muted,
                }}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-4 pt-2 border-t mx-3" style={{ borderColor: T.border }}>
          <p className="text-[11px] font-medium uppercase tracking-wide px-3 pt-3 pb-1" style={{ color: T.muted }}>
            View as
          </p>
          {["employee", "manager", "admin"].map((r) => (
            <button
              key={r}
              onClick={() => { setRole(r); setView(`${r}-dashboard` === "employee-dashboard" ? "employee-dashboard" : NAV[r][0].key); }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm capitalize"
              style={{ color: role === r ? T.text : T.muted, fontWeight: role === r ? 600 : 500 }}
            >
              {r}
              {role === r && <Check size={14} style={{ color: T.primary }} />}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t" style={{ borderColor: T.border }}>
          <Avatar initials="SP" size={32} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: T.text }}>Sarah Patel</p>
            <p className="text-xs truncate capitalize" style={{ color: T.muted }}>{role}</p>
          </div>
        </div>
      </aside>
    </>
  );
}

function Topbar({ title, subtitle, setMobileOpen, right }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-3 min-w-0">
        <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
          <Menu size={20} style={{ color: T.text }} />
        </button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold truncate" style={{ color: T.text }}>{title}</h1>
          {subtitle && <p className="text-sm mt-0.5" style={{ color: T.muted }}>{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {right}
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center border relative"
          style={{ borderColor: T.border }}
        >
          <Bell size={16} style={{ color: T.muted }} />
          <span
            className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full"
            style={{ background: T.negative }}
          />
        </button>
      </div>
    </div>
  );
}

function Dropdown({ label }) {
  return (
    <button
      className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border"
      style={{ borderColor: T.border, color: T.text }}
    >
      {label}
      <ChevronDown size={14} style={{ color: T.muted }} />
    </button>
  );
}

/* ============================================================
   LOGIN VIEW
   ============================================================ */

function LoginView({ onSignIn }) {
  return (
    <div className="min-h-screen flex" style={{ background: T.bg }}>
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-14 text-white"
        style={{ background: `linear-gradient(160deg, ${T.primary}, ${T.primaryDark})` }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
            <span className="text-xs font-bold">P</span>
          </div>
          <span className="font-semibold">PeoplePulse</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight max-w-md">
            Understand how your people are feeling.
          </h1>
          <p className="mt-4 text-white/80 max-w-sm leading-relaxed">
            Weekly employee check-ins, meaningful insights, and healthier teams —
            built around trust and privacy.
          </p>
        </div>
        <p className="text-xs text-white/60">People first. Data second.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-10 justify-center">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: T.primary }}>
              <span className="text-white text-xs font-bold">P</span>
            </div>
            <span className="font-semibold" style={{ color: T.text }}>PeoplePulse</span>
          </div>

          <h2 className="text-xl font-semibold" style={{ color: T.text }}>Sign in to your account</h2>
          <p className="text-sm mt-1 mb-8" style={{ color: T.muted }}>
            Enter your details to continue.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: T.text }}>Email</label>
              <input
                type="email"
                placeholder="you@company.com"
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2"
                style={{ borderColor: T.border, "--tw-ring-color": "#C9D3ED" }}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: T.text }}>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2"
                style={{ borderColor: T.border, "--tw-ring-color": "#C9D3ED" }}
              />
            </div>

            <div className="flex items-center justify-between text-sm pt-1">
              <label className="flex items-center gap-2" style={{ color: T.muted }}>
                <input type="checkbox" className="rounded" />
                Remember me
              </label>
              <button className="font-medium" style={{ color: T.primary }}>Forgot password?</button>
            </div>

            <button
              onClick={onSignIn}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white mt-2"
              style={{ background: T.primary }}
            >
              Sign in
            </button>
          </div>

          <p className="text-xs text-center mt-10" style={{ color: T.muted }}>
            PeoplePulse · Employee Engagement &amp; Sentiment
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MANAGER DASHBOARD
   ============================================================ */

function ManagerDashboard({ setMobileOpen }) {
  return (
    <div>
      <Topbar
        title="Good morning, Sarah 👋"
        subtitle="Here's how your team is feeling this week."
        setMobileOpen={setMobileOpen}
        right={
          <div className="hidden sm:flex items-center gap-2">
            <Dropdown label="This week" />
            <Dropdown label="Engineering" />
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KPICard label="Engagement" value="78" unit="/ 100" delta={4.2} deltaSuffix="% vs last week" goodDirection="up"
          extra={<Sparkline data={engagementTrend} />} />
        <Card>
          <p className="text-sm font-medium" style={{ color: T.muted }}>Check-in rate</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-bold" style={{ color: T.text }}>86%</span>
          </div>
          <div className="mt-3 h-1.5 rounded-full" style={{ background: T.border }}>
            <div className="h-1.5 rounded-full" style={{ width: "86%", background: T.primary }} />
          </div>
          <div className="mt-2"><Delta value={8} suffix="% this week" /></div>
        </Card>
        <Card>
          <p className="text-sm font-medium" style={{ color: T.muted }}>Average stress</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-bold" style={{ color: T.text }}>2.4</span>
            <span className="text-sm" style={{ color: T.muted }}>/ 5</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Delta value={-0.3} goodDirection="down" />
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: T.positiveBg, color: "#3F7A5C" }}
            >
              Healthy
            </span>
          </div>
        </Card>
        <Card>
          <p className="text-sm font-medium" style={{ color: T.muted }}>Attention needed</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-bold" style={{ color: T.text }}>3</span>
          </div>
          <p className="text-xs mt-2" style={{ color: T.muted }}>2 Medium · 1 High</p>
          <button className="text-xs font-medium mt-2 flex items-center gap-1" style={{ color: T.primary }}>
            View insights <ArrowRight size={12} />
          </button>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-base font-semibold" style={{ color: T.text }}>Engagement trend</p>
              <p className="text-xs mt-0.5" style={{ color: T.muted }}>+7 points over 4 weeks</p>
            </div>
            <Dropdown label="4 weeks" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={engagementTrend} margin={{ left: -20 }}>
              <CartesianGrid vertical={false} stroke={T.border} />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: T.muted }} axisLine={false} tickLine={false} />
              <YAxis domain={[60, 90]} tick={{ fontSize: 12, fill: T.muted }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${T.border}`, fontSize: 13 }} />
              <Line type="monotone" dataKey="score" stroke={T.primary} strokeWidth={2.5} dot={{ r: 3, fill: T.primary }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <p className="text-base font-semibold mb-1" style={{ color: T.text }}>Team sentiment</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={110} height={110}>
              <PieChart>
                <Pie data={sentimentSplit} dataKey="value" innerRadius={34} outerRadius={50} startAngle={90} endAngle={-270}>
                  {sentimentSplit.map((s, i) => <Cell key={i} fill={s.color} stroke="none" />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5">
              {sentimentSplit.map((s) => (
                <div key={s.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span style={{ color: T.muted }}>{s.name}</span>
                  <span className="font-medium" style={{ color: T.text }}>{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <AIInsightCard
              text="Engagement improved this week, with the biggest improvement coming from workload and team collaboration."
              footnote="Based on 42 check-ins"
            />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="text-base font-semibold" style={{ color: T.text }}>Team health</p>
            <button className="text-xs font-medium flex items-center gap-1" style={{ color: T.primary }}>
              View all employees <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-1">
            <div className="hidden sm:grid grid-cols-[1fr_80px_60px_70px] text-xs px-2 pb-2" style={{ color: T.muted }}>
              <span>Employee</span><span>Engagement</span><span>Trend</span><span>Risk</span>
            </div>
            {teamHealth.map((p) => (
              <div
                key={p.name}
                className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_80px_60px_70px] items-center gap-2 px-2 py-2.5 rounded-lg"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar initials={p.initials} size={30} />
                  <span className="text-sm font-medium truncate" style={{ color: T.text }}>{p.name}</span>
                </div>
                <span className="hidden sm:block text-sm font-medium" style={{ color: T.text }}>{p.score}</span>
                <span className="hidden sm:block">
                  {p.trend === "up"
                    ? <ArrowUp size={14} style={{ color: T.positive }} />
                    : <ArrowDown size={14} style={{ color: T.negative }} />}
                </span>
                <div className="justify-self-end sm:justify-self-start">
                  <RiskBadge risk={p.risk} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-base font-semibold" style={{ color: T.text }}>Anonymous feedback</p>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-3xl font-bold" style={{ color: T.text }}>12</span>
            <span className="text-sm" style={{ color: T.muted }}>anonymous responses this week</span>
          </div>
          <div className="mt-4 p-3 rounded-xl text-sm leading-relaxed" style={{ background: T.bg, color: T.text }}>
            “{feedbackSamples[0]}”
          </div>
          <p className="text-xs mt-2" style={{ color: T.muted }}>Anonymous · This week</p>
          <div className="flex items-center gap-1.5 mt-3 text-xs" style={{ color: T.muted }}>
            <Lock size={12} />
            Anonymous responses are never attributed to individuals.
          </div>
          <button
            className="w-full mt-4 py-2 rounded-xl text-sm font-medium border"
            style={{ borderColor: T.border, color: T.text }}
          >
            View aggregated feedback
          </button>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
   MANAGER TEAM / INSIGHTS (lighter pages)
   ============================================================ */

function ManagerTeam({ setMobileOpen }) {
  return (
    <div>
      <Topbar title="Team" subtitle="Engineering · 12 members" setMobileOpen={setMobileOpen}
        right={<Dropdown label="This week" />} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Team engagement" value="78" unit="/ 100" delta={4.2} deltaSuffix="%" goodDirection="up" />
        <KPICard label="Participation" value="86%" delta={8} deltaSuffix="%" goodDirection="up" />
        <KPICard label="Average stress" value="2.4" unit="/ 5" delta={-0.3} goodDirection="down" />
        <Card>
          <p className="text-sm font-medium" style={{ color: T.muted }}>Sentiment</p>
          <p className="text-3xl font-bold mt-2" style={{ color: T.positive }}>68% pos.</p>
        </Card>
      </div>
      <Card className="mb-6">
        <p className="text-base font-semibold mb-4" style={{ color: T.text }}>Engagement trend</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={engagementTrend} margin={{ left: -20 }}>
            <CartesianGrid vertical={false} stroke={T.border} />
            <XAxis dataKey="week" tick={{ fontSize: 12, fill: T.muted }} axisLine={false} tickLine={false} />
            <YAxis domain={[60, 90]} tick={{ fontSize: 12, fill: T.muted }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${T.border}`, fontSize: 13 }} />
            <Line type="monotone" dataKey="score" stroke={T.primary} strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <p className="text-base font-semibold mb-3" style={{ color: T.text }}>Team members</p>
        {teamHealth.map((p) => (
          <div key={p.name} className="flex items-center justify-between py-2.5 border-b last:border-0" style={{ borderColor: T.border }}>
            <div className="flex items-center gap-2.5">
              <Avatar initials={p.initials} size={30} />
              <span className="text-sm font-medium" style={{ color: T.text }}>{p.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm" style={{ color: T.text }}>{p.score}</span>
              {p.trend === "up" ? <ArrowUp size={14} style={{ color: T.positive }} /> : <ArrowDown size={14} style={{ color: T.negative }} />}
              <RiskBadge risk={p.risk} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function ManagerInsights({ setMobileOpen }) {
  return (
    <div>
      <Topbar title="Insights" subtitle="What's shaping your team's engagement." setMobileOpen={setMobileOpen} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <p className="text-base font-semibold mb-3" style={{ color: T.text }}>What's changing</p>
          <ul className="space-y-2.5 text-sm">
            <li className="flex justify-between"><span style={{ color: T.text }}>Engagement</span><Delta value={6} suffix="%" /></li>
            <li className="flex justify-between"><span style={{ color: T.text }}>Stress</span><Delta value={-0.3} goodDirection="down" /></li>
            <li className="flex justify-between"><span style={{ color: T.text }}>Participation</span><Delta value={8} suffix="%" /></li>
          </ul>
        </Card>
        <Card>
          <p className="text-base font-semibold mb-3" style={{ color: T.text }}>Areas to watch</p>
          <div className="flex flex-wrap gap-2">
            {["Workload", "Manager support", "Motivation"].map((a) => (
              <span key={a} className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: T.amberBg, color: "#9A6B1E" }}>
                {a}
              </span>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <p className="text-base font-semibold mb-3" style={{ color: T.text }}>AI insights</p>
          <div className="space-y-3">
            <AIInsightCard text="Engagement improved 6% this week. The biggest gains came from workload and team collaboration scores." footnote="Based on 42 check-ins" />
            <AIInsightCard text="Manager support scores dipped slightly for two team members — worth a 1:1 check-in." footnote="Based on 42 check-ins" />
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <p className="text-base font-semibold mb-3" style={{ color: T.text }}>Anonymous feedback</p>
          <div className="space-y-2">
            {feedbackSamples.map((f, i) => (
              <div key={i} className="p-3 rounded-xl text-sm leading-relaxed" style={{ background: T.bg, color: T.text }}>
                “{f}”
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
   EMPLOYEE CHECK-IN
   ============================================================ */

const CHECKIN_DIMENSIONS = [
  { key: "workload", label: "Workload" },
  { key: "support", label: "Manager support" },
  { key: "collab", label: "Team collaboration" },
  { key: "motivation", label: "Motivation" },
  { key: "stress", label: "Stress level" },
];

const FACES = ["😣", "🙁", "😐", "🙂", "😄"];

function RatingSelector({ label, value, onChange }) {
  return (
    <div className="py-4 border-b last:border-0" style={{ borderColor: T.border }}>
      <p className="text-sm font-medium mb-3" style={{ color: T.text }}>{label}</p>
      <div className="flex justify-between gap-2">
        {FACES.map((face, i) => {
          const n = i + 1;
          const active = value === n;
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all"
              style={{
                borderColor: active ? T.primary : T.border,
                background: active ? "#EEF1FA" : "transparent",
                transform: active ? "scale(1.04)" : "scale(1)",
              }}
            >
              <span className="text-xl">{face}</span>
              <span className="text-[11px] font-medium" style={{ color: active ? T.primaryDark : T.muted }}>{n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmployeeCheckin({ setMobileOpen, onSubmitted }) {
  const [ratings, setRatings] = useState({});
  const [note, setNote] = useState("");
  const [anon, setAnon] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const complete = CHECKIN_DIMENSIONS.every((d) => ratings[d.key]);

  if (submitted) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: T.positiveBg }}
        >
          <Check size={24} style={{ color: T.positive }} />
        </div>
        <h2 className="text-xl font-bold" style={{ color: T.text }}>Check-in complete</h2>
        <p className="text-sm mt-1" style={{ color: T.muted }}>Thanks for checking in.</p>

        <Card className="mt-8 text-left">
          <p className="text-sm font-medium" style={{ color: T.muted }}>Your engagement this week</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-bold" style={{ color: T.text }}>82</span>
            <span className="text-sm" style={{ color: T.muted }}>/ 100</span>
          </div>
          <div className="mt-1"><Delta value={5} suffix=" points from last week" /></div>
          <div className="mt-4">
            <Sparkline data={engagementTrend} />
          </div>
        </Card>

        <button
          onClick={() => onSubmitted?.()}
          className="w-full mt-6 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5"
          style={{ background: T.primary }}
        >
          View my history <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <Topbar title="How are you doing this week?" subtitle="It takes about 60 seconds." setMobileOpen={setMobileOpen} />
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

      <Card className="mt-4">
        <p className="text-sm font-medium mb-2" style={{ color: T.text }}>Anything you'd like to share?</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 500))}
          placeholder="Tell us what's on your mind..."
          rows={4}
          className="w-full rounded-xl border p-3 text-sm outline-none resize-none"
          style={{ borderColor: T.border }}
        />
        <p className="text-xs text-right mt-1" style={{ color: T.muted }}>{note.length} / 500</p>
      </Card>

      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: T.text }}>Submit anonymously</p>
            <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: T.muted }}>
              <Lock size={11} /> Your identity won't be attached to this response.
            </p>
          </div>
          <button
            onClick={() => setAnon(!anon)}
            className="w-11 h-6 rounded-full relative shrink-0 transition-colors"
            style={{ background: anon ? T.primary : T.border }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
              style={{ transform: anon ? "translateX(22px)" : "translateX(2px)" }}
            />
          </button>
        </div>
      </Card>

      <button
        disabled={!complete}
        onClick={() => setSubmitted(true)}
        className="w-full mt-5 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-40"
        style={{ background: T.primary }}
      >
        Submit check-in <ArrowRight size={14} />
      </button>
    </div>
  );
}

/* ============================================================
   EMPLOYEE DASHBOARD / HISTORY
   ============================================================ */

function EmployeeDashboard({ setMobileOpen }) {
  return (
    <div>
      <Topbar title="Your wellbeing" subtitle="A quiet look at how you've been doing." setMobileOpen={setMobileOpen} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Engagement" value="82" unit="/ 100" delta={5} goodDirection="up" />
        <KPICard label="Stress level" value="2.1" unit="/ 5" delta={-0.5} goodDirection="down" />
        <KPICard label="Check-in streak" value="6" unit="weeks" />
        <Card>
          <p className="text-sm font-medium" style={{ color: T.muted }}>Latest sentiment</p>
          <p className="text-2xl font-bold mt-2" style={{ color: T.positive }}>Positive</p>
        </Card>
      </div>
      <Card className="mb-6">
        <p className="text-base font-semibold mb-4" style={{ color: T.text }}>Your engagement trend</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={engagementTrend} margin={{ left: -20 }}>
            <CartesianGrid vertical={false} stroke={T.border} />
            <XAxis dataKey="week" tick={{ fontSize: 12, fill: T.muted }} axisLine={false} tickLine={false} />
            <YAxis domain={[60, 90]} tick={{ fontSize: 12, fill: T.muted }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${T.border}`, fontSize: 13 }} />
            <Line type="monotone" dataKey="score" stroke={T.primary} strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <p className="text-base font-semibold mb-3" style={{ color: T.text }}>Your recent check-ins</p>
        {myCheckins.map((c) => (
          <div key={c.date} className="flex items-center justify-between py-2.5 border-b last:border-0" style={{ borderColor: T.border }}>
            <span className="text-sm" style={{ color: T.text }}>{c.date}</span>
            <span className="text-sm" style={{ color: T.muted }}>Engagement {c.engagement}</span>
            <span className="text-sm" style={{ color: T.muted }}>Stress {c.stress}</span>
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{
                background: c.sentiment === "Positive" ? T.positiveBg : "#F1F2F4",
                color: c.sentiment === "Positive" ? "#3F7A5C" : T.muted,
              }}
            >
              {c.sentiment}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ============================================================
   ADMIN DASHBOARD
   ============================================================ */

function AdminDashboard({ setMobileOpen }) {
  return (
    <div>
      <Topbar title="Organization overview" subtitle="Across all teams, this week." setMobileOpen={setMobileOpen} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Employees" value="248" />
        <KPICard label="Weekly participation" value="81%" delta={3} goodDirection="up" />
        <KPICard label="Org. engagement" value="76" unit="/ 100" delta={2.5} goodDirection="up" />
        <KPICard label="Average stress" value="2.6" unit="/ 5" delta={-0.2} goodDirection="down" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        <Card>
          <p className="text-base font-semibold mb-4" style={{ color: T.text }}>Organization engagement</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={engagementTrend} margin={{ left: -20 }}>
              <CartesianGrid vertical={false} stroke={T.border} />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: T.muted }} axisLine={false} tickLine={false} />
              <YAxis domain={[60, 90]} tick={{ fontSize: 12, fill: T.muted }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${T.border}`, fontSize: 13 }} />
              <Line type="monotone" dataKey="score" stroke={T.primary} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <p className="text-base font-semibold mb-4" style={{ color: T.text }}>Team comparison</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={teamComparison} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: T.muted }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="team" tick={{ fontSize: 12, fill: T.text }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${T.border}`, fontSize: 13 }} />
              <Bar dataKey="score" fill={T.primary} radius={[0, 6, 6, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <p className="text-base font-semibold mb-3" style={{ color: T.text }}>Sentiment distribution</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={110} height={110}>
              <PieChart>
                <Pie data={sentimentSplit} dataKey="value" innerRadius={34} outerRadius={50}>
                  {sentimentSplit.map((s, i) => <Cell key={i} fill={s.color} stroke="none" />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5">
              {sentimentSplit.map((s) => (
                <div key={s.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span style={{ color: T.muted }}>{s.name}</span>
                  <span className="font-medium" style={{ color: T.text }}>{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card>
          <p className="text-base font-semibold mb-3" style={{ color: T.text }}>Employee activity</p>
          <ul className="space-y-2.5 text-sm">
            <li className="flex justify-between"><span style={{ color: T.muted }}>Check-ins this week</span><span className="font-medium" style={{ color: T.text }}>201</span></li>
            <li className="flex justify-between"><span style={{ color: T.muted }}>New employees</span><span className="font-medium" style={{ color: T.text }}>6</span></li>
            <li className="flex justify-between"><span style={{ color: T.muted }}>Flagged for attention</span><span className="font-medium" style={{ color: T.text }}>9</span></li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
   ADMIN EMPLOYEES / TEAMS / QUESTIONS / IMPORTS / SETTINGS
   ============================================================ */

const employeeRows = [
  { name: "Aditi Sharma", email: "aditi.sharma@company.com", team: "Engineering", manager: "Sarah Patel", role: "Member", status: "Active" },
  { name: "Rohan Kumar", email: "rohan.kumar@company.com", team: "Engineering", manager: "Sarah Patel", role: "Member", status: "Active" },
  { name: "Priya Singh", email: "priya.singh@company.com", team: "Design", manager: "Sarah Patel", role: "Member", status: "Active" },
  { name: "Nikhil Patel", email: "nikhil.patel@company.com", team: "Sales", manager: "Arjun Rao", role: "Member", status: "Invited" },
];

function AdminEmployees({ setMobileOpen }) {
  return (
    <div>
      <Topbar title="Employees" subtitle="248 people across 5 teams." setMobileOpen={setMobileOpen}
        right={
          <button className="text-sm font-semibold text-white px-4 py-2 rounded-xl" style={{ background: T.primary }}>
            + Add employee
          </button>
        }
      />
      <Card padded={false} className="overflow-hidden">
        <div className="p-4 flex flex-wrap gap-2 border-b" style={{ borderColor: T.border }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 min-w-[180px]" style={{ borderColor: T.border }}>
            <Search size={14} style={{ color: T.muted }} />
            <input placeholder="Search employees..." className="text-sm outline-none w-full" />
          </div>
          <Dropdown label="Team" />
          <Dropdown label="Role" />
          <Dropdown label="Status" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left" style={{ color: T.muted }}>
                {["Name", "Team", "Manager", "Role", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employeeRows.map((e) => (
                <tr key={e.email} className="border-t" style={{ borderColor: T.border }}>
                  <td className="px-4 py-3">
                    <p className="font-medium" style={{ color: T.text }}>{e.name}</p>
                    <p className="text-xs" style={{ color: T.muted }}>{e.email}</p>
                  </td>
                  <td className="px-4 py-3" style={{ color: T.text }}>{e.team}</td>
                  <td className="px-4 py-3" style={{ color: T.text }}>{e.manager}</td>
                  <td className="px-4 py-3" style={{ color: T.text }}>{e.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{
                        background: e.status === "Active" ? T.positiveBg : T.amberBg,
                        color: e.status === "Active" ? "#3F7A5C" : "#9A6B1E",
                      }}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: T.muted }}>•••</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AdminTeams({ setMobileOpen }) {
  return (
    <div>
      <Topbar title="Teams" subtitle="5 teams across the organization." setMobileOpen={setMobileOpen} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamComparison.map((t) => (
          <Card key={t.team}>
            <p className="text-base font-semibold" style={{ color: T.text }}>{t.team}</p>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold" style={{ color: T.text }}>{t.score}</span>
              <span className="text-sm" style={{ color: T.muted }}>engagement</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AdminQuestions({ setMobileOpen }) {
  return (
    <div>
      <Topbar title="Check-in questions" subtitle="Manage what your team is asked each week." setMobileOpen={setMobileOpen}
        right={<button className="text-sm font-semibold text-white px-4 py-2 rounded-xl" style={{ background: T.primary }}>+ Add question</button>} />
      <Card padded={false}>
        {CHECKIN_DIMENSIONS.map((d, i) => (
          <div key={d.key} className="flex items-center justify-between px-5 py-4 border-b last:border-0" style={{ borderColor: T.border }}>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium w-5" style={{ color: T.muted }}>{i + 1}</span>
              <span className="text-sm font-medium" style={{ color: T.text }}>{d.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: T.positiveBg, color: "#3F7A5C" }}>Active</span>
              <button className="text-xs font-medium" style={{ color: T.primary }}>Edit</button>
            </div>
          </div>
        ))}
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
  return (
    <div>
      <Topbar title="Settings" subtitle="Manage your organization and preferences." setMobileOpen={setMobileOpen} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <p className="text-base font-semibold mb-3" style={{ color: T.text }}>Privacy</p>
          <div className="flex items-center gap-2 mb-3 text-xs" style={{ color: T.muted }}>
            <ShieldCheck size={14} style={{ color: T.positive }} />
            Anonymous responses are never linked back to an individual.
          </div>
          <ToggleRow label="Allow anonymous check-ins" sub="Employees can hide their identity" defaultOn />
          <ToggleRow label="Aggregate feedback only" sub="Show managers trends, not raw text" defaultOn />
        </Card>
        <Card>
          <p className="text-base font-semibold mb-3" style={{ color: T.text }}>Check-in settings</p>
          <ToggleRow label="Weekly reminders" sub="Sent every Monday at 9am" defaultOn />
          <ToggleRow label="Include free-text question" sub="Optional open response" defaultOn />
        </Card>
        <Card>
          <p className="text-base font-semibold mb-3" style={{ color: T.text }}>Notifications</p>
          <ToggleRow label="Weekly digest email" defaultOn />
          <ToggleRow label="High-risk alerts" sub="Notify managers immediately" defaultOn />
        </Card>
        <Card>
          <p className="text-base font-semibold mb-3" style={{ color: T.text }}>Organization</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: T.muted }}>Organization name</label>
              <input defaultValue="Acme Inc." className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: T.border }} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: T.muted }}>Check-in day</label>
              <input defaultValue="Monday" className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: T.border }} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
   APP ROOT
   ============================================================ */

export default function App() {
  const [signedIn, setSignedIn] = useState(false);
  const [role, setRole] = useState("manager");
  const [view, setView] = useState("manager-dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  const views = useMemo(() => ({
    "manager-dashboard": <ManagerDashboard setMobileOpen={setMobileOpen} />,
    "manager-team": <ManagerTeam setMobileOpen={setMobileOpen} />,
    "manager-insights": <ManagerInsights setMobileOpen={setMobileOpen} />,
    "employee-dashboard": <EmployeeDashboard setMobileOpen={setMobileOpen} />,
    "employee-checkin": <EmployeeCheckin setMobileOpen={setMobileOpen} onSubmitted={() => setView("employee-dashboard")} />,
    "admin-dashboard": <AdminDashboard setMobileOpen={setMobileOpen} />,
    "admin-employees": <AdminEmployees setMobileOpen={setMobileOpen} />,
    "admin-teams": <AdminTeams setMobileOpen={setMobileOpen} />,
    "admin-questions": <AdminQuestions setMobileOpen={setMobileOpen} />,
    "admin-imports": <AdminImports setMobileOpen={setMobileOpen} />,
    "admin-settings": <AdminSettings setMobileOpen={setMobileOpen} />,
  }), [view]);

  if (!signedIn) {
    return <LoginView onSignIn={() => setSignedIn(true)} />;
  }

  return (
    <div className="flex min-h-screen" style={{ background: T.bg, fontFamily: "Inter, system-ui, sans-serif" }}>
      <Sidebar role={role} setRole={setRole} view={view} setView={setView} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main className="flex-1 min-w-0 p-5 sm:p-8">
        {views[view]}
      </main>
    </div>
  );
}
