import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "../../lib/auth";
import { useOrganization } from "../../lib/organization";
import { T } from "../ui";
import {
  Home, MessageSquare, TrendingUp, Users, UserPlus, Layers, ListChecks, UploadCloud,
  Settings, Bell, ChevronDown, Lock, ArrowRight, Search, Menu, X, Sparkles,
  ArrowUp, ArrowDown, ShieldCheck, Check, LogOut, ArrowLeft, Copy, Building2, Plus, AlertCircle,
  RotateCw, Trash2, Link2, Send, Eye, EyeOff, Mail, ExternalLink, UserX, AlertTriangle, FileText, Download,
  Activity, Calendar, Clock, Heart, Award, Bot, Save, RefreshCw, CheckCircle2, ChevronRight, HelpCircle
} from "lucide-react";


export const NAV = {
  manager: [
    { key: "manager-dashboard", label: "Overview", icon: Home },
    { key: "manager-insights", label: "Insights", icon: TrendingUp },
    { key: "manager-employees", label: "Employees", icon: UserPlus },
    { key: "manager-teams", label: "Teams", icon: Layers },
    { key: "manager-questions", label: "Questions", icon: ListChecks },
    { key: "manager-imports", label: "Imports", icon: UploadCloud },
    { key: "manager-settings", label: "Settings", icon: Settings },
  ],
  employee: [
    { key: "employee-dashboard", label: "Your wellbeing", icon: Home },
    { key: "employee-checkin", label: "Daily Check-in", icon: MessageSquare },
    { key: "employee-settings", label: "Settings", icon: Settings },
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

export default function Sidebar({ role, setRole, view, setView, mobileOpen, setMobileOpen, onReturnHome, onSignOut, isDemoMode = false }) {
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

        {/* PulseAgent Copilot Quick Launcher for Admins and Managers */}
        {(effectiveRole === "admin" || effectiveRole === "manager" || effectiveRole === "owner") && (
          <div className="px-3 pt-2">
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("peoplepulse_open_copilot"));
                setMobileOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-50/90 to-indigo-50/80 border border-blue-200/80 text-[#344A91] hover:from-blue-100 hover:to-indigo-100 transition-all shadow-xs cursor-pointer group"
            >
              <Sparkles size={15} className="text-[#4E6ABF] group-hover:scale-110 transition-transform shrink-0" />
              <span className="flex-1 text-left font-medium">PulseAgent Copilot</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100/90 text-[#344A91] font-bold uppercase">AI</span>
            </button>
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
              aria-label="Sign Out"
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


