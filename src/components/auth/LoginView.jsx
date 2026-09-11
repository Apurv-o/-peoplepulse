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


export default function LoginView({ onSignIn, onReturnHome, initialMode = "login", onGoToSignup, onGoToLogin }) {
  const {
    signIn,
    signUp,
    checkAccountExists,
    verifyEmailOtp,
    resendVerificationEmail,
    resetPassword,
    requestPasswordReset,
    verifyAndUpdatePassword,
    isConfigured,
  } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'employee' | 'signup'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isDuplicateAccountError, setIsDuplicateAccountError] = useState(false);
  const [duplicateEmail, setDuplicateEmail] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [autoLoginRole, setAutoLoginRole] = useState(null); // 'admin' | 'manager' | 'employee' | null

  // Hackathon 1-Click Auto Login Handler
  const handleAutoLogin = async (loginEmail, loginPass, targetRole) => {
    if (loading || autoLoginRole) return;
    setAutoLoginRole(targetRole);
    setLoading(true);
    setAuthError(null);
    setIsDuplicateAccountError(false);
    setResetSuccess(false);

    try {
      const result = await signIn(loginEmail, loginPass);
      const resolvedRole = result?.profile?.role || targetRole;
      onSignIn?.(resolvedRole, { isDemo: false, profile: result?.profile });
    } catch (err) {
      console.error("[Auto-Login Error]", err);
      setAuthError(err.message || `Automatic login as ${targetRole} failed.`);
      setAutoLoginRole(null);
      setLoading(false);
    }
  };

  // Email Verification State
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendNotice, setResendNotice] = useState(null);

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
    setForgotEmail(mode === "employee" ? (employeeId || email || "") : (email || ""));
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
      setForgotError("Please enter your work email address.");
      return;
    }
    setForgotLoading(true);
    try {
      await resetPassword(forgotEmail.trim());
      setForgotSuccess("If an account exists for this email, we've sent a password reset link. Please check your inbox and click the link to reset your password.");
    } catch (err) {
      console.error("[Password Reset Request Error]", err);
      // Specific error classification
      const msg = err.message || "";
      if (msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("too many requests")) {
        setForgotError("Email rate limit exceeded. Please wait a few minutes before requesting another reset link.");
      } else if (msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) {
        setForgotError("Network connection error. Please check your connection and try again.");
      } else {
        // Generic response to avoid account enumeration
        setForgotSuccess("If an account exists for this email, we've sent a password reset link. Please check your inbox and click the link to reset your password.");
      }
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

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (!verificationCode || verificationCode.length < 6) {
      setAuthError("Please enter the 6-digit verification code sent to your email.");
      return;
    }
    setVerifyLoading(true);
    setAuthError(null);
    try {
      const res = await verifyEmailOtp(pendingVerificationEmail, verificationCode);
      const userRole = res?.profile?.role || "admin";
      onSignIn?.(userRole, { isDemo: false, profile: res?.profile, isNewCompany: true });
    } catch (err) {
      console.error("[Verify OTP Error]", err);
      setAuthError(err.message || "Invalid or expired verification code. Please check your email or request a new code.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail) return;
    setResendLoading(true);
    setResendNotice(null);
    setAuthError(null);
    try {
      await resendVerificationEmail(pendingVerificationEmail);
      setResendNotice("Verification email resent! Please check your inbox and spam folder.");
    } catch (err) {
      console.error("[Resend Error]", err);
      setAuthError(err.message || "Failed to resend verification email. Please try again in a moment.");
    } finally {
      setResendLoading(false);
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
    setAuthError(null);
    setIsDuplicateAccountError(false);

    try {
      if (mode === "signup") {
        const cleanName = name.trim();
        if (!cleanName) {
          setAuthError("Please enter your full name.");
          setLoading(false);
          return;
        }
        if (cleanName.length > 100) {
          setAuthError("Name is too long. Please enter a name under 100 characters.");
          setLoading(false);
          return;
        }

        const cleanEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!cleanEmail || !emailRegex.test(cleanEmail)) {
          setAuthError("Please enter a valid work email address (e.g., name@company.com).");
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setAuthError("Password must be at least 6 characters long.");
          setLoading(false);
          return;
        }

        // Fast client check: prevent duplicate accounts before dispatching
        const exists = await checkAccountExists?.(cleanEmail);
        if (exists) {
          setIsDuplicateAccountError(true);
          setDuplicateEmail(cleanEmail);
          setAuthError("An account with this email address already exists. Please sign in or reset your password.");
          setLoading(false);
          return;
        }

        const signupRes = await signUp(cleanEmail, password, { name: cleanName, role: "admin" });
        if (signupRes?.user) {
          // Double safeguard: Supabase empty identities array signals duplicate account
          if (signupRes.user.identities && signupRes.user.identities.length === 0) {
            setIsDuplicateAccountError(true);
            setDuplicateEmail(cleanEmail);
            setAuthError("An account with this email address already exists. Please sign in or reset your password.");
            setLoading(false);
            return;
          }

          // When email verification is active, session is null until verified
          if (!signupRes.session) {
            setPendingVerificationEmail(cleanEmail);
            setVerificationCode("");
            setAuthError(null);
            setResendNotice(null);
            setLoading(false);
            return;
          }
          setSignupSuccess(true);
          try {
            const loginRes = await signIn(cleanEmail, password);
            onSignIn?.("admin", { isDemo: false, profile: loginRes?.profile, isNewCompany: true });
          } catch (autoLoginErr) {
            setAuthError("Account created! Please sign in with your password.");
            setMode("login");
          }
        }
      } else {
        const identifier = (mode === "employee" ? (employeeId || email) : email).trim();
        if (!identifier) {
          setAuthError(mode === "employee" ? "Please enter your Employee ID or work email." : "Please enter your work email or Employee ID.");
          setLoading(false);
          return;
        }
        if (identifier.length > 150) {
          setAuthError("Identifier is too long. Please enter a valid email or Employee ID.");
          setLoading(false);
          return;
        }
        const result = await signIn(identifier, password);
        const userRole = result?.profile?.role || "employee";
        onSignIn?.(userRole, { isDemo: false, profile: result?.profile });
      }
    } catch (err) {
      console.error("[Auth Error]", err);
      const msg = (err.message || "").toLowerCase();
      
      // Edge Case: Internet disconnected or fetch network failure
      if (
        !navigator.onLine ||
        msg.includes("failed to fetch") ||
        msg.includes("networkerror") ||
        msg.includes("network request failed") ||
        msg.includes("abort")
      ) {
        setAuthError("Network error: You appear to be offline or the connection was interrupted. Please check your internet connection and try again.");
      } else if (
        err.isDuplicateAccount ||
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("already been registered") ||
        msg.includes("duplicate")
      ) {
        setIsDuplicateAccountError(true);
        setDuplicateEmail((email || err.email || "").trim().toLowerCase());
        setAuthError("An account with this email address already exists. Please sign in or reset your password.");
      } else if (
        msg.includes("invalid login credentials") ||
        msg.includes("invalid_grant") ||
        msg.includes("wrong password") ||
        msg.includes("invalid password")
      ) {
        setAuthError("Incorrect password or email. Please double-check your credentials or use 'Forgot password?'.");
      } else if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed")) {
        const targetEmail = (err.resolvedEmail || (mode === "employee" ? (employeeId || email) : email)).trim().toLowerCase();
        setPendingVerificationEmail(targetEmail);
        setVerificationCode("");
        setAuthError("Your email has not been verified yet. Please enter the 6-digit verification code from your email or click the link sent to your inbox.");
      } else if (msg.includes("rate limit") || msg.includes("too many requests") || msg.includes("429")) {
        setAuthError("Too many attempts. For security reasons, please wait a few moments before trying again.");
      } else if (
        msg.includes("500") ||
        msg.includes("502") ||
        msg.includes("503") ||
        msg.includes("504") ||
        msg.includes("internal server error") ||
        msg.includes("server error") ||
        msg.includes("database error") ||
        msg.includes("service unavailable")
      ) {
        setAuthError("The service is experiencing high load or undergoing maintenance. Please wait a moment and try again.");
      } else {
        setAuthError(err.message || "Authentication failed. Please verify your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Real-time blur validation to proactively catch duplicate accounts
  const handleEmailBlur = async () => {
    if (mode !== "signup" || !email.trim() || !email.includes("@")) return;
    const cleanEmail = email.trim().toLowerCase();
    try {
      const exists = await checkAccountExists?.(cleanEmail);
      if (exists) {
        setIsDuplicateAccountError(true);
        setDuplicateEmail(cleanEmail);
        setAuthError("An account with this email address already exists. Please sign in or reset your password.");
      }
    } catch (e) {}
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
          {pendingVerificationEmail ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setPendingVerificationEmail(null);
                    setAuthError(null);
                    setResendNotice(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7B8494] hover:text-[#4E6ABF] transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </button>
                <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ background: T.primary }}>
                  P
                </div>
              </div>

              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl mx-auto mb-3 shadow-xs">
                  ✉️
                </div>
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: T.text }}>
                  Verify your email
                </h2>
                <p className="text-xs mt-2 leading-relaxed" style={{ color: T.muted }}>
                  We've sent a verification link and 6-digit confirmation code to:
                </p>
                <div className="mt-2.5">
                  <span className="font-mono text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 inline-block max-w-full truncate">
                    {pendingVerificationEmail}
                  </span>
                </div>
              </div>

              {/* Feedback Messages */}
              {authError && (
                <div className="mb-4 p-3 rounded-xl text-xs bg-red-50 border border-red-200 text-red-700 leading-relaxed flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}
              {resendNotice && (
                <div className="mb-4 p-3 rounded-xl text-xs bg-green-50 border border-green-200 text-green-700 leading-relaxed">
                  {resendNotice}
                </div>
              )}

              {/* Verification Form */}
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold block mb-1.5 text-center" style={{ color: T.text }}>
                    Enter 6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    autoFocus
                    required
                    className="w-full py-3 px-4 text-center font-mono font-bold text-2xl tracking-[0.35em] rounded-xl border outline-none focus:ring-2 bg-white transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-gray-300"
                    style={{ borderColor: T.border }}
                  />
                  <p className="text-[11px] text-center mt-1.5" style={{ color: T.muted }}>
                    Check your inbox or spam folder for your PeoplePulse code
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={verifyLoading || verificationCode.length < 6}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white mt-2 transition-all hover:shadow-lg active:translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  style={{ background: T.primary }}
                >
                  {verifyLoading ? "Verifying..." : "Verify & Activate Account →"}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t text-center space-y-2.5" style={{ borderColor: T.border }}>
                <p className="text-xs" style={{ color: T.muted }}>
                  Didn't receive the email?{" "}
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendLoading}
                    className="font-semibold underline hover:text-[#4E6ABF] cursor-pointer"
                    style={{ color: T.primary }}
                  >
                    {resendLoading ? "Resending..." : "Resend email"}
                  </button>
                </p>
                <p className="text-xs" style={{ color: T.muted }}>
                  Or click the direct confirmation button in the email to activate instantly.
                </p>
              </div>
            </div>
          ) : (
            <div>
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
                  onClick={() => { setMode("login"); setAuthError(null); setIsDuplicateAccountError(false); }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                    mode === "login" ? "bg-white text-[#1F2A28] shadow-sm" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("employee"); setAuthError(null); setIsDuplicateAccountError(false); }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                    mode === "employee" ? "bg-white text-[#1F2A28] shadow-sm" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Employee Login
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setAuthError(null); setIsDuplicateAccountError(false); }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                    mode === "signup" ? "bg-white text-[#1F2A28] shadow-sm" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Create Company
                </button>
              </div>

              <h2 className="text-2xl font-bold tracking-tight" style={{ color: T.text }}>
                {mode === "signup"
                  ? "Create your organization"
                  : mode === "employee"
                  ? "Employee Portal Sign In"
                  : "Sign in to your account"}
              </h2>
              <p className="text-sm mt-1.5 mb-6 leading-relaxed" style={{ color: T.muted }}>
                {mode === "signup"
                  ? "Set up a new workspace for your company. You will be the organization owner."
                  : mode === "employee"
                  ? "Welcome back. Enter your Employee ID or work email to access your daily check-in and dashboard."
                  : "Welcome back. Access your daily check-ins and team pulse analytics."}
              </p>

              {/* Feedback Messages */}
              {isDuplicateAccountError ? (
                <div className="mb-5 p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 text-xs shadow-xs animate-fade-in space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertCircle size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-amber-900">Account Already Exists</p>
                      <p className="text-amber-800 text-xs mt-0.5 leading-relaxed">
                        An account registered with <b className="font-semibold text-amber-950 break-all">{duplicateEmail || email}</b> is already active. To prevent duplicate accounts, you cannot register this email again.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/70">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setEmail(duplicateEmail || email);
                        setIsDuplicateAccountError(false);
                        setAuthError(null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#4E6ABF] text-white font-semibold text-xs hover:bg-[#344A91] transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      Sign In with this email →
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(duplicateEmail || email);
                        setIsDuplicateAccountError(false);
                        setAuthError(null);
                        setShowForgotModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 font-semibold text-xs hover:bg-amber-100/60 transition-all cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>
              ) : authError ? (
                <div className="mb-4 p-3.5 rounded-xl text-xs bg-red-50 border border-red-200 text-red-700 leading-relaxed flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              ) : null}
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

                {mode === "employee" ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold block" style={{ color: T.text }}>Employee ID or Work Email</label>
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                        e.g. EMP-ENG-01 or you@company.com
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        placeholder="EMP-ENG-01 or you@company.com"
                        required
                        autoFocus
                        className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 bg-white transition-all placeholder:text-gray-400"
                        style={{ borderColor: T.border }}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-semibold block mb-1.5" style={{ color: T.text }}>
                      {mode === "signup" ? "Work Email" : "Work Email"}
                    </label>
                    <input
                      type={mode === "signup" ? "email" : "text"}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (isDuplicateAccountError) {
                          setIsDuplicateAccountError(false);
                          setAuthError(null);
                        }
                      }}
                      onBlur={handleEmailBlur}
                      placeholder="you@company.com"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 bg-white transition-all"
                      style={{ borderColor: T.border }}
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold block" style={{ color: T.text }}>Password</label>
                    {mode !== "signup" && (
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1 transition-colors flex items-center justify-center cursor-pointer"
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
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white mt-2 transition-all hover:shadow-lg active:translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  style={{ background: T.primary }}
                >
                  {loading ? (
                    <>
                      <RotateCw size={15} className="animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : mode === "signup" ? (
                    "Continue to Organization Setup →"
                  ) : mode === "employee" ? (
                    "Sign in as Employee →"
                  ) : (
                    "Sign in to Dashboard →"
                  )}
                </button>
              </form>

              <p className="text-xs text-center mt-6" style={{ color: T.muted }}>
                Protected by multi-tenant RLS &amp; anonymization protocols.
              </p>

              {/* Hackathon Automatic Quick Login */}
              <div className="mt-5 pt-4 border-t border-gray-200/80">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={12} className="text-[#4E6ABF]" />
                    Hackathon Access Login
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#4E6ABF] border border-blue-200/60">
                    click here to automatically login
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Admin */}
                  <button
                    type="button"
                    disabled={loading || autoLoginRole !== null}
                    onClick={() => handleAutoLogin("admin@company.com", "Password123!", "admin")}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-purple-200/90 bg-purple-50/60 hover:bg-purple-100/80 hover:border-purple-300 hover:shadow-xs active:scale-95 transition-all duration-150 cursor-pointer text-center group disabled:opacity-50"
                    title="Auto-login as Admin: admin@company.com (Password123!)"
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <ShieldCheck size={13} className="text-purple-600 shrink-0" />
                      <span className="text-xs font-bold text-purple-900">Admin</span>
                    </div>
                    <span className="text-[10px] text-purple-700/90 truncate w-full font-medium">
                      {autoLoginRole === "admin" ? (
                        <span className="flex items-center justify-center gap-1 font-semibold text-purple-900">
                          <RotateCw size={10} className="animate-spin" /> Signing in...
                        </span>
                      ) : (
                        "admin@..."
                      )}
                    </span>
                  </button>

                  {/* Manager */}
                  <button
                    type="button"
                    disabled={loading || autoLoginRole !== null}
                    onClick={() => handleAutoLogin("sarah.patel@company.com", "Password123!", "manager")}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-blue-200/90 bg-blue-50/60 hover:bg-blue-100/80 hover:border-blue-300 hover:shadow-xs active:scale-95 transition-all duration-150 cursor-pointer text-center group disabled:opacity-50"
                    title="Auto-login as Manager: sarah.patel@company.com (Password123!)"
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <Users size={13} className="text-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-blue-900">Manager</span>
                    </div>
                    <span className="text-[10px] text-blue-700/90 truncate w-full font-medium">
                      {autoLoginRole === "manager" ? (
                        <span className="flex items-center justify-center gap-1 font-semibold text-blue-900">
                          <RotateCw size={10} className="animate-spin" /> Signing in...
                        </span>
                      ) : (
                        "sarah.p@..."
                      )}
                    </span>
                  </button>

                  {/* Employee */}
                  <button
                    type="button"
                    disabled={loading || autoLoginRole !== null}
                    onClick={() => handleAutoLogin("alex.morgan@company.com", "alex.morgan@company.com", "employee")}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-emerald-200/90 bg-emerald-50/60 hover:bg-emerald-100/80 hover:border-emerald-300 hover:shadow-xs active:scale-95 transition-all duration-150 cursor-pointer text-center group disabled:opacity-50"
                    title="Auto-login as Employee: alex.morgan@company.com"
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <Activity size={13} className="text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold text-emerald-900">Employee</span>
                    </div>
                    <span className="text-[10px] text-emerald-700/90 truncate w-full font-medium">
                      {autoLoginRole === "employee" ? (
                        <span className="flex items-center justify-center gap-1 font-semibold text-emerald-900">
                          <RotateCw size={10} className="animate-spin" /> Signing in...
                        </span>
                      ) : (
                        "alex.m@..."
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Password Reset Modal */}
      {showForgotModal && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForgotModal(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-7 border border-gray-100 relative animate-scale-in modal-dialog">
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
                  {forgotSuccess ? "Check your email for the reset link" : "Enter your email to receive a password reset link"}
                </p>
              </div>
            </div>

            {forgotError && (
              <div className="mb-4 p-3.5 rounded-xl text-xs bg-red-50 border border-red-200 text-red-700 leading-relaxed flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 leading-relaxed flex items-start gap-2.5">
                  <Check size={16} className="shrink-0 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-emerald-900 mb-1">Reset Link Dispatched</p>
                    <p>{forgotSuccess}</p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed">
                  Click the link inside the email to securely choose your new password. If you don't see it, check your spam or junk folder.
                </p>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotSuccess(null);
                      setForgotError(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Resend to another email
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white transition-all hover:shadow-md cursor-pointer"
                    style={{ background: T.primary }}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
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
                  <p className="text-[11px] text-gray-400 mt-1">
                    We will send a secure password reset link to this address.
                  </p>
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
                        <span>Sending Link...</span>
                      </>
                    ) : (
                      <span>Send Reset Link &rarr;</span>
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
