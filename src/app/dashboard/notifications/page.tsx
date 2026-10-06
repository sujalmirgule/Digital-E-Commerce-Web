"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useDashboardAuth } from "../DashboardAuthContext";
import { Bell, CheckCheck, Filter, AlertCircle, RefreshCw } from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const TYPE_ICONS: Record<string, string> = {
  PAYMENT_SUCCESS: "💰",
  ORDER_PLACED: "📦",
  RECEIPT_GENERATED: "🧾",
  NEW_REVIEW: "⭐",
  REFUND_PROCESSED: "↩️",
  ACCOUNT_ALERT: "🔔",
  PRODUCT_UPDATED: "✏️",
  SELLER_APPROVED: "✅",
};

export default function BuyerDashboardNotificationsPage() {
  const { token, fetchWithAuth } = useDashboardAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterRead, setFilterRead] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [page, setPage] = useState(1);

  // Action states
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (filterRead) params.set("isRead", filterRead);
      if (filterType) params.set("type", filterType);

      const res = await fetchWithAuth(`/api/v1/notifications?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.data) {
        setNotifications(json.data.notifications || []);
        setUnreadCount(json.data.unreadCount || 0);
        if (json.data.pagination) {
          setPagination(json.data.pagination);
        }
      } else {
        setError(json.error?.message || "Failed to load notifications");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [token, page, filterRead, filterType, fetchWithAuth]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (id: string) => {
    if (!token) return;
    try {
      setMarkingId(id);
      const res = await fetchWithAuth(`/api/v1/notifications/${id}/read`, {
        method: "PATCH",
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // ignore
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (!token || unreadCount === 0) return;
    try {
      setMarkingAll(true);
      const res = await fetchWithAuth("/api/v1/notifications/read-all", {
        method: "PATCH",
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
        setUnreadCount(0);
      }
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3A2930]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-serif font-normal text-[#F7EFE2] tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#F43F5E] text-white text-[11px] font-semibold">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-[#BBAE9F] text-xs mt-1">
            Real-time transaction alerts, order status updates, and digital asset releases.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#211815] border border-[#3A2930] hover:border-[#E8D5B5] text-[#E8D5B5] text-xs font-medium transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>{markingAll ? "Marking..." : "Mark all as read"}</span>
          </button>
        )}
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#211815] border border-[#3A2930]">
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-[#BBAE9F]" />
          <span className="text-[#BBAE9F] text-[11px] uppercase tracking-wider font-mono">Filter:</span>

          <div className="flex items-center gap-1">
            {[
              { label: "All", value: "" },
              { label: "Unread", value: "false" },
              { label: "Read", value: "true" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setFilterRead(tab.value);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  filterRead === tab.value
                    ? "bg-[#F43F5E] text-white"
                    : "text-[#BBAE9F] hover:text-[#F7EFE2] hover:bg-[#120A12]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-1.5 text-xs text-[#BBAE9F]">
            <RefreshCw className="w-3 h-3 animate-spin text-[#F43F5E]" />
            <span>Updating...</span>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && notifications.length === 0 && (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-[#211815] border border-[#3A2930] rounded-2xl"></div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-[#211815] border border-rose-900/50 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadNotifications}
            className="px-3 py-1 rounded-lg bg-[#F43F5E] text-white text-xs font-medium hover:bg-[#F43F5E]/90"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && notifications.length === 0 && (
        <div className="py-20 text-center bg-[#211815]/40 border border-[#3A2930] rounded-3xl p-8 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-[#120A12] border border-[#3A2930] flex items-center justify-center text-xl mx-auto mb-3">
            <Bell className="w-5 h-5 text-[#BBAE9F]" />
          </div>
          <h3 className="font-serif text-base text-[#F7EFE2]">No notifications found</h3>
          <p className="text-xs text-[#BBAE9F] max-w-sm mx-auto mt-1 mb-6">
            {filterRead === "false"
              ? "You have caught up with all updates. There are no unread notifications."
              : "You do not have any notifications at this moment."}
          </p>
        </div>
      )}

      {/* Notifications List */}
      {!loading && notifications.length > 0 && (
        <div className="space-y-2.5">
          {notifications.map((item) => {
            const icon = TYPE_ICONS[item.type] || "🔔";
            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                  item.isRead
                    ? "bg-[#211815]/60 border-[#3A2930] text-[#BBAE9F]"
                    : "bg-[#211815] border-[#E8D5B5]/40 shadow-sm text-[#F7EFE2]"
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#120A12] border border-[#3A2930] flex items-center justify-center text-base shrink-0">
                    {icon}
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium ${item.isRead ? "text-[#E8D5B5]" : "text-[#F7EFE2]"}`}>
                        {item.title}
                      </span>
                      {!item.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E] shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                      )}
                      <span className="text-[10px] text-[#BBAE9F]/70 font-mono ml-auto">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-[#BBAE9F] leading-relaxed break-words">
                      {item.message}
                    </p>

                    {item.linkUrl && (
                      <div className="pt-1">
                        <Link
                          href={item.linkUrl}
                          className="text-xs text-[#F43F5E] hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          View Details →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {!item.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(item.id)}
                    disabled={markingId === item.id}
                    title="Mark as read"
                    className="p-1.5 rounded-lg text-[#BBAE9F] hover:text-[#F7EFE2] hover:bg-[#120A12] transition-colors shrink-0"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-[#3A2930] text-xs">
          <span className="text-[#BBAE9F]">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-xl bg-[#211815] border border-[#3A2930] text-[#E8D5B5] disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="px-3 py-1.5 rounded-xl bg-[#211815] border border-[#3A2930] text-[#E8D5B5] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
