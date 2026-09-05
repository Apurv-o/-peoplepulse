import React, { useState, useEffect, useRef } from "react";
import PeoplePulseHomepage from "./components/PeoplePulseHomepage";
import PeoplePulseApp, { LoginView, OnboardingModal, AcceptInviteView } from "./components/PeoplePulseApp";
import { AuthProvider, useAuth } from "./lib/auth";
import { OrganizationProvider, useOrganization } from "./lib/organization";

function AppContent() {
  const { user, profile, role: serverRole, signOut, loading: authLoading } = useAuth();
  const { organizations, activeOrganization, activeRole, loading: orgLoading, refreshOrganization } = useOrganization();

  // Navigation states: 'homepage' | 'login' | 'signup' | 'onboarding' | 'invite' | 'app'
  const [currentScreen, setCurrentScreen] = useState(() => {
    if (typeof window === "undefined") return "homepage";
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

  // Helper to sync location.hash with target screen
  const syncHashToScreen = (screen, extraParams = "") => {
    if (typeof window === "undefined") return;
    const currentHash = window.location.hash.toLowerCase();
    if (screen === "app" && currentHash !== "#app") {
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
  }, [user, authLoading, orgLoading, organizations.length, currentScreen]);

  // Handle URL hash changes (back/forward navigation or direct links)
  useEffect(() => {
    const handleHash = () => {
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
        setCurrentScreen("onboarding");
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
