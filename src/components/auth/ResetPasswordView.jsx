import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { T } from "../ui";
import {
  Home, MessageSquare, TrendingUp, Users, UserPlus, Layers, ListChecks, UploadCloud,
  Settings, Bell, ChevronDown, Lock, ArrowRight, Search, Menu, X, Sparkles,
  ArrowUp, ArrowDown, ShieldCheck, Check, LogOut, ArrowLeft, Copy, Building2, Plus, AlertCircle,
  RotateCw, Trash2, Link2, Send, Eye, EyeOff, Mail, ExternalLink, UserX, AlertTriangle, FileText, Download,
  Activity, Calendar, Clock, Heart, Award, Bot, Save, RefreshCw, CheckCircle2, ChevronRight, HelpCircle
} from "lucide-react";


export default function ResetPasswordView({ onPasswordResetSuccess, onCancel }) {
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
      let errMsg = err.message || "Failed to update password. Your reset link may have expired.";
      if (errMsg.toLowerCase().includes("auth session missing")) {
        errMsg = "Your reset session has expired or is invalid. Please request a new password reset link.";
      }
      setError(errMsg);
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
