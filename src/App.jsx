import React, { useState, useEffect, useRef } from "react";
import PeoplePulseHomepage from "./components/PeoplePulseHomepage";
import PeoplePulseApp, { LoginView, OnboardingModal, AcceptInviteView, ResetPasswordView } from "./components/PeoplePulseApp";
import { AuthProvider, useAuth } from "./lib/auth";
import { OrganizationProvider, useOrganization } from "./lib/organization";

// Helper to determine if current URL is a Supabase password recovery link
function isRecoveryUrl() {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem("peoplepulse_password_recovery") === "true") return true;

  const hash = (window.location.hash || "").toLowerCase();
  const search = (window.location.search || "").toLowerCase();
  const isRec = (
    hash.includes("type=recovery") ||
    hash.startsWith("#reset-password") ||
    hash.includes("reset-password") ||
    hash.includes("reset_password") ||
    search.includes("type=recovery") ||
    search.includes("reset_password") ||
    search.includes("reset-password")
  );

  if (isRec) {
    try {
      sessionStorage.setItem("peoplepulse_password_recovery", "true");
    } catch (e) {}
  }
  return isRec;
}

function AppContent() {
  const { user, profile, role: serverRole, signOut, loading: authLoading, isPasswordRecovery } = useAuth();
  const { organizations, activeOrganization, activeRole, loading: orgLoading, refreshOrganization } = useOrganization();

  // Navigation states: 'homepage' | 'login' | 'signup' | 'onboarding' | 'invite' | 'reset-password' | 'app'
  const [currentScreen, setCurrentScreen] = useState(() => {
    if (typeof window === "undefined") return "homepage";
    if (isRecoveryUrl()) return "reset-password";
    const hash = window.location.hash.toLowerCase();
    if (hash.startsWith("#invite")) return "invite";
    if (hash === "#onboarding") return "onboarding";
    if (hash === "#signup") return "signup";
    if (hash === "#login") return "login";
    if (hash === "#app" || hash === "#employee-checkin") return "app";
    return "homepage";
  });

  const [inviteToken, setInviteToken] = useState(() => {
    if (typeof window === "undefined") return "";
    const hash = window.location.hash;
    if (hash.includes("token=")) {
      return hash.split("token=")[1].split("&")[0];
    }
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get("token") || "";
  });

  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoRole, setDemoRole] = useState("manager");

  // Keep refs to avoid stale closures in event listeners
  const userRef = useRef(user);
  userRef.current = user;
  const isDemoModeRef = useRef(isDemoMode);
  isDemoModeRef.current = isDemoMode;
  const currentScreenRef = useRef(currentScreen);
  currentScreenRef.current = currentScreen;
  const organizationsRef = useRef(organizations);
  organizationsRef.current = organizations;

  // React to auth password recovery trigger
  useEffect(() => {
    if (isPasswordRecovery || isRecoveryUrl()) {
      setCurrentScreen("reset-password");
      syncHashToScreen("reset-password");
    }
  }, [isPasswordRecovery]);

  // Helper to sync location.hash with target screen
  const syncHashToScreen = (screen, extraParams = "") => {
    if (typeof window === "undefined") return;
    const currentHash = window.location.hash.toLowerCase();
    if (screen === "reset-password" && !currentHash.includes("reset-password") && !currentHash.includes("type=recovery")) {
      window.location.hash = "#reset-password";
    } else if (screen === "app" && currentHash !== "#app") {
      window.location.hash = "#app";
    } else if (screen === "login" && currentHash !== "#login") {
      window.location.hash = "#login";
    } else if (screen === "signup" && currentHash !== "#signup") {
      window.location.hash = "#signup";
    } else if (screen === "onboarding" && currentHash !== "#onboarding") {
      window.location.hash = "#onboarding";
    } else if (screen === "invite" && !currentHash.startsWith("#invite")) {
      window.location.hash = `#invite${extraParams ? `?token=${extraParams}` : ""}`;
    } else if (screen === "homepage" && currentHash !== "" && currentHash !== "#") {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  };

  // If user is authenticated: redirect from login/signup/homepage to app or onboarding
  useEffect(() => {
    // If the user is currently in password recovery from an email link, DO NOT redirect away!
    if (currentScreen === "reset-password" || isRecoveryUrl() || isPasswordRecovery) {
      return;
    }

    if (user && !authLoading && !orgLoading) {
      const hash = window.location.hash.toLowerCase();
      if (hash.startsWith("#invite")) {
        setCurrentScreen("invite");
        return;
      }

      // Check if there is a pending invite token waiting to be claimed after login
      const savedToken = sessionStorage.getItem("peoplepulse_pending_invite_token");
      if (savedToken) {
        sessionStorage.removeItem("peoplepulse_pending_invite_token");
        setInviteToken(savedToken);
        setCurrentScreen("invite");
        window.location.hash = `#invite?token=${savedToken}`;
        return;
      }

      // If user has organizations, ensure they are NOT stuck in onboarding
      if (organizations.length > 0 && currentScreen === "onboarding") {
        setCurrentScreen("app");
        syncHashToScreen("app");
        return;
      }

      // If user has 0 organizations, prompt onboarding
      if (organizations.length === 0 && !isDemoModeRef.current) {
        setCurrentScreen("onboarding");
        syncHashToScreen("onboarding");
        return;
      }

      // If on login or signup screen and authenticated, forward to app
      if (currentScreen === "login" || currentScreen === "signup" || hash === "#login" || hash === "#signup") {
        setCurrentScreen("app");
        syncHashToScreen("app");
      }
    }
  }, [user, authLoading, orgLoading, organizations.length, currentScreen, isPasswordRecovery]);

  // Handle URL hash changes (back/forward navigation or direct links)
  useEffect(() => {
    const handleHash = () => {
      if (isRecoveryUrl()) {
        setCurrentScreen("reset-password");
        return;
      }
      const hash = window.location.hash.toLowerCase();
      if (hash.startsWith("#invite")) {
        const rawHash = window.location.hash;
        if (rawHash.includes("token=")) {
          const t = rawHash.split("token=")[1].split("&")[0];
          setInviteToken(t);
          sessionStorage.setItem("peoplepulse_pending_invite_token", t);
        }
        setCurrentScreen("invite");
      } else if (hash === "#onboarding") {
        if (organizationsRef.current && organizationsRef.current.length > 0) {
          setCurrentScreen("app");
          syncHashToScreen("app");
        } else {
          setCurrentScreen("onboarding");
        }
      } else if (hash === "#signup") {
        if (userRef.current && !isDemoModeRef.current) {
          setCurrentScreen("app");
          syncHashToScreen("app");
        } else {
          setCurrentScreen("signup");
        }
      } else if (hash === "#login") {
        if (userRef.current && !isDemoModeRef.current) {
          setCurrentScreen("app");
          syncHashToScreen("app");
        } else {
          setCurrentScreen("login");
        }
      } else if (hash === "#app" || hash === "#employee-checkin") {
        setCurrentScreen("app");
      } else {
        setCurrentScreen("homepage");
      }
    };

    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const navigateTo = (screen, role = null, options = {}) => {
    if (options.isDemo !== undefined) setIsDemoMode(options.isDemo);
    if (role) setDemoRole(role);

    let targetScreen = screen;
    if ((targetScreen === "login" || targetScreen === "signup") && userRef.current && !options.isDemo) {
      targetScreen = "app";
    }

    setCurrentScreen(targetScreen);
    syncHashToScreen(targetScreen, options.token || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSignOut = async () => {
    setIsDemoMode(false);
    userRef.current = null;
    if (user) {
      await signOut();
    }
    setCurrentScreen("login");
    syncHashToScreen("login");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 0. Password Recovery View (from Email Reset Link)
  if (currentScreen === "reset-password" || isRecoveryUrl() || isPasswordRecovery) {
    return (
      <ResetPasswordView
        onPasswordResetSuccess={() => {
          try { sessionStorage.removeItem("peoplepulse_password_recovery"); } catch (e) {}
          if (organizations && organizations.length > 0) {
            navigateTo("app");
          } else {
            navigateTo("login");
          }
        }}
        onCancel={() => {
          try { sessionStorage.removeItem("peoplepulse_password_recovery"); } catch (e) {}
          navigateTo("login");
        }}
      />
    );
  }

  // Loading screen when authenticating or loading organization on initial cold start
  const hasLoadedWorkspace = organizations.length > 0 || isDemoMode;
  if (user && (authLoading || orgLoading) && !hasLoadedWorkspace) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F7F5]">
        <div className="w-10 h-10 border-4 border-blue-100 border-t-[#4E6ABF] rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-[#1F2A28] tracking-wide">Loading workspace...</p>
      </div>
    );
  }

  // 1. Accept Invitation View
  if (currentScreen === "invite") {
    return (
      <AcceptInviteView
        token={inviteToken}
        onAccepted={() => navigateTo("app")}
        onGoToLogin={() => navigateTo("login")}
      />
    );
  }

  // 2. Organization Onboarding View
  if (currentScreen === "onboarding") {
    if (organizations.length > 0) {
      const effectiveRole = isDemoMode ? demoRole : (activeRole || serverRole || "employee");
      return (
        <PeoplePulseApp
          role={effectiveRole}
          isDemoMode={isDemoMode}
          onReturnHome={() => navigateTo("homepage")}
          onSignOut={handleSignOut}
        />
      );
    }
    return (
      <OnboardingModal
        onCompleted={() => {
          refreshOrganization();
          navigateTo("app");
        }}
        onCancel={() => navigateTo("homepage")}
      />
    );
  }

  // 3. Login / Signup View
  if (currentScreen === "login" || currentScreen === "signup") {
    return (
      <LoginView
        initialMode={currentScreen === "signup" ? "signup" : "login"}
        onSignIn={(role, meta) => navigateTo("app", role, meta)}
        onReturnHome={() => navigateTo("homepage")}
        onGoToSignup={() => navigateTo("signup")}
        onGoToLogin={() => navigateTo("login")}
      />
    );
  }

  // 4. Main Application View
  if (currentScreen === "app") {
    const effectiveRole = isDemoMode ? demoRole : (activeRole || serverRole || "employee");

    return (
      <div>
        {isDemoMode && (
          <div className="bg-amber-500 text-white text-xs py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2 shadow-sm z-50 relative">
            <span>⚡ Demo Simulation Mode Active — Previewing <strong>{effectiveRole}</strong> view</span>
            <button
              onClick={() => navigateTo("login")}
              className="underline hover:text-white/80 text-[11px] ml-2"
            >
              Switch to Real Auth
            </button>
          </div>
        )}
        <PeoplePulseApp
          role={effectiveRole}
          isDemoMode={isDemoMode}
          onReturnHome={() => navigateTo("homepage")}
          onSignOut={handleSignOut}
        />
      </div>
    );
  }

  // 5. Default Public Homepage
  return (
    <PeoplePulseHomepage
      onSignIn={() => navigateTo("login")}
      onGetStarted={() => navigateTo("signup")}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <AppContent />
      </OrganizationProvider>
    </AuthProvider>
  );
}
