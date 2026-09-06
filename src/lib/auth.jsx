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
    const hash = (window.location.hash || "").toLowerCase();
    const search = (window.location.search || "").toLowerCase();
    return hash.includes("type=recovery") || search.includes("type=recovery") || hash.includes("reset-password");
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

  const signUp = async (email, password, metadata = {}) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase is not configured yet with valid credentials.");
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase is not configured yet with valid credentials.");
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
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

  const resetPassword = async (email) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase is not configured yet with valid credentials.");
    }
    const cleanEmail = email.trim().toLowerCase();
    const redirectUrl = typeof window !== "undefined"
      ? `${window.location.origin}/#reset-password`
      : undefined;

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
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
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
        signIn,
        signOut,
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
