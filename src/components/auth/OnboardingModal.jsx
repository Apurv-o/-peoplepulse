import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "../../lib/auth";
import { useOrganization } from "../../lib/organization";
import { supabase } from "../../lib/supabase";
import { T } from "../ui";
import {
  Home, MessageSquare, TrendingUp, Users, UserPlus, Layers, ListChecks, UploadCloud,
  Settings, Bell, ChevronDown, Lock, ArrowRight, Search, Menu, X, Sparkles,
  ArrowUp, ArrowDown, ShieldCheck, Check, LogOut, ArrowLeft, Copy, Building2, Plus, AlertCircle,
  RotateCw, Trash2, Link2, Send, Eye, EyeOff, Mail, ExternalLink, UserX, AlertTriangle, FileText, Download,
  Activity, Calendar, Clock, Heart, Award, Bot, Save, RefreshCw, CheckCircle2, ChevronRight, HelpCircle
} from "lucide-react";


export default function OnboardingModal({ onCompleted, onCancel }) {
  const { createOrganization } = useOrganization();
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleNameChange = (e) => {
    const val = e.target.value;
    setOrgName(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!orgName.trim()) {
      setError("Please enter your organization name.");
      return;
    }
    if (!slug.trim()) {
      setError("Please specify a URL slug for your workspace.");
      return;
    }

    setLoading(true);
    try {
      await createOrganization(orgName.trim(), slug.trim());
      onCompleted?.();
    } catch (err) {
      console.error("[Onboarding Error]", err);
      setError(err.message || "Failed to create organization. The slug may already be in use.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: T.bg }}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 border" style={{ borderColor: T.border }}>
        <div className="flex items-center gap-3 mb-6">
          <img src="/logo.png" alt="PeoplePulse Logo" className="w-10 h-10 rounded-xl shadow-sm object-cover" />
          <div>
            <h2 className="text-xl font-bold" style={{ color: T.text }}>Create Your Organization</h2>
            <p className="text-xs" style={{ color: T.muted }}>Set up your workspace to begin</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-xs bg-red-50 border border-red-200 text-red-700 leading-relaxed flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: T.text }}>
              Company / Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={handleNameChange}
              placeholder="e.g. Acme Corporation"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 bg-white transition-all"
              style={{ borderColor: T.border }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: T.text }}>
              Workspace Identifier (Slug)
            </label>
            <div className="flex items-center rounded-xl border bg-gray-50 px-3 py-2 text-sm text-gray-500" style={{ borderColor: T.border }}>
              <span className="text-xs mr-1 text-gray-400">peoplepulse.io/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ""))}
                placeholder="acme-corp"
                required
                className="bg-transparent text-sm font-semibold outline-none flex-1 text-[#1F2A28]"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Unique alphanumeric web identifier for your team.</p>
          </div>

          <div className="pt-2 flex gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border hover:bg-gray-50 text-gray-700 transition-colors"
                style={{ borderColor: T.border }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-md disabled:opacity-50"
              style={{ background: T.primary }}
            >
              {loading ? "Creating workspace..." : "Create Workspace →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   ACCEPT INVITATION VIEW (Seamless Employee Onboarding)
   ============================================================ */
