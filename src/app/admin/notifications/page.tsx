"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminAuth } from "../AdminAuthContext";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  User,
  Calendar,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Inbox,
} from "lucide-react";

interface AdminNotificationItem {
  id: string;
  userId: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  type: string;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function AdminNotificationsPage() {
  const { token } = useAdminAuth();
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [readFilter, setReadFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async (p = page, t = typeFilter, r = readFilter, q = search) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", p.toString());
      params.set("limit", "15");
      if (t !== "ALL") params.set("type", t);
      if (r === "READ") params.set("isRead", "true");
      if (r === "UNREAD") params.set("isRead", "false");
      if (q.trim()) params.set("search", q.trim());

      const res = await fetch(`/api/v1/admin/notifications?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load notifications register");
      }
      setNotifications(data.data.notifications || []);
      setPage(data.data.pagination.page);
      setTotalPages(data.data.pagination.totalPages);
      setTotalCount(data.data.pagination.total);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchNotifications(1, typeFilter, readFilter, search);
    }
  }, [token, typeFilter, readFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNotifications(1, typeFilter, readFilter, search);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif text-[#F7EFE2] flex items-center gap-3">
            <Bell className="w-6 h-6 text-[#F43F5E]" />
            <span>Platform Notification Activity</span>
          </h1>
          <p className="text-xs text-[#BBAE9F] mt-1">
            Authoritative audit trail of user and merchant alerts dispatched across the marketplace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchNotifications(page, typeFilter, readFilter, search)}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs bg-[#211815] hover:bg-[#2B201C] border border-[#3A2930] text-[#E8D5B5] flex items-center gap-2 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BBAE9F] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, message, user email or name..."
            className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl bg-[#211815] border border-[#3A2930] text-[#F7EFE2] placeholder-[#BBAE9F]/50 focus:outline-none focus:border-[#E8D5B5] transition font-light"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          {/* Read Status Filter */}
          <div className="flex items-center rounded-xl bg-[#211815] border border-[#3A2930] p-1 text-xs">
            <button
              onClick={() => setReadFilter("ALL")}
              className={`px-3 py-1 rounded-lg transition ${
                readFilter === "ALL" ? "bg-[#F43F5E] text-white" : "text-[#BBAE9F] hover:text-[#F7EFE2]"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setReadFilter("UNREAD")}
              className={`px-3 py-1 rounded-lg transition ${
                readFilter === "UNREAD" ? "bg-[#F43F5E] text-white" : "text-[#BBAE9F] hover:text-[#F7EFE2]"
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setReadFilter("READ")}
              className={`px-3 py-1 rounded-lg transition ${
                readFilter === "READ" ? "bg-[#F43F5E] text-white" : "text-[#BBAE9F] hover:text-[#F7EFE2]"
              }`}
            >
              Read
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Notifications Table */}
      <div className="bg-[#211815] border border-[#3A2930] rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="py-24 text-center text-[#BBAE9F]">
            <RefreshCw className="w-8 h-8 animate-spin text-[#F43F5E] mx-auto mb-3" />
            <p className="text-xs font-mono">Retrieving notifications from database...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center text-[#BBAE9F] space-y-3">
            <Inbox className="w-10 h-10 mx-auto text-[#3A2930]" />
            <h3 className="font-serif text-base text-[#F7EFE2]">No Notifications Found</h3>
            <p className="text-xs max-w-sm mx-auto">
              No platform notification activity matched your query or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#1B101B] border-b border-[#3A2930] text-[11px] font-mono text-[#E8D5B5] uppercase">
                  <th className="py-3.5 px-4">Recipient</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Subject & Message</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3A2930]/60">
                {notifications.map((n) => (
                  <tr key={n.id} className="hover:bg-[#2B201C]/40 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-[#F7EFE2]">{n.user.fullName}</div>
                      <div className="text-[11px] text-[#BBAE9F] font-mono">{n.user.email}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#1B101B] text-[#E8D5B5] border border-[#3A2930]">
                        {n.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#F7EFE2]">{n.title}</div>
                      <p className="text-[#BBAE9F] text-[11px] mt-0.5 max-w-md line-clamp-2">
                        {n.message}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {n.isRead ? (
                        <span className="text-emerald-400 font-mono text-[11px]">Read</span>
                      ) : (
                        <span className="text-[#FB7185] font-mono text-[11px]">Unread</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-[#BBAE9F]">
                      {new Date(n.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#3A2930] flex items-center justify-between text-xs text-[#BBAE9F]">
            <div>
              Showing page {page} of {totalPages} ({totalCount} total alerts)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchNotifications(page - 1)}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg bg-[#1B101B] border border-[#3A2930] hover:text-[#F7EFE2] disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchNotifications(page + 1)}
                disabled={page >= totalPages || loading}
                className="p-1.5 rounded-lg bg-[#1B101B] border border-[#3A2930] hover:text-[#F7EFE2] disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
