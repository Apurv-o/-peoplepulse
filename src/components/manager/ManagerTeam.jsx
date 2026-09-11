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

export default function ManagerTeam({ setMobileOpen }) {
  const { user } = useAuth();
  const { activeOrganizationId } = useOrganization();
  const [allTeams, setAllTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMemberForHistory, setSelectedMemberForHistory] = useState(null);

  useEffect(() => {
    if (!supabase || !activeOrganizationId) return;
    let isMounted = true;
    supabase
      .from("teams")
      .select(`
        id,
        name,
        manager_id,
        team_members (
          user_id,
          profiles:user_id (id, name, email, role, employee_id)
        )
      `)
      .eq("organization_id", activeOrganizationId)
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (!isMounted) return;
        if (data && data.length > 0) {
          setAllTeams(data);
          const myTeam = data.find((t) => t.manager_id === user?.id) || data[0];
          setSelectedTeamId(myTeam.id);
          setTeam(myTeam);
          const mems = (myTeam.team_members || []).map((tm) => tm.profiles).filter(Boolean);
          setMembers(mems);
        } else {
          setAllTeams([]);
          setTeam(null);
          setMembers([]);
        }
        setLoading(false);
      });
    return () => { isMounted = false; };
  }, [activeOrganizationId, user?.id]);

  const handleSelectTeam = (targetTeamId) => {
    setSelectedTeamId(targetTeamId);
    const selected = allTeams.find((t) => t.id === targetTeamId);
    if (selected) {
      setTeam(selected);
      const mems = (selected.team_members || []).map((tm) => tm.profiles).filter(Boolean);
      setMembers(mems);
    }
  };

  return (
    <div>
      <Topbar
        title={team?.name || "Your Team"}
        subtitle={`${members.length} team members in this squad`}
        setMobileOpen={setMobileOpen}
        right={
          allTeams.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium hidden sm:inline">Switch Team:</span>
              <select
                value={selectedTeamId || ""}
                onChange={(e) => handleSelectTeam(e.target.value)}
                className="text-xs font-semibold py-1.5 px-3 rounded-xl border border-gray-200 bg-white text-gray-800 outline-none focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer shadow-xs"
              >
                {allTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.manager_id === user?.id ? "(Your Assigned Team)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )
        }
      />
      <Card>
        <p className="text-base font-semibold mb-3" style={{ color: T.text }}>Assigned Team Members</p>
        {loading ? (
          <p className="text-xs text-gray-400">Loading team members...</p>
        ) : members.length === 0 ? (
          <p className="text-xs text-gray-400">No members assigned to this team yet.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: T.border }}>
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedMemberForHistory({ user_id: m.id, profiles: m })}
                  className="flex items-center gap-3 text-left group cursor-pointer focus:outline-none min-w-0"
                  title="Click to view daily form check-ins & stress tracking"
                >
                  <Avatar initials={m.name ? m.name.slice(0, 2).toUpperCase() : "TM"} size={36} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold group-hover:text-blue-600 transition-colors flex items-center gap-1.5" style={{ color: T.text }}>
                      <span className="hover:underline underline-offset-2 truncate">{m.name}</span>
                      <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-blue-500 shrink-0 transition-opacity" />
                    </p>
                    <p className="text-xs text-gray-500 truncate">{m.email}</p>
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedMemberForHistory({ user_id: m.id, profiles: m })}
                    title={`View ${m.name}'s daily pulse & stress tracking`}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border text-[#4E6ABF] bg-blue-50/60 hover:bg-blue-100/80 border-blue-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <Activity size={12} />
                    <span>Daily Pulse</span>
                  </button>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700 capitalize">
                    {m.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Employee Daily Check-in & Stress Tracking Modal */}
      {selectedMemberForHistory && (
        <EmployeeDailyHistoryModal
          member={selectedMemberForHistory}
          orgId={activeOrganizationId}
          onClose={() => setSelectedMemberForHistory(null)}
        />
      )}
    </div>
  );
}

