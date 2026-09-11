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

export default function AdminTeams({ setMobileOpen }) {
  const { activeOrganizationId, teamUsage, refreshUsageAndLimits } = useOrganization();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [createError, setCreateError] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);

  const loadTeams = useCallback(async () => {
    if (!supabase || !activeOrganizationId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("teams")
      .select("id, name, created_at, manager_id, profiles:manager_id(name, email)")
      .eq("organization_id", activeOrganizationId)
      .order("created_at", { ascending: true });

    if (!error && data) setTeams(data);
    setLoading(false);
  }, [activeOrganizationId]);

  useEffect(() => {
    loadTeams();

    if (!supabase || !activeOrganizationId) return;

    // Real-time Postgres changes subscription on teams
    const channel = supabase
      .channel(`admin-teams-live-${activeOrganizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teams",
          filter: `organization_id=eq.${activeOrganizationId}`,
        },
        () => {
          loadTeams();
          refreshUsageAndLimits?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrganizationId, loadTeams, refreshUsageAndLimits]);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setCreateError(null);
    if (!newTeamName.trim()) return;

    setCreateLoading(true);
    try {
      const { error } = await supabase.from("teams").insert({
        organization_id: activeOrganizationId,
        name: newTeamName.trim(),
      });
      if (error) throw error;
      setNewTeamName("");
      setShowCreateModal(false);
      await loadTeams();
      refreshUsageAndLimits?.();
    } catch (err) {
      setCreateError(err.message || "Failed to create team.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId, teamName) => {
    if (!window.confirm(`Are you sure you want to delete "${teamName}"? This action cannot be undone.`)) return;
    try {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamId)
        .eq("organization_id", activeOrganizationId);
      if (error) throw error;
      await loadTeams();
      refreshUsageAndLimits?.();
    } catch (err) {
      alert("Failed to delete team: " + (err.message || "Unknown error"));
    }
  };

  return (
    <div>
      <Topbar
        title="Teams"
        subtitle={`${teams.length} team(s) active in organization (${teamUsage.max === null ? "Unlimited" : `Max ${teamUsage.max} on current plan`}).`}
        setMobileOpen={setMobileOpen}
        right={
          <button
            onClick={() => {
              setNewTeamName("");
              setCreateError(null);
              setShowCreateModal(true);
            }}
            className="text-sm font-semibold text-white px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition-all hover:opacity-90"
            style={{ background: T.primary }}
          >
            <Plus size={15} /> Create Team
          </button>
        }
      />

      {/* Create Team Modal */}
      {showCreateModal && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative modal-dialog border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: T.text }}>Create New Team</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              {createError && (
                <div className="p-3 rounded-xl text-xs bg-red-50 text-red-700 border border-red-200 flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: T.text }}>Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Product Engineering"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 bg-white"
                  style={{ borderColor: T.border }}
                />
              </div>

              <div>
                <p className="text-[11px] font-semibold text-gray-500 mb-1.5">Quick Presets:</p>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">🏢 Corporate Teams</p>
                    <div className="flex flex-wrap gap-1">
                      {["Engineering", "Product & Development", "Human Resources", "Finance & Accounting", "Sales", "Marketing", "Operations", "Customer Success", "Business Development", "IT & Infrastructure", "Legal & Compliance", "Administration"].map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setNewTeamName(name + " Team")}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 transition-colors"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">💻 Tech / SaaS Teams</p>
                    <div className="flex flex-wrap gap-1">
                      {["Software Engineering", "Frontend Development", "Backend Development", "DevOps & Cloud", "Data & Analytics", "AI & Machine Learning", "Product Management", "UI/UX Design", "Quality Assurance", "Technical Support"].map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setNewTeamName(name + " Team")}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 transition-colors"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border text-gray-700 hover:bg-gray-50"
                  style={{ borderColor: T.border }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: T.primary }}
                >
                  {createLoading ? "Creating..." : "Create Team"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((t) => (
          <Card key={t.id}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-base font-semibold" style={{ color: T.text }}>{t.name}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  Team
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteTeam(t.id, t.name)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Delete team"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Manager: {t.profiles?.name || "Unassigned"}
            </p>
            <p className="text-[11px] text-gray-400 mt-2">
              Created {new Date(t.created_at).toLocaleDateString()}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

