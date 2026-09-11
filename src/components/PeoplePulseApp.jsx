import React, { useState, useMemo, useEffect } from "react";
import AgenticCopilot from "./AgenticCopilot";
import Sidebar, { NAV } from "./layout/Sidebar";
import { T } from "./ui";

// Auth & Onboarding Views (re-exported for App.jsx)
export { default as LoginView } from "./auth/LoginView";
export { default as OnboardingModal } from "./auth/OnboardingModal";
export { default as AcceptInviteView } from "./auth/AcceptInviteView";
export { default as ResetPasswordView } from "./auth/ResetPasswordView";

// Manager Views
import ManagerDashboard from "./manager/ManagerDashboard";
import ManagerTeam from "./manager/ManagerTeam";
import ManagerInsights from "./manager/ManagerInsights";

// Employee Views
import EmployeeDashboard from "./employee/EmployeeDashboard";
import EmployeeCheckin from "./employee/EmployeeCheckin";
import EmployeeSettings from "./employee/EmployeeSettings";

// Admin Views
import AdminDashboard from "./admin/AdminDashboard";
import AdminInsights from "./admin/AdminInsights";
import AdminEmployees from "./admin/AdminEmployees";
import AdminTeams from "./admin/AdminTeams";
import AdminQuestions from "./admin/AdminQuestions";
import AdminImports from "./admin/AdminImports";
import AdminSettings from "./admin/AdminSettings";

export default function PeoplePulseApp({ role = "manager", onReturnHome, onSignOut }) {
  const normalizedRole = role === "owner" ? "admin" : role;
  const [currentRole, setCurrentRole] = useState(normalizedRole);
  const [view, setView] = useState(`${normalizedRole}-dashboard`);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  useEffect(() => {
    const handleOpenCopilot = () => setCopilotOpen(true);
    window.addEventListener("peoplepulse_open_copilot", handleOpenCopilot);
    return () => window.removeEventListener("peoplepulse_open_copilot", handleOpenCopilot);
  }, []);

  useEffect(() => {
    const norm = role === "owner" ? "admin" : role;
    setCurrentRole(norm);
    setView(`${norm}-dashboard`);
  }, [role]);

  const views = useMemo(() => ({
    "manager-dashboard": <ManagerDashboard setMobileOpen={setMobileOpen} setView={setView} />,
    "manager-team": <ManagerTeam setMobileOpen={setMobileOpen} />,
    "manager-insights": <AdminInsights setMobileOpen={setMobileOpen} />,
    "manager-employees": <AdminEmployees setMobileOpen={setMobileOpen} />,
    "manager-teams": <AdminTeams setMobileOpen={setMobileOpen} />,
    "manager-questions": <AdminQuestions setMobileOpen={setMobileOpen} />,
    "manager-imports": <AdminImports setMobileOpen={setMobileOpen} />,
    "manager-settings": <EmployeeSettings setMobileOpen={setMobileOpen} onSignOut={onSignOut} onReturnHome={onReturnHome} />,
    "employee-dashboard": <EmployeeDashboard setMobileOpen={setMobileOpen} setView={setView} />,
    "employee-checkin": <EmployeeCheckin setMobileOpen={setMobileOpen} onSubmitted={() => setView("employee-dashboard")} />,
    "employee-settings": <EmployeeSettings setMobileOpen={setMobileOpen} onSignOut={onSignOut} onReturnHome={onReturnHome} />,
    "admin-dashboard": <AdminDashboard setMobileOpen={setMobileOpen} />,
    "admin-insights": <AdminInsights setMobileOpen={setMobileOpen} />,
    "admin-employees": <AdminEmployees setMobileOpen={setMobileOpen} />,
    "admin-teams": <AdminTeams setMobileOpen={setMobileOpen} />,
    "admin-questions": <AdminQuestions setMobileOpen={setMobileOpen} />,
    "admin-imports": <AdminImports setMobileOpen={setMobileOpen} />,
    "admin-settings": <AdminSettings setMobileOpen={setMobileOpen} onSignOut={onSignOut} onReturnHome={onReturnHome} />,
  }), [view]);

  return (
    <div className="flex min-h-screen" style={{ background: T.bg, fontFamily: "Inter, system-ui, sans-serif" }}>
      <Sidebar
        role={currentRole}
        setRole={(r) => {
          setCurrentRole(r);
          setView(NAV[r][0].key);
        }}
        view={view}
        setView={setView}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onReturnHome={onReturnHome}
        onSignOut={onSignOut}
      />
      <main className="flex-1 min-w-0 p-5 sm:p-8">
        <div key={view} className="animate-fade-in-up">
          {views[view] || views[`${currentRole}-dashboard`]}
        </div>
      </main>

      {/* PulseAgent Autonomous Copilot */}
      <AgenticCopilot
        isOpen={copilotOpen}
        onToggle={() => setCopilotOpen((prev) => !prev)}
        onNavigate={(newView) => {
          if (newView) {
            setView(newView);
          }
        }}
      />
    </div>
  );
}
