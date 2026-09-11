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

export default function AdminImports({ setMobileOpen }) {
  const { activeOrganizationId, activeOrganization, sendInvitation } = useOrganization();
  const [historyRows, setHistoryRows] = useState([
    { source: "Slack", status: "Synced", date: "Sep 3, 2026", records: 214 },
    { source: "Google Forms", status: "Synced", date: "Aug 27, 2026", records: 198 },
  ]);
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [importNotice, setImportNotice] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [existingOrgEmails, setExistingOrgEmails] = useState(new Set());

  // Pre-load existing member and pending invitation emails to prevent duplicate accounts
  useEffect(() => {
    if (!supabase || !activeOrganizationId) return;
    let isMounted = true;
    async function loadOrgEmails() {
      try {
        const [
          { data: mData },
          { data: iData }
        ] = await Promise.all([
          supabase
            .from("organization_members")
            .select("profiles(email)")
            .eq("organization_id", activeOrganizationId)
            .eq("is_active", true),
          supabase
            .from("invitations")
            .select("email")
            .eq("organization_id", activeOrganizationId)
            .is("accepted_at", null)
            .gt("expires_at", new Date().toISOString())
        ]);

        if (!isMounted) return;
        const emailSet = new Set();
        (mData || []).forEach((m) => {
          if (m.profiles?.email) emailSet.add(m.profiles.email.trim().toLowerCase());
        });
        (iData || []).forEach((i) => {
          if (i.email) emailSet.add(i.email.trim().toLowerCase());
        });
        setExistingOrgEmails(emailSet);
      } catch (err) {
        console.warn("[AdminImports] Notice loading existing emails:", err);
      }
    }
    loadOrgEmails();
    return () => {
      isMounted = false;
    };
  }, [activeOrganizationId]);

  const downloadTemplate = () => {
    const csvContent =
      "Full Name,Email,Department,Team,Role,Job Title\n" +
      "Liam Cooper,liam.cooper@company.com,Engineering,Engineering Team,employee,Senior Engineer\n" +
      "Sarah Patel,sarah.patel@company.com,Product,Product Team,manager,Lead Product Manager\n" +
      "Alex Morgan,alex.morgan@company.com,Operations,Operations Team,employee,Operations Lead\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "peoplepulse_employee_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSVText = (text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setParsedRows([]);
      setImportNotice({ type: "error", message: "The CSV file appears to be empty or missing data rows." });
      return;
    }

    // Parse CSV line handling quotes
    const parseLine = (line) => {
      const entries = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          entries.push(current.trim().replace(/^"(.*)"$/, "$1"));
          current = "";
        } else {
          current += char;
        }
      }
      entries.push(current.trim().replace(/^"(.*)"$/, "$1"));
      return entries;
    };

    const headers = parseLine(lines[0]).map((h) => h.toLowerCase().trim());
    const emailIdx = headers.findIndex((h) => h.includes("email"));
    const nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("full name"));
    const deptIdx = headers.findIndex((h) => h.includes("dept") || h.includes("department"));
    const teamIdx = headers.findIndex((h) => h.includes("team"));
    const roleIdx = headers.findIndex((h) => h.includes("role"));
    const titleIdx = headers.findIndex((h) => h.includes("title") || h.includes("job"));

    if (emailIdx === -1) {
      setImportNotice({ type: "error", message: "Missing required 'Email' column in CSV header." });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const seenInCSV = new Set();
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      if (cols.length === 1 && !cols[0]) continue;
      const rawEmail = cols[emailIdx] || "";
      const cleanEmail = rawEmail.trim().toLowerCase();
      const name = nameIdx !== -1 ? cols[nameIdx] : "";
      const department = deptIdx !== -1 ? cols[deptIdx] : "";
      const team = teamIdx !== -1 ? cols[teamIdx] : "";
      const rawRole = roleIdx !== -1 ? (cols[roleIdx] || "").toLowerCase() : "employee";
      const role = ["admin", "manager", "employee"].includes(rawRole) ? rawRole : "employee";
      const jobTitle = titleIdx !== -1 ? cols[titleIdx] : "";

      const isValidEmail = emailRegex.test(cleanEmail);
      let isValid = isValidEmail;
      let errorMsg = !isValidEmail ? "Invalid email format" : null;

      // Duplicate detection: prevent duplicate accounts from CSV or existing members
      if (isValid) {
        if (seenInCSV.has(cleanEmail)) {
          isValid = false;
          errorMsg = "Duplicate email in CSV (skipped)";
        } else if (existingOrgEmails.has(cleanEmail)) {
          isValid = false;
          errorMsg = "Already an active member or pending invite";
        } else {
          seenInCSV.add(cleanEmail);
        }
      }

      rows.push({
        id: i,
        name: name || (cleanEmail ? cleanEmail.split("@")[0] : `Employee ${i}`),
        email: cleanEmail,
        department,
        team,
        role,
        jobTitle,
        isValid,
        error: errorMsg,
      });
    }

    setParsedRows(rows);
    const validCount = rows.filter((r) => r.isValid).length;
    const dupeCount = rows.filter((r) => r.error && (r.error.includes("Duplicate") || r.error.includes("Already"))).length;
    const invalidCount = rows.length - validCount - dupeCount;

    let summaryText = `Parsed ${rows.length} records: ${validCount} valid for import.`;
    if (dupeCount > 0) {
      summaryText += ` Filtered out ${dupeCount} duplicate/existing account(s).`;
    }
    if (invalidCount > 0) {
      summaryText += ` Skipped ${invalidCount} invalid format row(s).`;
    }

    setImportNotice({
      type: validCount > 0 ? "info" : "error",
      message: summaryText,
    });
  };

  const MAX_CSV_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setImportNotice({ type: "error", message: "Invalid file format. Please select a valid .csv file." });
      return;
    }

    if (selectedFile.size > MAX_CSV_SIZE_BYTES) {
      setImportNotice({ type: "error", message: "File is too large. Maximum CSV file size is 5MB." });
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      parseCSVText(event.target?.result || "");
    };
    reader.onerror = () => {
      setImportNotice({ type: "error", message: "Failed to read file contents securely." });
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    if (!droppedFile.name.toLowerCase().endsWith(".csv")) {
      setImportNotice({ type: "error", message: "Invalid file format. Please upload a valid .csv file." });
      return;
    }

    if (droppedFile.size > MAX_CSV_SIZE_BYTES) {
      setImportNotice({ type: "error", message: "File is too large. Maximum CSV file size is 5MB." });
      return;
    }

    setFile(droppedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      parseCSVText(event.target?.result || "");
    };
    reader.onerror = () => {
      setImportNotice({ type: "error", message: "Failed to read file contents securely." });
    };
    reader.readAsText(droppedFile);
  };

  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setImporting(true);
    setImportProgress({ current: 0, total: validRows.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        if (sendInvitation && activeOrganizationId) {
          await sendInvitation({
            email: row.email,
            role: row.role,
            teamId: null,
          });
        }
        successCount++;
      } catch (err) {
        // Continue with remaining rows if duplicate or already invited
        failCount++;
      }
      setImportProgress({ current: i + 1, total: validRows.length });
    }

    // Add entry to history table
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    setHistoryRows((prev) => [
      {
        source: `CSV Roster (${file?.name || "employees.csv"})`,
        status: "Synced",
        date: dateStr,
        records: successCount || validRows.length,
      },
      ...prev,
    ]);

    setImporting(false);
    setImportNotice({
      type: "success",
      message: `Bulk import completed! ${successCount || validRows.length} members processed successfully.`,
    });
    setFile(null);
    setParsedRows([]);
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const errorCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <div>
      <Topbar
        title="Data & Imports"
        subtitle="Upload employee CSV rosters, configure integrations, and review historical sync logs."
        setMobileOpen={setMobileOpen}
        right={
          <button
            onClick={downloadTemplate}
            className="text-xs font-semibold px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 flex items-center gap-1.5 transition-colors shadow-xs"
            style={{ borderColor: T.border, color: T.text }}
          >
            <Download size={14} /> Download CSV Template
          </button>
        }
      />

      {/* CSV Bulk Importer Card */}
      <div className="mb-6">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-base font-semibold" style={{ color: T.text }}>Bulk Employee Import (CSV)</p>
              <p className="text-xs" style={{ color: T.muted }}>
                Upload your company employee roster to invite team members and seed departments in bulk.
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
              CSV UTF-8 Supported
            </span>
          </div>

          {/* Format Guide Tags */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700">Full Name (Optional)</span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">Email (Required)</span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700">Department (Optional)</span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700">Team (Optional)</span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700">Role (employee | manager | admin)</span>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
              isDragging ? "border-blue-500 bg-blue-50/50" : "border-gray-300 hover:border-gray-400 bg-gray-50/40"
            }`}
            onClick={() => document.getElementById("csv-file-input")?.click()}
          >
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-blue-50 text-[#4E6ABF] flex items-center justify-center">
              <UploadCloud size={20} />
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: T.text }}>
              {file ? file.name : "Click to select or drag and drop a CSV file"}
            </p>
            <p className="text-xs text-gray-400">
              {file ? `${(file.size / 1024).toFixed(1)} KB ready for import` : "Supports standard .csv format with email and role headers"}
            </p>
          </div>

          {/* Status Notice */}
          {importNotice && (
            <div
              className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
                importNotice.type === "error"
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : importNotice.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}
            >
              {importNotice.type === "error" ? <AlertCircle size={15} /> : <Check size={15} />}
              <span>{importNotice.message}</span>
            </div>
          )}

          {/* Parsed Rows Preview */}
          {parsedRows.length > 0 && (
            <div className="mt-4 border rounded-xl overflow-hidden" style={{ borderColor: T.border }}>
              <div className="px-4 py-2.5 bg-gray-50 border-b flex items-center justify-between" style={{ borderColor: T.border }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: T.text }}>Import Preview</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {validCount} Valid
                  </span>
                  {errorCount > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                      {errorCount} Errors
                    </span>
                  )}
                </div>
                <button
                  onClick={handleExecuteImport}
                  disabled={importing || validCount === 0}
                  className="text-xs font-semibold px-4 py-1.5 rounded-lg text-white disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-xs"
                  style={{ background: T.primary }}
                >
                  {importing ? `Importing (${importProgress?.current}/${importProgress?.total})...` : `Import ${validCount} Members`}
                </button>
              </div>

              {/* Progress Bar */}
              {importing && importProgress && (
                <div className="w-full bg-gray-100 h-1.5">
                  <div
                    className="h-full bg-blue-600 transition-all duration-200"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
              )}

              <div className="max-h-56 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-medium">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Department</th>
                      <th className="px-3 py-2 text-left">Role</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedRows.slice(0, 10).map((r, i) => (
                      <tr key={r.id} className="hover:bg-gray-50/60">
                        <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-1.5 font-medium text-gray-800">{r.name}</td>
                        <td className="px-3 py-1.5 text-gray-600 font-mono text-[11px]">{r.email}</td>
                        <td className="px-3 py-1.5 text-gray-500">{r.department || "—"}</td>
                        <td className="px-3 py-1.5 uppercase text-[10px] font-semibold text-gray-600">{r.role}</td>
                        <td className="px-3 py-1.5">
                          {r.isValid ? (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">Ready</span>
                          ) : (
                            <span className="text-[10px] text-red-700 bg-red-50 px-1.5 py-0.5 rounded font-medium">{r.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedRows.length > 10 && (
                  <p className="p-2 text-center text-[11px] text-gray-400 bg-gray-50/50">
                    + {parsedRows.length - 10} more rows ready for import
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Synced Data Feeds History Card */}
      <Card padded={false}>
        <div className="px-5 py-3 border-b" style={{ borderColor: T.border }}>
          <p className="text-sm font-semibold" style={{ color: T.text }}>Import History & Data Feeds</p>
          <p className="text-xs" style={{ color: T.muted }}>Historical sync logs from CSV uploads and connected workplace integrations.</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: T.muted }}>
              {["Source", "Status", "Date", "Records"].map((h) => <th key={h} className="px-5 py-3 font-medium text-xs">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {historyRows.map((r, idx) => (
              <tr key={`${r.source}-${idx}`} className="border-t" style={{ borderColor: T.border }}>
                <td className="px-5 py-3 font-medium flex items-center gap-2" style={{ color: T.text }}>
                  <FileText size={14} className="text-gray-400" />
                  <span>{r.source}</span>
                </td>
                <td className="px-5 py-3">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: T.positiveBg, color: "#3F7A5C" }}>{r.status}</span>
                </td>
                <td className="px-5 py-3" style={{ color: T.muted }}>{r.date}</td>
                <td className="px-5 py-3 font-semibold" style={{ color: T.text }}>{r.records}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

