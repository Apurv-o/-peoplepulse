import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "../../lib/auth";
import { useOrganization } from "../../lib/organization";
import { supabase } from "../../lib/supabase";
import { getTodayDate } from "../../lib/dateUtils";
import { T } from "../ui";
import {
  Home, MessageSquare, TrendingUp, Users, UserPlus, Layers, ListChecks, UploadCloud,
  Settings, Bell, ChevronDown, Lock, ArrowRight, Search, Menu, X, Sparkles,
  ArrowUp, ArrowDown, ShieldCheck, Check, LogOut, ArrowLeft, Copy, Building2, Plus, AlertCircle,
  RotateCw, Trash2, Link2, Send, Eye, EyeOff, Mail, ExternalLink, UserX, AlertTriangle, FileText, Download,
  Activity, Calendar, Clock, Heart, Award, Bot, Save, RefreshCw, CheckCircle2, ChevronRight, HelpCircle
} from "lucide-react";


export default function Topbar({ title, subtitle, setMobileOpen, right }) {
  const { user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const formatNotifTime = (dateStr) => {
    if (!dateStr) return "Today";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24 && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const fetchNotifications = useCallback(async () => {
    if (!user?.id || !supabase) {
      setNotifications([
        {
          id: "sys-1",
          title: "Daily Pulse Active",
          message: "Today's check-in cycle is active. Takes ~60 seconds to share your pulse.",
          created_at: new Date().toISOString(),
          is_read: false,
        },
        {
          id: "sys-2",
          title: "Privacy Threshold Active",
          message: "Strict n ≥ 3 anonymity barrier is protecting your identity at the DB level.",
          created_at: new Date().toISOString(),
          is_read: true,
        },
      ]);
      setUnreadCount(1);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, message, target_date, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data && data.length > 0) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      } else {
        setNotifications([
          {
            id: "sys-1",
            title: "Daily Pulse Active",
            message: "Today's check-in cycle is active. Takes ~60 seconds to share your pulse.",
            created_at: new Date().toISOString(),
            is_read: false,
          },
          {
            id: "sys-2",
            title: "Privacy Threshold Active",
            message: "Strict n ≥ 3 anonymity barrier is protecting your identity at the DB level.",
            created_at: new Date().toISOString(),
            is_read: true,
          },
        ]);
        setUnreadCount(1);
      }
    } catch (e) {
      console.warn("Failed loading notifications:", e);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();

    if (!user?.id || !supabase) return;

    // Real-time listener for newly dispatched notifications
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          fetchNotifications();
          if (
            payload.eventType === "INSERT" &&
            typeof window !== "undefined" &&
            "Notification" in window &&
            window.Notification.permission === "granted"
          ) {
            new window.Notification(payload.new?.title || "Daily Pulse Check-in Ready", {
              body: payload.new?.message || "Today's pulse check-in is now open.",
              icon: "/favicon.ico",
            });
          }
        }
      )
      .subscribe();

    // Midnight rollover timer: when the clock reaches 12:00 AM, trigger browser notification & reload notifications
    const now = new Date();
    const tomorrowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const msUntilMidnight = Math.max(1000, tomorrowMidnight.getTime() - now.getTime());
    const midnightTimer = setTimeout(() => {
      fetchNotifications();
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        window.Notification.permission === "granted"
      ) {
        new window.Notification("Daily Pulse Check-in Ready", {
          body: "A new day has started! Today's 60-second confidential pulse check-in is now open.",
          icon: "/favicon.ico",
        });
      }
    }, msUntilMidnight);

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(midnightTimer);
    };
  }, [user?.id, fetchNotifications]);

  const handleOpenDrawer = async () => {
    const nextState = !notifOpen;
    setNotifOpen(nextState);

    if (nextState && unreadCount > 0) {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

      if (user?.id && supabase) {
        try {
          await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", user.id)
            .eq("is_read", false);
        } catch (err) {
          console.warn("Error marking notifications as read:", err);
        }
      }
    }
  };

  const handleRequestPushPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await window.Notification.requestPermission();
        if (perm === "granted") {
          new window.Notification("Notifications Enabled", {
            body: "You'll receive a daily reminder when the new pulse cycle opens at 12:00 AM.",
            icon: "/favicon.ico",
          });
        }
      } catch (err) {
        console.warn("Could not request notification permission:", err);
      }
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-3 min-w-0">
        <button className="lg:hidden p-2 rounded-xl text-[#1F2A28] hover:bg-gray-100 transition-colors" onClick={() => setMobileOpen(true)}>
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate" style={{ color: T.text }}>{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm mt-0.5" style={{ color: T.muted }}>{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 relative">
        {right}
        <div className="relative">
          <button
            onClick={handleOpenDrawer}
            className="w-9 h-9 rounded-xl flex items-center justify-center border bg-white relative hover:bg-gray-50 transition-all duration-200 shadow-xs active:scale-95"
            style={{ borderColor: T.border }}
            title="Notifications"
          >
            <Bell size={16} style={{ color: unreadCount > 0 ? T.primary : T.muted }} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white shadow-xs"
                style={{ background: T.negative }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Popover Drawer */}
          {notifOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border p-4 z-50 animate-slide-down origin-top-right"
              style={{ borderColor: T.border }}
            >
              <div className="flex items-center justify-between pb-2.5 border-b" style={{ borderColor: T.border }}>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: T.text }}>
                    Notifications
                  </p>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={async () => {
                        setUnreadCount(0);
                        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
                        if (user?.id && supabase) {
                          await supabase
                            .from("notifications")
                            .update({ is_read: true })
                            .eq("user_id", user.id)
                            .eq("is_read", false);
                        }
                      }}
                      className="text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Browser Push Permission CTA */}
              {typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "default" && (
                <div className="my-2.5 p-2.5 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-blue-800 font-medium">Enable daily 12:00 AM push alerts</span>
                  <button
                    type="button"
                    onClick={handleRequestPushPermission}
                    className="text-[11px] font-bold px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0"
                  >
                    Enable
                  </button>
                </div>
              )}

              <div className="divide-y max-h-72 overflow-y-auto" style={{ borderColor: T.border }}>
                {notifications.map((n) => (
                  <div key={n.id} className="py-2.5 space-y-0.5 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: T.text }}>
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />}
                        {n.title}
                      </p>
                      <span className="text-[10px] text-gray-400 shrink-0">{formatNotifTime(n.created_at)}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">{n.message || n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

