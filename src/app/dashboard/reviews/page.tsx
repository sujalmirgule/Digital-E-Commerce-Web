"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useDashboardAuth } from "../DashboardAuthContext";
import { BuyerReviewItemDTO } from "@/lib/services/buyer-dashboard";

export default function BuyerReviewsPage() {
  const { token, fetchWithAuth } = useDashboardAuth();
  const [reviews, setReviews] = useState<BuyerReviewItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal
  const [editingReview, setEditingReview] = useState<BuyerReviewItemDTO | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editTitle, setEditTitle] = useState("");
  const [editComment, setEditComment] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editStatus, setEditStatus] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithAuth("/api/v1/buyer/reviews");
      const json = await res.json();

      if (res.ok && Array.isArray(json.data)) {
        setReviews(json.data);
      } else {
        setError(json.error?.message || "Failed to load reviews");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [token, fetchWithAuth]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview) return;
    setSavingEdit(true);
    setEditStatus(null);

    try {
      const res = await fetchWithAuth(`/api/v1/reviews/${editingReview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: editRating,
          title: editTitle,
          comment: editComment,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setEditStatus("✅ Review updated successfully!");
        setTimeout(() => {
          setEditingReview(null);
          setEditStatus(null);
          loadReviews();
        }, 1000);
      } else {
        setEditStatus(`❌ ${json.error?.message || "Failed to update review"}`);
      }
    } catch {
      setEditStatus("❌ Network error updating review");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!confirm("Are you sure you want to delete your review?")) return;
    try {
      const res = await fetchWithAuth(`/api/v1/reviews/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadReviews();
      } else {
        alert("Failed to delete review");
      }
    } catch {
      alert("Network error deleting review");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Product Reviews</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Manage your verified buyer ratings and written reviews across purchased digital products.
          </p>
        </div>

        <Link
          href="/dashboard/library"
          className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold self-start sm:self-auto transition-colors"
        >
          Review a Purchase →
        </Link>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse"></div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-200 text-sm">
          <span>⚠️ {error}</span>
          <button onClick={loadReviews} className="ml-3 underline hover:text-white">
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && reviews.length === 0 && (
        <div className="py-16 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8">
          <div className="text-4xl mb-3">⭐</div>
          <h3 className="font-bold text-base text-white">No reviews submitted yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            Share your feedback on items in your digital library to help other buyers and support creators.
          </p>
          <Link
            href="/dashboard/library"
            className="inline-flex px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Go to My Library
          </Link>
        </div>
      )}

      {/* Reviews list */}
      {!loading && reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-4 hover:border-slate-700 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {rev.productTitle}
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Verified Buyer
                    </span>
                  </div>

                  <span className="text-xs text-slate-400">
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Stars and Title */}
                <div className="flex items-center gap-2">
                  <div className="flex text-amber-400 text-sm">
                    {"★".repeat(rev.rating)}
                    {"☆".repeat(5 - rev.rating)}
                  </div>
                  <span className="font-bold text-slate-200 text-xs">{rev.title}</span>
                </div>

                {/* Comment body */}
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                  {rev.comment}
                </p>

                {/* Seller Reply if present */}
                {rev.sellerReply && (
                  <div className="ml-4 pl-3 border-l-2 border-indigo-500 text-xs text-slate-400 space-y-0.5">
                    <div className="font-semibold text-indigo-300">Creator Response:</div>
                    <p className="text-slate-300 italic">{rev.sellerReply}</p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60 text-xs">
                <button
                  onClick={() => {
                    setEditingReview(rev);
                    setEditRating(rev.rating);
                    setEditTitle(rev.title);
                    setEditComment(rev.comment);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium transition-colors"
                >
                  Edit Review
                </button>
                <button
                  onClick={() => handleDeleteReview(rev.id)}
                  className="px-3 py-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/40 text-red-400 font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Review Modal */}
      {editingReview && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="font-bold text-white text-base">
                Edit Review: {editingReview.productTitle}
              </h2>
              <button
                onClick={() => setEditingReview(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditRating(star)}
                      className={`text-xl p-1 transition-transform ${
                        star <= editRating ? "scale-110" : "opacity-40"
                      }`}
                    >
                      ⭐
                    </button>
                  ))}
                  <span className="ml-2 font-bold text-amber-400">{editRating} Stars</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Review Headline</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Your Detailed Feedback</label>
                <textarea
                  rows={4}
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                  minLength={5}
                  maxLength={2000}
                ></textarea>
              </div>

              {editStatus && (
                <div className="p-2.5 rounded-lg bg-slate-800 text-xs font-medium">
                  {editStatus}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingReview(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
