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

import Topbar from "../layout/Topbar";

export default function AdminSettings({ setMobileOpen, onSignOut, onReturnHome }) {
  const { user, profile, deleteAccount, signOut, updateProfileName } = useAuth();
  const { activeOrganization, plan, usage, seatUsage, teamUsage } = useOrganization();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Editable Name State
  const initialName = profile?.name || profile?.full_name || user?.user_metadata?.name || user?.user_metadata?.full_name || "";
  const [nameVal, setNameVal] = useState(initialName);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSaveMsg, setNameSaveMsg] = useState(null);

  useEffect(() => {
    const current = profile?.name || profile?.full_name || user?.user_metadata?.name || user?.user_metadata?.full_name || "";
    if (current) {
      setNameVal(current);
    }
  }, [profile?.name, profile?.full_name, user?.user_metadata]);

  const handleSaveName = async (e) => {
    e?.preventDefault?.();
    const cleanName = nameVal.trim();
    if (!cleanName) {
      setNameSaveMsg({ type: "error", text: "Name cannot be empty." });
      return;
    }
    setIsSavingName(true);
    setNameSaveMsg(null);
    try {
      if (updateProfileName) {
        await updateProfileName(cleanName);
      } else {
        await supabase.from("profiles").update({ name: cleanName }).eq("id", user.id);
        await supabase.auth.updateUser({ data: { name: cleanName, full_name: cleanName } });
      }
      setNameSaveMsg({ type: "success", text: "Full name updated successfully!" });
      setTimeout(() => setNameSaveMsg(null), 3500);
    } catch (err) {
      console.error("[handleSaveName error]:", err);
      setNameSaveMsg({ type: "error", text: err.message || "Failed to update full name." });
    } finally {
      setIsSavingName(false);
    }
  };

  const targetConfirmText = (user?.email || "DELETE").trim().toLowerCase();
  const isConfirmValid = hasConsent && confirmText.trim().toLowerCase() === targetConfirmText;

  const handleDeleteAccount = async () => {
    if (!isConfirmValid || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      if (deleteAccount && user && user.id !== "demo") {
        await deleteAccount();
      } else if (signOut) {
        await signOut();
      }
      setDeleteModalOpen(false);
      if (onSignOut) {
        onSignOut();
      } else if (onReturnHome) {
        onReturnHome();
      } else {
        window.location.href = "/";
      }
    } catch (err) {
      console.error("[handleDeleteAccount error]:", err);
      setDeleteError(err.message || "Failed to delete account. Please try again or contact support.");
      setIsDeleting(false);
    }
  };

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
          <p className="text-base font-semibold mb-3" style={{ color: T.text }}>Account Information</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: T.muted }}>Full Name</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  placeholder="Enter your full name"
                  className="flex-1 px-3 py-2 rounded-lg border text-sm bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  style={{ borderColor: T.border }}
                />
                <button
                  type="button"
                  disabled={isSavingName || !nameVal.trim() || nameVal.trim() === (profile?.name || profile?.full_name || user?.user_metadata?.name || user?.user_metadata?.full_name || "")}
                  onClick={handleSaveName}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#4E6ABF] text-white hover:bg-[#344A91] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                >
                  {isSavingName ? <RotateCw size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>Save</span>
                </button>
              </div>
              {nameSaveMsg && (
                <p className={`text-xs mt-1.5 font-medium ${nameSaveMsg.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
                  {nameSaveMsg.text}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: T.muted }}>Email Address</label>
              <input
                readOnly
                value={user?.email || "—"}
                className="w-full px-3 py-2 rounded-lg border text-sm bg-gray-50"
                style={{ borderColor: T.border }}
              />
            </div>
          </div>
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

        {/* Danger Zone: Delete Account */}
        <div className="col-span-1 lg:col-span-2">
          <Card className="border border-red-200/80 bg-gradient-to-r from-red-50/30 via-white to-red-50/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 rounded-md">
                    Danger Zone
                  </span>
                </div>
                <p className="text-base font-semibold text-gray-900">Delete Account</p>
                <p className="text-xs text-gray-500 mt-0.5 max-w-xl leading-relaxed">
                  Permanently remove your account, profile data, login credentials, and team memberships. Once confirmed, this action cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHasConsent(false);
                  setConfirmText("");
                  setDeleteError(null);
                  setDeleteModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white hover:border-red-600 font-semibold text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-center"
              >
                <Trash2 size={14} />
                <span>Delete Account</span>
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Account Consent Modal */}
      {deleteModalOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 border border-red-100 relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-sm">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Account Permanently</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  This action is permanent and completely irreversible.
                </p>
              </div>
            </div>

            <div className="bg-red-50/80 border border-red-200 rounded-2xl p-3.5 mb-4 text-xs text-red-900 space-y-1.5 leading-relaxed">
              <p className="font-semibold text-red-950 flex items-center gap-1.5">
                <AlertCircle size={14} className="shrink-0 text-red-600" />
                What happens when you delete your account:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-red-800 text-[11px]">
                <li>Your profile, email, and authentication credentials will be erased immediately.</li>
                <li>Your memberships in <strong>{activeOrganization?.name || "your organization"}</strong> will be terminated.</li>
                <li>You will be logged out of all devices and active sessions revoked.</li>
                <li>Past pulse check-in metrics remain anonymized without your identity.</li>
                <li>A final confirmation receipt will be automatically sent to your email.</li>
              </ul>
            </div>

            {deleteError && (
              <div className="p-3 mb-4 rounded-xl text-xs bg-red-100 text-red-800 border border-red-200 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            {/* Consent Checkbox */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 hover:bg-gray-50/80 cursor-pointer transition-colors text-xs text-gray-700 select-none mb-4">
              <input
                type="checkbox"
                checked={hasConsent}
                onChange={(e) => setHasConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
              />
              <span className="leading-normal">
                I understand and give my explicit consent to permanently delete my account and data.
              </span>
            </label>

            {/* Confirm text field */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                To confirm, please type <span className="font-mono text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">{user?.email || "DELETE"}</span> below:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`Type ${user?.email || "DELETE"}`}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 transition-all bg-white"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteModalOpen(false);
                  setHasConsent(false);
                  setConfirmText("");
                  setDeleteError(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!isConfirmValid || isDeleting}
                onClick={handleDeleteAccount}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <RotateCw size={14} className="animate-spin" />
                    <span>Deleting Account...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ============================================================
   APPLICATION SHELL COMPONENT
   ============================================================ */
