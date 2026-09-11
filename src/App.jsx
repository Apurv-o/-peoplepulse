import React, { useState, useEffect, useRef } from "react";
import { WifiOff, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import PeoplePulseHomepage from "./components/PeoplePulseHomepage";
import PeoplePulseApp from "./components/PeoplePulseApp";
import LoginView from "./components/auth/LoginView";
import OnboardingModal from "./components/auth/OnboardingModal";
import AcceptInviteView from "./components/auth/AcceptInviteView";
import ResetPasswordView from "./components/auth/ResetPasswordView";
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

  // Real-world Edge Case 1: Internet disconnect / reconnect detection
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [showReconnectedBanner, setShowReconnectedBanner] = useState(false);

  // Real-world Edge Case 2: Multi-tab sync & session expiry banner
  const [multiTabNotice, setMultiTabNotice] = useState(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnectedBanner(true);
      const t = setTimeout(() => setShowReconnectedBanner(false), 4000);
      return () => clearTimeout(t);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnectedBanner(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Multi-tab logout / login sync across browser tabs
    const handleStorage = (e) => {
      if (e.key && e.key.includes("supabase.auth.token")) {
        if (!e.newValue && e.oldValue) {
          // User logged out in another tab
          setMultiTabNotice("You were signed out in another tab or your session expired.");
        } else if (e.newValue && !e.oldValue) {
          // User logged in in another tab
          setMultiTabNotice("You signed in from another tab. Updating your session...");
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

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
    } else if (screen === "employee-login" && currentHash !== "#employee-login") {
      window.location.hash = "#employee-login";
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
  // If user is unauthenticated: strictly guard protected app and onboarding routes
  useEffect(() => {
    // If the user is currently in password recovery from an email link, DO NOT redirect away!
    if (currentScreen === "reset-password" || isRecoveryUrl() || isPasswordRecovery) {
      return;
    }

    // Unauthenticated route guard: if user is not logged in and not in demo mode, protect app & onboarding
    if (!authLoading && !user && !isDemoMode) {
      if (currentScreen === "app" || currentScreen === "onboarding") {
        setCurrentScreen("login");
        syncHashToScreen("login");
      }
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

      const effectiveRole = activeRole || profile?.role || serverRole || "employee";
      const isEmployee = effectiveRole === "employee" && organizations.length > 0;

      // If user has 0 organizations and is not in demo mode, ALWAYS send them to onboarding to create their company workspace
      if (organizations.length === 0 && !isDemoModeRef.current) {
        if (currentScreen !== "onboarding") {
          setCurrentScreen("onboarding");
          syncHashToScreen("onboarding");
        }
        return;
      }

      // If user is an employee within an existing organization, NEVER send them to onboarding
      if (isEmployee) {
        if (currentScreen !== "app") {
          setCurrentScreen("app");
          syncHashToScreen("app");
        }
        return;
      }

      // If user has organizations, ensure they are NOT stuck in onboarding
      if (organizations.length > 0 && currentScreen === "onboarding") {
        setCurrentScreen("app");
        syncHashToScreen("app");
        return;
      }

      // If on login or signup screen and authenticated, forward to app or onboarding
      if (currentScreen === "login" || currentScreen === "signup" || currentScreen === "employee-login" || hash === "#login" || hash === "#signup" || hash === "#employee-login") {
        const target = (organizations.length === 0 && !isDemoModeRef.current) ? "onboarding" : "app";
        setCurrentScreen(target);
        syncHashToScreen(target);
        return;
      }
    }
  }, [user, authLoading, orgLoading, organizations.length, currentScreen, isPasswordRecovery, isDemoMode, profile?.role, serverRole, activeRole]);

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
        if (!userRef.current && !isDemoModeRef.current) {
          setCurrentScreen("login");
          syncHashToScreen("login");
        } else if (organizationsRef.current && organizationsRef.current.length > 0) {
          setCurrentScreen("app");
          syncHashToScreen("app");
        } else {
          setCurrentScreen("onboarding");
        }
      } else if (hash === "#signup") {
        if (userRef.current && !isDemoModeRef.current) {
          const target = (organizationsRef.current && organizationsRef.current.length > 0) ? "app" : "onboarding";
          setCurrentScreen(target);
          syncHashToScreen(target);
        } else {
          setCurrentScreen("signup");
        }
      } else if (hash === "#employee-login") {
        if (userRef.current && !isDemoModeRef.current) {
          const target = (organizationsRef.current && organizationsRef.current.length > 0) ? "app" : "onboarding";
          setCurrentScreen(target);
          syncHashToScreen(target);
        } else {
          setCurrentScreen("employee-login");
        }
      } else if (hash === "#login") {
        if (userRef.current && !isDemoModeRef.current) {
          const target = (organizationsRef.current && organizationsRef.current.length > 0) ? "app" : "onboarding";
          setCurrentScreen(target);
          syncHashToScreen(target);
        } else {
          setCurrentScreen("login");
        }
      } else if (hash.startsWith("#email-confirmed")) {
        if (userRef.current && !isDemoModeRef.current) {
          const target = (organizationsRef.current && organizationsRef.current.length > 0) ? "app" : "onboarding";
          setCurrentScreen(target);
          syncHashToScreen(target);
        } else {
          setCurrentScreen("login");
          syncHashToScreen("login");
        }
      } else if (hash === "#app" || hash === "#employee-checkin") {
        if (!userRef.current && !isDemoModeRef.current) {
          setCurrentScreen("login");
          syncHashToScreen("login");
        } else if (organizationsRef.current && organizationsRef.current.length === 0) {
          setCurrentScreen("onboarding");
          syncHashToScreen("onboarding");
        } else {
          setCurrentScreen("app");
        }
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
    if ((targetScreen === "login" || targetScreen === "signup" || targetScreen === "employee-login") && userRef.current && !options.isDemo) {
      targetScreen = organizations.length === 0 ? "onboarding" : "app";
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

  // Shared notification banner component for network loss & multi-tab session changes
  const renderSystemEdgeCaseBanners = () => (
    <>
      {!isOnline && (
        <div className="bg-red-600 text-white text-xs py-2 px-4 text-center font-semibold flex items-center justify-center gap-2 shadow-md z-[9999] relative animate-in slide-in-from-top">
          <WifiOff size={15} className="animate-pulse shrink-0" />
          <span>You are currently offline. Check-in submissions and updates are queued until your connection is restored.</span>
        </div>
      )}
      {isOnline && showReconnectedBanner && (
        <div className="bg-emerald-600 text-white text-xs py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2 shadow-sm z-[9999] relative animate-in fade-in">
          <CheckCircle2 size={14} className="shrink-0" />
          <span>Internet connection restored. Synchronization active.</span>
        </div>
      )}
      {multiTabNotice && (
        <div className="bg-slate-900 text-amber-300 text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-3 shadow-lg z-[9999] relative animate-in fade-in">
          <AlertTriangle size={15} className="text-amber-400 shrink-0" />
          <span>{multiTabNotice}</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-bold text-[11px] hover:bg-amber-300 transition-colors cursor-pointer flex items-center gap-1"
          >
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
      )}
    </>
  );

  // 0. Password Recovery View (from Email Reset Link)
  if (currentScreen === "reset-password" || isRecoveryUrl() || isPasswordRecovery) {
    return (
      <div className="min-h-screen flex flex-col">
        {renderSystemEdgeCaseBanners()}
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
      </div>
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
      <div className="min-h-screen flex flex-col">
        {renderSystemEdgeCaseBanners()}
        <AcceptInviteView
          token={inviteToken}
          onAccepted={() => navigateTo("app")}
          onGoToLogin={() => navigateTo("login")}
        />
      </div>
    );
  }

  // 2. Organization Onboarding View
  if (currentScreen === "onboarding") {
    if (organizations.length > 0) {
      const effectiveRole = isDemoMode ? demoRole : (activeRole || profile?.role || serverRole || "admin");
      return (
        <div className="min-h-screen flex flex-col">
          {renderSystemEdgeCaseBanners()}
          <PeoplePulseApp
            role={effectiveRole}
            isDemoMode={isDemoMode}
            onReturnHome={() => navigateTo("homepage")}
            onSignOut={handleSignOut}
          />
        </div>
      );
    }
    return (
      <div className="min-h-screen flex flex-col">
        {renderSystemEdgeCaseBanners()}
        <OnboardingModal
          onCompleted={() => {
            refreshOrganization();
            navigateTo("app");
          }}
          onCancel={() => navigateTo("homepage")}
        />
      </div>
    );
  }

  // 3. Login / Signup / Employee Login View
  if (currentScreen === "login" || currentScreen === "signup" || currentScreen === "employee-login") {
    return (
      <div className="min-h-screen flex flex-col">
        {renderSystemEdgeCaseBanners()}
        <LoginView
          initialMode={currentScreen === "signup" ? "signup" : currentScreen === "employee-login" ? "employee" : "login"}
          onSignIn={(role, meta) => {
            if (!meta?.isDemo && organizations.length === 0) {
              navigateTo("onboarding", role, meta);
            } else {
              navigateTo("app", role, meta);
            }
          }}
          onReturnHome={() => navigateTo("homepage")}
          onGoToSignup={() => navigateTo("signup")}
          onGoToLogin={() => navigateTo("login")}
        />
      </div>
    );
  }

  // 4. Main Application View
  if (currentScreen === "app") {
    // If not authenticated and not in demo mode, redirect / render login
    if (!user && !isDemoMode && !authLoading) {
      return (
        <div className="min-h-screen flex flex-col">
          {renderSystemEdgeCaseBanners()}
          <LoginView
            initialMode="login"
            onSignIn={(role, meta) => navigateTo("app", role, meta)}
            onReturnHome={() => navigateTo("homepage")}
            onGoToSignup={() => navigateTo("signup")}
            onGoToLogin={() => navigateTo("login")}
          />
        </div>
      );
    }

    const effectiveRole = isDemoMode ? demoRole : (activeRole || serverRole || "employee");

    return (
      <div className="min-h-screen flex flex-col">
        {renderSystemEdgeCaseBanners()}
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
    <div className="min-h-screen flex flex-col">
      {renderSystemEdgeCaseBanners()}
      <PeoplePulseHomepage
        onSignIn={() => navigateTo("login")}
        onEmployeeSignIn={() => navigateTo("employee-login")}
        onGetStarted={() => navigateTo("signup")}
      />
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[PeoplePulse ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#F7F7F5]">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-2xl mx-auto mb-4 shadow-sm">
            ⚠️
          </div>
          <h1 className="text-xl font-bold text-[#1F2A28] mb-2">Something unexpected occurred</h1>
          <p className="text-xs text-[#7B8494] max-w-md mb-2 leading-relaxed">
            The application encountered a temporary issue. Please reload or return to the homepage.
          </p>
          {this.state.error && (
            <div className="p-3 mb-5 max-w-lg w-full rounded-xl bg-red-50/80 border border-red-200 text-left">
              <p className="text-[11px] font-mono text-red-700 font-semibold break-words">
                {String(this.state.error?.message || this.state.error)}
              </p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#4E6ABF] text-white hover:bg-[#3E569C] transition-colors shadow-sm cursor-pointer"
            >
              Reload Page
            </button>
            <button
              onClick={() => {
                window.location.hash = "";
                window.location.reload();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E1E4EA] text-[#1F2A28] hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <OrganizationProvider>
          <AppContent />
        </OrganizationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
