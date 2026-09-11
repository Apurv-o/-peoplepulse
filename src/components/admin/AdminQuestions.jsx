import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "../../lib/auth";
import { useOrganization } from "../../lib/organization";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { calculateEngagementScore } from "../../lib/engagementScoring";
import { getCurrentWeekMonday, formatWeekLabel, getTodayDate, getCurrentWeekSaturday, getSaturdayCycleRange } from "../../lib/dateUtils";

import { T, Card, ToggleSwitch, RiskBadge, Avatar, Delta, Sparkline, AIInsightCard, KPICard, Dropdown, RatingSelector, ToggleRow } from "../ui";
import { CHECKIN_DIMENSIONS } from "../../lib/constants";

import {
  Home, MessageSquare, TrendingUp, Users, UserPlus, Layers, ListChecks, UploadCloud,
  Settings, Bell, ChevronDown, Lock, ArrowRight, Search, Menu, X, Sparkles,
  ArrowUp, ArrowDown, ShieldCheck, Check, LogOut, ArrowLeft, Copy, Building2, Plus, AlertCircle,
  RotateCw, Trash2, Link2, Send, Eye, EyeOff, Mail, ExternalLink, UserX, AlertTriangle, FileText, Download,
  Activity, Calendar, Clock, Heart, Award, Bot, Save, RefreshCw, CheckCircle2, ChevronRight, HelpCircle
} from "lucide-react";

import Topbar from "../layout/Topbar";

export default function AdminQuestions({ setMobileOpen }) {
  const { activeOrganizationId } = useOrganization();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formLabel, setFormLabel] = useState("");
  const [formType, setFormType] = useState("rating");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadQuestions = useCallback(async () => {
    if (!supabase || !activeOrganizationId) return;
    setLoading(true);
    try {
      const { data, error: qErr } = await supabase
        .from("survey_questions")
        .select("*")
        .or(`organization_id.eq.${activeOrganizationId},organization_id.is.null`)
        .order("created_at", { ascending: true });

      if (qErr) throw qErr;

      // Seamlessly merge org-specific questions with base defaults so core dimensions are never hidden
      const orgQuestions = (data || []).filter((q) => q.organization_id === activeOrganizationId);
      const dbDefaults = (data || []).filter((q) => !q.organization_id);

      const baseDefaults = dbDefaults.length > 0
        ? dbDefaults
        : CHECKIN_DIMENSIONS.map((d, i) => ({
            id: `default-${i}`,
            label: d.label,
            type: "rating",
            is_active: true,
            organization_id: null,
          }));

      const orgQuestionLabels = new Set(orgQuestions.map((q) => q.label.toLowerCase().trim()));
      const mergedQuestions = [
        ...orgQuestions,
        ...baseDefaults.filter((d) => !orgQuestionLabels.has(d.label.toLowerCase().trim())),
      ];
      setQuestions(mergedQuestions);
    } catch (err) {
      console.error("[AdminQuestions] Error loading questions:", err);
      setError("Failed to load questions.");
    } finally {
      setLoading(false);
    }
  }, [activeOrganizationId]);

  useEffect(() => {
    loadQuestions();

    if (!supabase || !activeOrganizationId) return;

    const channel = supabase
      .channel(`admin-questions-live-${activeOrganizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "survey_questions",
          filter: `organization_id=eq.${activeOrganizationId}`,
        },
        () => {
          loadQuestions();
        }
      )
      .subscribe();

    const handleAgentQuestion = () => loadQuestions();
    window.addEventListener("peoplepulse_agent_activity_update", handleAgentQuestion);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("peoplepulse_agent_activity_update", handleAgentQuestion);
    };
  }, [activeOrganizationId, loadQuestions]);

  const handleOpenAdd = () => {
    setModalMode("add");
    setEditingQuestion(null);
    setFormLabel("");
    setFormType("rating");
    setFormActive(true);
    setError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (q) => {
    setModalMode("edit");
    setEditingQuestion(q);
    setFormLabel(q.label);
    setFormType(q.type || "rating");
    setFormActive(q.is_active !== false);
    setError(null);
    setShowModal(true);
  };

  const handleToggleActive = async (q) => {
    try {
      const newActive = !q.is_active;
      if (q.organization_id) {
        await supabase
          .from("survey_questions")
          .update({ is_active: newActive })
          .eq("id", q.id);
      } else {
        await supabase.from("survey_questions").insert({
          organization_id: activeOrganizationId,
          label: q.label,
          type: q.type || "rating",
          is_active: newActive,
        });
      }
      await loadQuestions();
    } catch (err) {
      console.error("[AdminQuestions] Toggle error:", err);
    }
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!formLabel.trim()) return;
    setSaving(true);
    setError(null);

    try {
      if (modalMode === "add") {
        const { error: insErr } = await supabase.from("survey_questions").insert({
          organization_id: activeOrganizationId,
          label: formLabel.trim(),
          type: formType,
          is_active: formActive,
        });
        if (insErr) throw insErr;
      } else if (modalMode === "edit" && editingQuestion) {
        if (editingQuestion.organization_id) {
          const { error: upErr } = await supabase
            .from("survey_questions")
            .update({
              label: formLabel.trim(),
              type: formType,
              is_active: formActive,
            })
            .eq("id", editingQuestion.id);
          if (upErr) throw upErr;
        } else {
          const { error: insErr } = await supabase.from("survey_questions").insert({
            organization_id: activeOrganizationId,
            label: formLabel.trim(),
            type: formType,
            is_active: formActive,
          });
          if (insErr) throw insErr;
        }
      }

      setShowModal(false);
      await loadQuestions();
    } catch (err) {
      console.error("[AdminQuestions] Save error:", err);
      setError(err.message || "Failed to save question.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (qId) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    setSaving(true);
    try {
      const { error: delErr } = await supabase
        .from("survey_questions")
        .delete()
        .eq("id", qId)
        .eq("organization_id", activeOrganizationId);

      if (delErr) throw delErr;
      setShowModal(false);
      await loadQuestions();
    } catch (err) {
      console.error("[AdminQuestions] Delete error:", err);
      setError(err.message || "Failed to delete question.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Topbar
        title="Check-in questions"
        subtitle="Manage what your team is asked each week."
        setMobileOpen={setMobileOpen}
        right={
          <button
            onClick={handleOpenAdd}
            className="text-sm font-semibold text-white px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition-all hover:opacity-90"
            style={{ background: T.primary }}
          >
            <Plus size={15} /> Add question
          </button>
        }
      />

      {/* Add / Edit Question Modal */}
      {showModal && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative modal-dialog border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: T.text }}>
                {modalMode === "add" ? "Add Check-in Question" : "Edit Question"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl text-xs bg-red-50 text-red-700 border border-red-200 flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: T.text }}>Question Prompt</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. I feel supported by my direct manager"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 bg-white"
                  style={{ borderColor: T.border }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: T.text }}>Question Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none bg-white"
                    style={{ borderColor: T.border }}
                  >
                    <option value="rating">1–5 Rating Scale</option>
                    <option value="text">Open Reflection</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: T.text }}>Status</label>
                  <select
                    value={formActive ? "active" : "inactive"}
                    onChange={(e) => setFormActive(e.target.value === "active")}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none bg-white"
                    style={{ borderColor: T.border }}
                  >
                    <option value="active">Active (Visible)</option>
                    <option value="inactive">Inactive (Hidden)</option>
                  </select>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-gray-500 mb-1.5">Quick Inspiration Presets:</p>
                <div className="flex flex-wrap gap-1">
                  {[
                    "Work-life balance is healthy and sustainable",
                    "I feel safe sharing honest feedback with my team",
                    "My daily responsibilities align with organizational priorities",
                    "I received helpful recognition for my contributions this week",
                    "I have the resources and tools needed to do my job effectively"
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormLabel(preset)}
                      className="text-[10px] px-2 py-1 rounded-md bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 transition-colors text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                {modalMode === "edit" && editingQuestion?.organization_id && (
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(editingQuestion.id)}
                    className="px-3 py-2.5 rounded-xl text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border text-gray-700 hover:bg-gray-50"
                  style={{ borderColor: T.border }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: T.primary }}
                >
                  {saving ? "Saving..." : modalMode === "add" ? "Create Question" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <Card padded={false}>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading questions...</div>
        ) : (
          questions.map((d, i) => (
            <div key={d.id || i} className="flex items-center justify-between px-5 py-4 border-b last:border-0 hover:bg-gray-50/50 transition-colors" style={{ borderColor: T.border }}>
              <div className="flex items-center gap-3 min-w-0 pr-4">
                <span className="text-xs font-medium w-5 shrink-0" style={{ color: T.muted }}>{i + 1}</span>
                <div className="min-w-0">
                  <span className="text-sm font-medium block truncate" style={{ color: T.text }}>{d.label}</span>
                  <span className="text-[11px] text-gray-400 capitalize">{d.type || "rating scale"}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => handleToggleActive(d)}
                  className="text-xs font-medium px-2.5 py-1 rounded-full transition-all cursor-pointer hover:opacity-80"
                  style={{
                    background: d.is_active !== false ? T.positiveBg : "#F1F2F4",
                    color: d.is_active !== false ? "#3F7A5C" : "#7B8494",
                  }}
                  title="Click to toggle Active/Inactive"
                >
                  {d.is_active !== false ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() => handleOpenEdit(d)}
                  className="text-xs font-medium hover:underline cursor-pointer"
                  style={{ color: T.primary }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

