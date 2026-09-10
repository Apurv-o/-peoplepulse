import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => {
    if (typeof window === "undefined") return false;
    if (sessionStorage.getItem("peoplepulse_password_recovery") === "true") return true;
    const hash = (window.location.hash || "").toLowerCase();
    const search = (window.location.search || "").toLowerCase();
    const isRec = hash.includes("type=recovery") || search.includes("type=recovery") || hash.includes("reset-password") || search.includes("reset-password") || search.includes("reset_password");
    if (isRec) {
      try { sessionStorage.setItem("peoplepulse_password_recovery", "true"); } catch (e) {}
    }
    return isRec;
  });

  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Fetch trusted profile directly from database to determine role securely
  const fetchProfile = async (userId) => {
    if (!supabase || !userId) {
      setProfile(null);
      setRole(null);
      return null;
    }
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, role, manager_id, department_id, is_active")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("[PeoplePulse Auth] Error fetching user profile:", error.message);
        return null;
      }

      setProfile(data);
      setRole(data?.role || "employee");
      return data;
    } catch (err) {
      console.error("[PeoplePulse Auth] Unexpected profile error:", err);
      return null;
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user || null);
      if (initialSession?.user) {
        fetchProfile(initialSession.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // 2. Real-time auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser((prevUser) => {
          if (prevUser?.id && currentSession?.user?.id && prevUser.id === currentSession.user.id) {
            return prevUser;
          }
          return currentSession?.user || null;
        });

        if (event === "PASSWORD_RECOVERY") {
          setIsPasswordRecovery(true);
          try { sessionStorage.setItem("peoplepulse_password_recovery", "true"); } catch (e) {}
        }

        if (currentSession?.user) {
          if (!profileRef.current || profileRef.current.id !== currentSession.user.id) {
            await fetchProfile(currentSession.user.id);
          }
        } else {
          setProfile(null);
          setRole(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Check if an email already belongs to an existing registered account
  const checkAccountExists = async (email) => {
    if (!supabase || !email) return false;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) return false;
    try {
      const { data, error } = await supabase.rpc("check_account_exists", {
        p_email: cleanEmail,
      });
      if (!error && data && typeof data.exists === "boolean") {
        return data.exists;
      }
    } catch (e) {
      console.warn("[checkAccountExists] RPC notice:", e.message);
    }
    return false;
  };

  const signUp = async (email, password, metadata = {}) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase is not configured yet with valid credentials.");
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      throw new Error("Please provide a valid work email address.");
    }

    // Step 0: Fast check against existing accounts to prevent duplicate registration
    const alreadyExists = await checkAccountExists(cleanEmail);
    if (alreadyExists) {
      const dupeError = new Error("An account with this email address already exists. Please sign in with your password or reset it.");
      dupeError.isDuplicateAccount = true;
      dupeError.email = cleanEmail;
      throw dupeError;
    }

    let origin = typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://peoplepulse-app.vercel.app";
    if (origin.includes("peoplepulse-n-8650.vercel.app")) {
      origin = "https://peoplepulse-app.vercel.app";
    }
    const redirectUrl = `${origin.replace(/\/$/, "")}/#email-confirmed`;

    const userRole = metadata?.role || "admin";

    // 1. Dispatch via high-deliverability Brevo Edge Function
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("send-verification-email", {
        body: {
          email: cleanEmail,
          password,
          name: metadata?.name || cleanEmail.split("@")[0],
          role: userRole,
          redirectTo: redirectUrl,
        },
      });

      if (!fnError && fnData?.user) {
        return {
          user: fnData.user,
          session: null,
          status: fnData.status,
        };
      }

      if (fnError) {
        if (fnError.context) {
          try {
            const errBody = await fnError.context.json();
            if (errBody?.error) {
              const errMsg = (errBody.error || "").toLowerCase();
              if (
                errMsg.includes("already been registered") ||
                errMsg.includes("already registered") ||
                errMsg.includes("already exists") ||
                errMsg.includes("duplicate")
              ) {
                const dupeError = new Error("An account with this email address already exists. Please sign in with your password or reset it.");
                dupeError.isDuplicateAccount = true;
                dupeError.email = cleanEmail;
                throw dupeError;
              }
              throw new Error(errBody.error);
            }
          } catch (jsonErr) {
            if (jsonErr.isDuplicateAccount) throw jsonErr;
            if (jsonErr.message && !jsonErr.message.includes("FunctionsHttpError")) {
              throw jsonErr;
            }
          }
        }
        console.warn("[signUp] Edge Function notice:", fnError);
      }
    } catch (fnEx) {
      if (fnEx.isDuplicateAccount) throw fnEx;
      if (fnEx.message && !fnEx.message.includes("FunctionsHttpError") && !fnEx.message.includes("Failed to send")) {
        throw fnEx;
      }
      console.warn("[signUp] Edge Function exception, falling back to native auth:", fnEx);
    }

    // 2. Fallback to native Supabase Auth signUp
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { role: userRole, ...metadata },
        emailRedirectTo: redirectUrl,
      },
    });
    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("duplicate")
      ) {
        const dupeError = new Error("An account with this email address already exists. Please sign in with your password or reset it.");
        dupeError.isDuplicateAccount = true;
        dupeError.email = cleanEmail;
        throw dupeError;
      }
      throw error;
    }

    // Crucial: Supabase returns identities: [] when the user already exists to prevent enumeration.
    // In PeoplePulse, explicitly detect this to prevent duplicate accounts and avoid confusing OTP states!
    if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
      const dupeError = new Error("An account with this email address already exists. Please sign in with your password or reset it.");
      dupeError.isDuplicateAccount = true;
      dupeError.email = cleanEmail;
      throw dupeError;
    }

    return data;
  };

  const verifyEmailOtp = async (email, token) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase is not configured yet with valid credentials.");
    }
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: "signup",
    });
    if (error) throw error;
    if (data?.user) {
      const userProfile = await fetchProfile(data.user.id);
      return { user: data.user, profile: userProfile };
    }
    return data;
  };

  const resendVerificationEmail = async (email) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase is not configured yet with valid credentials.");
    }
    const cleanEmail = email.trim().toLowerCase();
    let origin = typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://peoplepulse-app.vercel.app";
    if (origin.includes("peoplepulse-n-8650.vercel.app")) {
      origin = "https://peoplepulse-app.vercel.app";
    }
    const redirectUrl = `${origin.replace(/\/$/, "")}/#email-confirmed`;

    // 1. Dispatch via high-deliverability Brevo Edge Function
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("send-verification-email", {
        body: {
          email: cleanEmail,
          redirectTo: redirectUrl,
        },
      });

      if (!fnError && (fnData?.status === "sent" || fnData?.user)) {
        return fnData;
      }

      if (fnError) {
        if (fnError.context) {
          try {
            const errBody = await fnError.context.json();
            if (errBody?.error) {
              throw new Error(errBody.error);
            }
          } catch (jsonErr) {
            if (jsonErr.message && !jsonErr.message.includes("FunctionsHttpError")) {
              throw jsonErr;
            }
          }
        }
        console.warn("[resendVerificationEmail] Edge Function notice:", fnError);
      }
    } catch (fnEx) {
      if (fnEx.message && !fnEx.message.includes("FunctionsHttpError") && !fnEx.message.includes("Failed to send")) {
        throw fnEx;
      }
      console.warn("[resendVerificationEmail] Edge Function exception, falling back to native auth:", fnEx);
    }

    // 2. Fallback to native Supabase Auth resend
    const { data, error } = await supabase.auth.resend({
      type: "signup",
      email: cleanEmail,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    if (error) throw error;
    return data;
  };

  const resolveIdentifierToEmail = async (rawIdentifier) => {
    const input = (rawIdentifier || "").trim();
    if (!input) return "";
    if (input.includes("@")) return input.toLowerCase();

    try {
      const { data: resolved, error: rpcErr } = await supabase.rpc("resolve_login_identifier", {
        p_identifier: input,
      });
      if (!rpcErr && resolved && resolved.includes("@")) {
        return resolved.toLowerCase();
      }
      if (rpcErr) {
        console.warn("[resolveIdentifierToEmail] RPC notice:", rpcErr.message);
      }
    } catch (e) {
      console.warn("[resolveIdentifierToEmail] Exception:", e.message);
    }
    return input;
  };

  const signIn = async (identifier, password) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase is not configured yet with valid credentials.");
    }

    const authEmail = await resolveIdentifierToEmail(identifier);
    if (!authEmail.includes("@")) {
      throw new Error(`No registered account found matching "${identifier}". Please check your Employee ID or work email.`);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    });
    if (error) {
      error.resolvedEmail = authEmail;
      throw error;
    }
    if (data?.user) {
      const userProfile = await fetchProfile(data.user.id);
      return { user: data.user, profile: userProfile };
    }
    return data;
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
  };

  const resetPassword = async (emailOrEmpId) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase is not configured yet with valid credentials.");
    }
    const cleanEmail = await resolveIdentifierToEmail(emailOrEmpId);
    let origin = typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://peoplepulse-app.vercel.app";
    if (origin.includes("peoplepulse-n-8650.vercel.app")) {
      origin = "https://peoplepulse-app.vercel.app";
    }
    const redirectUrl = `${origin.replace(/\/$/, "")}/#reset-password`;

    // 1. Dispatch via high-deliverability Brevo Edge Function
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("send-reset-password", {
        body: { email: cleanEmail, redirectTo: redirectUrl }
      });
      if (!fnError && fnData?.status === "sent") {
        return fnData;
      }
      if (fnError) {
        console.warn("[resetPassword] Edge Function notice:", fnError);
      }
    } catch (fnEx) {
      console.warn("[resetPassword] Edge Function invocation exception:", fnEx);
    }

    // 2. Fallback to native Supabase Auth reset
    const { data, error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    });
    if (error) throw error;
    return data;
  };

  const requestPasswordReset = async (email) => {
    return resetPassword(email);
  };

  const updateUserPassword = async (newPassword) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase is not configured yet with valid credentials.");
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }

    // Ensure session is active before updating password
    const { data: sessionData } = await supabase.auth.getSession();
    let activeSession = sessionData?.session;

    // Fallback: If session was not initialized yet, try to recover it from URL hash
    if (!activeSession && typeof window !== "undefined") {
      const hash = window.location.hash || "";
      if (hash.includes("access_token=")) {
        const idx = hash.indexOf("access_token=");
        const params = new URLSearchParams(hash.substring(idx));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token") || "";
        if (accessToken) {
          try {
            const { data: setRes, error: setErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!setErr && setRes?.session) {
              activeSession = setRes.session;
            }
          } catch (e) {
            console.warn("[updateUserPassword] setSession fallback notice:", e);
          }
        }
      }
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      if (error.message?.toLowerCase().includes("auth session missing")) {
        throw new Error("Your reset session has expired or is invalid. Please request a new password reset link.");
      }
      throw error;
    }
    try { sessionStorage.removeItem("peoplepulse_password_recovery"); } catch (e) {}
    setIsPasswordRecovery(false);
    return data;
  };

  const verifyAndUpdatePassword = async (email, code, newPassword) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase is not configured yet with valid credentials.");
    }
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.rpc("verify_and_update_password", {
      p_email: cleanEmail,
      p_code: code.trim(),
      p_new_password: newPassword,
    });
    if (error) throw error;
    return data;
  };

  const deleteAccount = async () => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase is not configured yet with valid credentials.");
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const activeToken = sessionData?.session?.access_token;
    if (!activeToken) {
      throw new Error("No active session found. Please sign in again.");
    }

    let edgeSuccess = false;
    let edgeErrorMsg = null;

    // 1. Invoke delete-account Edge Function (handles email dispatch + account purge)
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (!error && data) {
        edgeSuccess = true;
      } else if (error) {
        edgeErrorMsg = error.message;
        try {
          if (error.context && typeof error.context.json === "function") {
            const errJson = await error.context.json();
            if (errJson?.error) edgeErrorMsg = errJson.error;
          }
        } catch (_) {}
      }
    } catch (invokeErr) {
      edgeErrorMsg = invokeErr?.message;
    }

    // 2. Direct security-definer PostgreSQL RPC fallback if Edge Function is unavailable
    if (!edgeSuccess) {
      console.warn("[deleteAccount] Edge function invocation issue, activating security-definer RPC fallback:", edgeErrorMsg);
      const { data: rpcData, error: rpcErr } = await supabase.rpc("delete_my_account");
      if (rpcErr) {
        console.error("[deleteAccount RPC fallback error]:", rpcErr);
        throw new Error(rpcErr.message || edgeErrorMsg || "Failed to delete account. Please try again.");
      }
    }

    // 3. Perform clean local logout & storage purge
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("[deleteAccount signOut]:", e);
    }

    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch (e) {}

    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);

    return { success: true };
  };

  const updateProfileName = async (newName) => {
    if (!user) throw new Error("No authenticated user.");
    const cleanName = (newName || "").trim();
    if (!cleanName) throw new Error("Full name cannot be empty.");

    // Update profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ name: cleanName })
      .eq("id", user.id);

    if (profileError) {
      console.error("[updateProfileName error]:", profileError);
      throw profileError;
    }

    // Update supabase auth metadata
    try {
      await supabase.auth.updateUser({
        data: { name: cleanName, full_name: cleanName },
      });
    } catch (e) {
      console.warn("[updateProfileName] auth metadata update warning:", e.message);
    }

    // Refresh profile in context
    const updated = await fetchProfile(user.id);
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        role,
        loading,
        isConfigured: isSupabaseConfigured,
        isPasswordRecovery,
        setIsPasswordRecovery,
        signUp,
        checkAccountExists,
        verifyEmailOtp,
        resendVerificationEmail,
        signIn,
        signOut,
        deleteAccount,
        updateProfileName,
        resetPassword,
        requestPasswordReset,
        updateUserPassword,
        verifyAndUpdatePassword,
        refreshProfile: () => user && fetchProfile(user.id),
      }}
    >
      {children}
    </AuthContext.Provider>
  );

}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
