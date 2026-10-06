"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useDashboardAuth } from "../DashboardAuthContext";
import { BuyerReviewItemDTO } from "@/lib/services/buyer-dashboard";
import { Star, Edit3, Trash2, AlertCircle, Plus } from "lucide-react";

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
    if (!confirm("Are you sure you want to remove your review?")) return;
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
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3A2930]">
        <div>
          <h1 className="text-3xl font-serif font-normal text-[#F7EFE2] tracking-tight">
            My Product Reviews
          </h1>
          <p className="text-[#BBAE9F] text-xs mt-1">
            Manage your verified buyer ratings and written reviews across purchased digital products.
          </p>
        </div>

        <Link
          href="/dashboard/library"
          className="px-3.5 py-2 rounded-xl bg-[#F43F5E] hover:bg-[#F43F5E]/90 text-white text-xs font-medium self-start sm:self-auto transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Review a Purchase</span>
        </Link>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-[#211815] border border-[#3A2930] rounded-2xl p-4"></div>
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
            onClick={loadReviews}
            className="px-3 py-1 rounded-lg bg-[#F43F5E] text-white text-xs font-medium hover:bg-[#F43F5E]/90"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && reviews.length === 0 && (
        <div className="py-20 text-center bg-[#211815]/40 border border-[#3A2930] rounded-3xl p-8 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-[#120A12] border border-[#3A2930] flex items-center justify-center text-xl mx-auto mb-3">
            <Star className="w-5 h-5 text-[#BBAE9F]" />
          </div>
          <h3 className="font-serif text-base text-[#F7EFE2]">No reviews submitted yet</h3>
          <p className="text-xs text-[#BBAE9F] max-w-sm mx-auto mt-1 mb-6">
            Share your feedback on items in your digital library to help other buyers and support creators.
          </p>
          <Link
            href="/dashboard/library"
            className="inline-flex px-5 py-2.5 rounded-full bg-[#F43F5E] hover:bg-[#F43F5E]/90 text-white text-xs font-semibold shadow-md transition-colors"
          >
            Go to My Library →
          </Link>
        </div>
      )}

      {/* Reviews list */}
      {!loading && reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-5 rounded-2xl bg-[#211815] border border-[#3A2930] hover:border-[#E8D5B5]/40 flex flex-col justify-between gap-4 transition-all shadow-sm"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#F7EFE2] text-sm">
                      {rev.productTitle}
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 font-mono">
                      Verified Buyer
                    </span>
                  </div>

                  <span className="text-xs text-[#BBAE9F]/70 font-mono">
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Stars and Title */}
                <div className="flex items-center gap-2">
                  <div className="flex text-amber-400 text-xs">
                    {"★".repeat(rev.rating)}
                    {"☆".repeat(5 - rev.rating)}
                  </div>
                  {rev.title && (
                    <span className="font-medium text-[#E8D5B5] text-xs">{rev.title}</span>
                  )}
                </div>

                {/* Comment body */}
                <p className="text-xs text-[#BBAE9F] leading-relaxed bg-[#120A12]/60 p-3 rounded-xl border border-[#3A2930]">
                  {rev.comment}
                </p>

                {/* Seller Reply if present */}
                {(rev as unknown as { sellerReply?: string })?.sellerReply && (
                  <div className="ml-4 pl-3 border-l-2 border-[#F43F5E] text-xs space-y-0.5">
                    <div className="font-medium text-[#F43F5E]">Creator Response:</div>
                    <p className="text-[#BBAE9F] italic">
                      {(rev as unknown as { sellerReply?: string })?.sellerReply}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#3A2930]/80">
                <button
                  onClick={() => {
                    setEditingReview(rev);
                    setEditRating(rev.rating);
                    setEditTitle(rev.title || "");
                    setEditComment(rev.comment);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#120A12] border border-[#3A2930] hover:border-[#E8D5B5] text-[#E8D5B5] text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <Edit3 className="w-3 h-3 text-[#BBAE9F]" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteReview(rev.id)}
                  className="px-3 py-1.5 rounded-xl bg-rose-950/30 border border-rose-800/40 hover:bg-rose-900/30 text-rose-300 text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingReview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-[#211815] border border-[#3A2930] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#3A2930]">
              <h2 className="font-serif font-medium text-[#F7EFE2] text-base">
                Edit Review: {editingReview.productTitle}
              </h2>
              <button
                onClick={() => setEditingReview(null)}
                className="text-[#BBAE9F] hover:text-[#F7EFE2] text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#BBAE9F] font-medium mb-1.5">Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditRating(star)}
                      className={`text-xl p-1 transition-transform ${
                        star <= editRating ? "text-amber-400 scale-110" : "text-[#3A2930] hover:text-amber-300"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-xs text-[#BBAE9F] font-mono ml-2">
                    {editRating} / 5
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[#BBAE9F] font-medium mb-1.5">Review Headline</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#120A12] border border-[#3A2930] text-[#F7EFE2] focus:outline-none focus:border-[#E8D5B5]"
                  placeholder="e.g. Exceptional quality and clean organization"
                />
              </div>

              <div>
                <label className="block text-[#BBAE9F] font-medium mb-1.5">Written Feedback</label>
                <textarea
                  rows={4}
                  required
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#120A12] border border-[#3A2930] text-[#F7EFE2] focus:outline-none focus:border-[#E8D5B5]"
                  placeholder="Detailed thoughts on design fidelity, code clarity, documentation..."
                />
              </div>

              {editStatus && (
                <div className="p-3 rounded-xl bg-[#120A12] border border-[#3A2930] text-xs">
                  {editStatus}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingReview(null)}
                  className="px-4 py-2 rounded-xl bg-[#120A12] text-[#BBAE9F] hover:text-[#F7EFE2] border border-[#3A2930]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-[#F43F5E] hover:bg-[#F43F5E]/90 text-white font-medium disabled:opacity-50"
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
