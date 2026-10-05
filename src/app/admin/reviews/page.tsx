"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminAuth } from "../AdminAuthContext";
import {
  Star,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface AdminReviewItem {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isVisible: boolean;
  isReported: boolean;
  verifiedPurchase: boolean;
  createdAt: string;
  product: {
    id: string;
    title: string;
    slug: string;
  };
  buyer: {
    id: string;
    fullName: string;
  };
}

export default function AdminReviewsPage() {
  const { token } = useAdminAuth();
  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
  const [visibilityFilter, setVisibilityFilter] = useState<string>("ALL");
  const [ratingFilter, setRatingFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchReviews = async (p = page, v = visibilityFilter, r = ratingFilter, q = search) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", p.toString());
      params.set("limit", "15");
      if (v === "VISIBLE") params.set("isVisible", "true");
      if (v === "HIDDEN") params.set("isVisible", "false");
      if (r !== "ALL") params.set("rating", r);
      if (q.trim()) params.set("search", q.trim());

      const res = await fetch(`/api/v1/admin/reviews?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load reviews register");
      }
      setReviews(data.data.reviews || []);
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
      fetchReviews(1, visibilityFilter, ratingFilter, search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, visibilityFilter, ratingFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReviews(1, visibilityFilter, ratingFilter, search);
  };

  const handleModerate = async (reviewId: string, action: "hide" | "restore" | "delete") => {
    if (!token) return;
    const confirmPrompt =
      action === "delete"
        ? "Are you sure you want to permanently delete this customer review?"
        : `Are you sure you want to ${action} this review?`;
    if (!confirm(confirmPrompt)) return;

    try {
      setActionLoadingId(reviewId);
      setError(null);
      setSuccess(null);
      const res = await fetch(`/api/v1/admin/reviews/${reviewId}/moderate`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || `Failed to ${action} review`);
      }

      setSuccess(`Review has been successfully ${action}d.`);
      fetchReviews(page, visibilityFilter, ratingFilter, search);
    } catch (err: any) {
      setError(err.message || "Moderation action failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Review Moderation Register</h1>
          <p className="text-xs text-slate-400 mt-1">
            Audit customer feedback, uphold review integrity, and moderate community reports.
          </p>
        </div>
        <button
          onClick={() => fetchReviews(page, visibilityFilter, ratingFilter, search)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {/* Visibility filter */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            {[
              { label: "All Reviews", val: "ALL" },
              { label: "Visible", val: "VISIBLE" },
              { label: "Hidden", val: "HIDDEN" },
            ].map((tab) => (
              <button
                key={tab.val}
                onClick={() => {
                  setVisibilityFilter(tab.val);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  visibilityFilter === tab.val
                    ? "bg-rose-500/20 text-rose-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Rating filter */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            {["ALL", "5", "4", "3", "2", "1"].map((star) => (
              <button
                key={star}
                onClick={() => {
                  setRatingFilter(star);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  ratingFilter === star
                    ? "bg-rose-500/20 text-rose-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {star === "ALL" ? "All Stars" : `${star}★`}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, comment..."
              className="text-xs pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 w-64"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Reviews Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-rose-500" />
            <p className="text-xs font-medium">Loading reviews register...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Star className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">No Reviews Found</h3>
            <p className="text-xs text-slate-500 mt-1">Try modifying your filter or query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4">Review Content</th>
                  <th className="py-3 px-4">Verified</th>
                  <th className="py-3 px-4">Visibility</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-white truncate">{r.product.title}</div>
                      <Link
                        href={`/products/${r.product.slug}`}
                        target="_blank"
                        className="text-[11px] text-rose-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        <span>View catalog</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-amber-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= r.rating ? "fill-amber-400 text-amber-400" : "text-slate-700"
                            }`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      {r.title && <div className="font-semibold text-slate-200">{r.title}</div>}
                      <p className="text-slate-400 text-[11px] line-clamp-2">
                        {r.comment || "No comment text provided."}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {r.isVisible ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                          <Eye className="w-3 h-3" />
                          Visible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 text-[11px] font-medium">
                          <EyeOff className="w-3 h-3" />
                          Hidden
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {r.isVisible ? (
                          <button
                            onClick={() => handleModerate(r.id, "hide")}
                            disabled={actionLoadingId === r.id}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition disabled:opacity-50"
                          >
                            Hide
                          </button>
                        ) : (
                          <button
                            onClick={() => handleModerate(r.id, "restore")}
                            disabled={actionLoadingId === r.id}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg transition disabled:opacity-50"
                          >
                            Restore
                          </button>
                        )}
                        <button
                          onClick={() => handleModerate(r.id, "delete")}
                          disabled={actionLoadingId === r.id}
                          className="px-2 py-1 text-[11px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition disabled:opacity-50"
                          title="Delete review permanently"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40">
            <span>
              Page {page} of {totalPages} ({totalCount} total reviews)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchReviews(page - 1, visibilityFilter, ratingFilter, search)}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                onClick={() => fetchReviews(page + 1, visibilityFilter, ratingFilter, search)}
                disabled={page >= totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
