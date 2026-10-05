"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSellerAuth } from "../SellerAuthContext";
import {
  Star,
  MessageSquare,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CornerDownRight,
  Send,
} from "lucide-react";

interface SellerReview {
  id: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  rating: number;
  title: string | null;
  comment: string | null;
  verifiedPurchase: boolean;
  createdAt: string;
  sellerReply: string | null;
  sellerRepliedAt: string | null;
}

interface ReviewPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function SellerReviewsPage() {
  const { token } = useSellerAuth();
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [pagination, setPagination] = useState<ReviewPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Replying state
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const fetchReviews = async (page = 1) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/seller/reviews?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load customer reviews");
      }
      setReviews(data.data.reviews || []);
      setPagination(data.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchReviews(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleOpenReply = (review: SellerReview) => {
    setReplyingReviewId(review.id);
    setReplyText(review.sellerReply || "");
    setReplyError(null);
  };

  const handleCancelReply = () => {
    setReplyingReviewId(null);
    setReplyText("");
    setReplyError(null);
  };

  const handleSubmitReply = async (reviewId: string) => {
    if (!token || !replyText.trim()) return;
    try {
      setSubmittingReply(true);
      setReplyError(null);
      const res = await fetch(`/api/v1/seller/reviews/${reviewId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ replyText: replyText.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to submit seller reply");
      }

      // Update in state
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                sellerReply: data.data.sellerReply,
                sellerRepliedAt: data.data.sellerRepliedAt,
              }
            : r
        )
      );
      setReplyingReviewId(null);
      setReplyText("");
    } catch (err: any) {
      setReplyError(err.message || "Failed to submit reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Customer Reviews & Ratings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Read verified buyer feedback and publish official seller responses.
          </p>
        </div>
        <button
          onClick={() => fetchReviews(pagination.page)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Main Reviews List */}
      <div className="space-y-4">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
            <p className="text-sm font-medium">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-slate-500">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No Reviews Yet</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              When verified buyers leave reviews for your digital assets, they will appear here along with options to reply.
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4 hover:border-slate-300 transition-colors"
            >
              {/* Product link + date */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Product:
                  </span>
                  <Link
                    href={`/products/${review.productSlug}`}
                    target="_blank"
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1"
                  >
                    {review.productTitle}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-100">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified Purchase
                  </span>
                  <span>{formatDate(review.createdAt)}</span>
                </div>
              </div>

              {/* Rating + Comment */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= review.rating
                          ? "text-amber-400 fill-amber-400"
                          : "text-slate-200"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm font-bold text-slate-700">
                    {review.rating} / 5
                  </span>
                </div>

                {review.title && (
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">
                    {review.title}
                  </h4>
                )}

                <p className="text-sm text-slate-600 whitespace-pre-line">
                  {review.comment || "No detailed comment provided."}
                </p>
              </div>

              {/* Seller Reply Box */}
              {review.sellerReply && replyingReviewId !== review.id && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 ml-2 sm:ml-6 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
                      <CornerDownRight className="w-4 h-4" />
                      <span>Your Response</span>
                      {review.sellerRepliedAt && (
                        <span className="text-[11px] font-normal text-slate-400">
                          • {formatDate(review.sellerRepliedAt)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleOpenReply(review)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-line pl-6">
                    {review.sellerReply}
                  </p>
                </div>
              )}

              {/* Reply Form */}
              {replyingReviewId === review.id ? (
                <div className="bg-slate-50 border border-indigo-200 rounded-xl p-4 ml-2 sm:ml-6 space-y-3">
                  <div className="text-xs font-semibold text-indigo-600 flex items-center gap-1.5">
                    <CornerDownRight className="w-4 h-4" />
                    <span>Compose Response to Customer</span>
                  </div>

                  {replyError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                      {replyError}
                    </div>
                  )}

                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a polite, professional reply to this feedback..."
                    className="w-full text-xs sm:text-sm p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  />

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleCancelReply}
                      disabled={submittingReply}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSubmitReply(review.id)}
                      disabled={submittingReply || !replyText.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                    >
                      <Send className="w-3 h-3" />
                      {submittingReply ? "Posting..." : "Post Response"}
                    </button>
                  </div>
                </div>
              ) : (
                !review.sellerReply && (
                  <div className="pt-1">
                    <button
                      onClick={() => handleOpenReply(review)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      <CornerDownRight className="w-3.5 h-3.5" />
                      Reply to Customer
                    </button>
                  </div>
                )
              )}
            </div>
          ))
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} reviews)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchReviews(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={() => fetchReviews(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
