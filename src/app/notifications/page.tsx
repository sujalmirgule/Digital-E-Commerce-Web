"use client";

import React, { useState, useEffect, useCallback } from "react";
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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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

const TYPE_LABEL: Record<string, string> = {
  SELLER_APPROVED: "Seller Approved",
  SELLER_REJECTED: "Seller Rejected",
  PRODUCT_APPROVED: "Product Approved",
  PRODUCT_REJECTED: "Product Rejected",
  PAYMENT_SUCCESS: "Payment",
  NEW_SALE: "New Sale",
  RECEIPT_GENERATED: "Receipt",
  ORDER_PLACED: "Order",
  NEW_REVIEW: "Review",
  REFUND_PROCESSED: "Refund",
  PAYOUT_COMPLETED: "Payout",
  PAYOUT_FAILED: "Payout Failed",
  ACCOUNT_ALERT: "Account",
  PRODUCT_UPDATED: "Product Update",
};

const ALL_TYPES = Object.keys(TYPE_LABEL);

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function NotificationsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [readFilter, setReadFilter] = useState<"" | "false" | "true">("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const [marking, setMarking] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? localStorage.getItem("seller_auth_token") ||
          localStorage.getItem("admin_auth_token") ||
          localStorage.getItem("auth_token")
        : null;
    setToken(stored);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (readFilter) params.set("isRead", readFilter);
      if (typeFilter) params.set("type", typeFilter);

      const res = await fetch(`/api/v1/notifications?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load notifications");
      }
      const data = await res.json();
      setNotifications(data.data?.notifications ?? []);
      setPagination(data.data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 });
      setUnreadCount(data.data?.unreadCount ?? 0);
    } catch (err: any) {
      setError(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [token, page, readFilter, typeFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    if (!token || marking) return;
    setMarking(id);
    try {
      await fetch(`/api/v1/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
    finally { setMarking(null); }
  };

  const markAllRead = async () => {
    if (!token || markingAll) return;
    setMarkingAll(true);
    try {
      await fetch("/api/v1/notifications/read-all", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
    finally { setMarkingAll(false); }
  };

  const deleteNotif = async (id: string) => {
    if (!token || deleting) return;
    const wasUnread = notifications.find((n) => n.id === id)?.isRead === false;
    setDeleting(id);
    try {
      await fetch(`/api/v1/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
    finally { setDeleting(null); }
  };

  const handleFilterChange = (newRead: typeof readFilter, newType: string) => {
    setReadFilter(newRead);
    setTypeFilter(newType);
    setPage(1);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-xl font-bold text-white mb-2">Authentication Required</h1>
          <p className="text-slate-400 text-sm mb-4">Please log in to view your notifications.</p>
          <Link href="/" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500 transition-colors">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors">
              ←
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                🔔 Notifications
                {unreadCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold">
                    {unreadCount} unread
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {pagination.total} total notification{pagination.total !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              id="mark-all-read-btn"
              onClick={markAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 hover:text-emerald-300 transition-all text-sm font-medium disabled:opacity-50"
            >
              {markingAll ? "Marking..." : "✓ Mark all read"}
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-3 flex flex-wrap items-center gap-2">
          {/* Read State Filter */}
          <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg p-1">
            {[
              { value: "" as const, label: "All" },
              { value: "false" as const, label: "Unread" },
              { value: "true" as const, label: "Read" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => handleFilterChange(f.value, typeFilter)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  readFilter === f.value
                    ? "bg-emerald-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <select
            id="notification-type-filter"
            value={typeFilter}
            onChange={(e) => handleFilterChange(readFilter, e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs focus:outline-none focus:border-emerald-500/60 transition-colors"
          >
            <option value="">All Types</option>
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_ICON[t]} {TYPE_LABEL[t]}
              </option>
            ))}
          </select>

          {(readFilter || typeFilter) && (
            <button
              onClick={() => handleFilterChange("", "")}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1"
            >
              ✕ Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 bg-slate-900 rounded-xl border border-slate-800 animate-pulse"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-700/60 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-700/60 rounded w-2/5" />
                  <div className="h-3 bg-slate-700/40 rounded w-full" />
                  <div className="h-3 bg-slate-700/30 rounded w-3/4" />
                  <div className="h-2.5 bg-slate-700/20 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-red-400 font-medium">{error}</p>
            <button
              onClick={fetchNotifications}
              className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && notifications.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-4xl mx-auto mb-4">
              🔔
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {readFilter === "false" ? "No unread notifications" : "No notifications"}
            </h2>
            <p className="text-slate-400 text-sm">
              {readFilter === "false"
                ? "You've read everything — great job staying on top of things!"
                : "You'll be notified here when important events occur."}
            </p>
            {(readFilter || typeFilter) && (
              <button
                onClick={() => handleFilterChange("", "")}
                className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Notification List */}
        {!loading && !error && notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((n) => {
              const icon = TYPE_ICON[n.type] ?? "📌";
              const isDeleting = deleting === n.id;
              const isMarking = marking === n.id;

              const card = (
                <div
                  key={n.id}
                  id={`notif-${n.id}`}
                  className={`group relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 ${
                    !n.isRead
                      ? "bg-slate-900 border-emerald-500/20 hover:border-emerald-500/40"
                      : "bg-slate-900/50 border-slate-800/60 hover:border-slate-700/60"
                  } ${isDeleting ? "opacity-50 scale-95" : ""}`}
                >
                  {/* Unread indicator line */}
                  {!n.isRead && (
                    <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-emerald-500 rounded-full" />
                  )}

                  {/* Type Icon */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                      !n.isRead ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-slate-800 border border-slate-700/60"
                    }`}
                  >
                    {icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`font-semibold text-sm leading-snug ${
                            n.isRead ? "text-slate-200" : "text-white"
                          }`}
                        >
                          {n.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400 font-medium shrink-0">
                          {TYPE_LABEL[n.type] ?? n.type}
                        </span>
                        {!n.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-0.5" />
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 shrink-0">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed line-clamp-3">
                      {n.message}
                    </p>
                    {n.readAt && (
                      <p className="text-[10px] text-slate-600 mt-1">
                        Read{" "}
                        {new Date(n.readAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!n.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          markAsRead(n.id);
                        }}
                        disabled={isMarking}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                        title="Mark as read"
                      >
                        {isMarking ? (
                          <span className="w-4 h-4 border border-t-emerald-400 border-slate-600 rounded-full animate-spin block" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        deleteNotif(n.id);
                      }}
                      disabled={isDeleting}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Delete notification"
                    >
                      {isDeleting ? (
                        <span className="w-4 h-4 border border-t-red-400 border-slate-600 rounded-full animate-spin block" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              );

              return n.linkUrl ? (
                <Link
                  key={n.id}
                  href={n.linkUrl}
                  className="block"
                  onClick={() => !n.isRead && markAsRead(n.id)}
                >
                  {card}
                </Link>
              ) : (
                <div key={n.id}>{card}</div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              id="notifications-prev-page"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-300 text-sm hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <div className="flex items-center gap-1">
              {[...Array(Math.min(pagination.totalPages, 7))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      page === pageNum
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              id="notifications-next-page"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-300 text-sm hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

