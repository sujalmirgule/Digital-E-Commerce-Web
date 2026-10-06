"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  metadata?: Record<string, any> | null;
}

interface NotificationBellProps {
  token: string | null;
  accentColor?: "emerald" | "violet" | "blue" | "orange" | "rose";
  notificationsPageHref?: string;
}

const TYPE_ICON: Record<string, string> = {
  SELLER_APPROVED: "✅",
  SELLER_REJECTED: "❌",
  PRODUCT_APPROVED: "📦",
  PRODUCT_REJECTED: "🚫",
  PAYMENT_SUCCESS: "💰",
  NEW_SALE: "🛍️",
  RECEIPT_GENERATED: "🧾",
  ORDER_PLACED: "📋",
  NEW_REVIEW: "⭐",
  REFUND_PROCESSED: "↩️",
  PAYOUT_COMPLETED: "💸",
  PAYOUT_FAILED: "⚠️",
  ACCOUNT_ALERT: "🔔",
  PRODUCT_UPDATED: "✏️",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function NotificationBell({
  token,
  accentColor = "emerald",
  notificationsPageHref = "/notifications",
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const badgeClass =
    accentColor === "rose"
      ? "bg-rose-500"
      : accentColor === "orange"
      ? "bg-orange-500"
      : accentColor === "emerald"
      ? "bg-emerald-500"
      : accentColor === "violet"
      ? "bg-violet-500"
      : "bg-blue-500";

  const linkClass =
    accentColor === "rose"
      ? "text-rose-400 hover:text-rose-300"
      : accentColor === "orange"
      ? "text-orange-400 hover:text-orange-300"
      : accentColor === "emerald"
      ? "text-emerald-400 hover:text-emerald-300"
      : accentColor === "violet"
      ? "text-violet-400 hover:text-violet-300"
      : "text-blue-400 hover:text-blue-300";

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/v1/notifications/unread-count", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.data?.unreadCount ?? 0);
      }
    } catch {
      /* silent */
    }
  }, [token]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/notifications?limit=15", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load notifications");
      const data = await res.json();
      setNotifications(data.data?.notifications ?? []);
      setUnreadCount(data.data?.unreadCount ?? 0);
    } catch (err: any) {
      setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, [token, fetchUnreadCount]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAsRead = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`/api/v1/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    if (!token) return;
    try {
      await fetch("/api/v1/notifications/read-all", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const deleteNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!token) return;
    const wasUnread = notifications.find((n) => n.id === id)?.isRead === false;
    try {
      await fetch(`/api/v1/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  if (!token) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="notification-bell-btn"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all duration-200 focus:outline-none"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${badgeClass}`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden"
          style={{ animation: "notifSlideDown 0.15s ease-out" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60">
            <span className="font-semibold text-white text-sm">
              Notifications
              {unreadCount > 0 && (
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${badgeClass} text-white font-bold`}>
                  {unreadCount}
                </span>
              )}
            </span>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className={`text-xs font-medium transition-colors ${linkClass}`}>
                  Mark all read
                </button>
              )}
              <Link
                href={notificationsPageHref}
                onClick={() => setOpen(false)}
                className={`text-xs font-medium transition-colors ${linkClass}`}
              >
                View all →
              </Link>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
            {loading && (
              <div className="flex flex-col gap-0">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-3 px-3 py-3 border-b border-slate-700/20 animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-slate-700/60 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-700/60 rounded w-3/4" />
                      <div className="h-2.5 bg-slate-700/40 rounded w-full" />
                      <div className="h-2 bg-slate-700/30 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="p-6 text-center">
                <p className="text-red-400 text-sm">{error}</p>
                <button onClick={fetchNotifications} className="mt-2 text-xs text-slate-400 hover:text-white underline">
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && notifications.length === 0 && (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2 opacity-60">🔔</div>
                <p className="text-slate-400 text-sm font-medium">You&apos;re all caught up!</p>
                <p className="text-slate-500 text-xs mt-1">No new notifications</p>
              </div>
            )}

            {!loading &&
              !error &&
              notifications.map((n) => {
                const icon = TYPE_ICON[n.type] ?? "📌";
                const itemContent = (
                  <div
                    className={`group flex items-start gap-3 px-3 py-3 border-b border-slate-700/30 transition-colors ${
                      !n.isRead ? "bg-slate-800/50" : "hover:bg-slate-800/20"
                    }`}
                    onClick={() => !n.isRead && markAsRead(n.id)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-sm shrink-0 mt-0.5">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p
                          className={`text-sm font-medium leading-snug ${
                            n.isRead ? "text-slate-300" : "text-white"
                          }`}
                        >
                          {n.title}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0 ml-1 mt-0.5">
                          {!n.isRead && (
                            <span className={`w-1.5 h-1.5 rounded-full ${badgeClass}`} />
                          )}
                          <button
                            onClick={(e) => deleteNotif(n.id, e)}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all text-[11px] p-0.5 leading-none"
                            title="Delete notification"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                );

                return n.linkUrl ? (
                  <Link
                    key={n.id}
                    href={n.linkUrl}
                    onClick={() => {
                      setOpen(false);
                      if (!n.isRead) markAsRead(n.id);
                    }}
                    className="block cursor-pointer"
                  >
                    {itemContent}
                  </Link>
                ) : (
                  <div key={n.id} className="cursor-default">
                    {itemContent}
                  </div>
                );
              })}
          </div>

          {!loading && notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-700/60 text-center bg-slate-900/80">
              <Link
                href={notificationsPageHref}
                onClick={() => setOpen(false)}
                className={`text-xs font-medium transition-colors ${linkClass}`}
              >
                View all notifications →
              </Link>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes notifSlideDown {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

