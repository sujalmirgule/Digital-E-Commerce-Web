"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useDashboardAuth } from "../DashboardAuthContext";

interface LibraryItem {
  entitlementId: string;
  orderId: string;
  purchasedAt: string;
  product: {
    id: string;
    title: string;
    slug: string;
    version: string;
    thumbnailUrl: string | null;
  };
  file: {
    id: string;
    filename: string;
    fileSize: number;
    downloadCount: number;
    maxAllowed: number | null;
  } | null;
}

export default function BuyerLibraryPage() {
  const { token, fetchWithAuth } = useDashboardAuth();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Review modal state
  const [reviewingProduct, setReviewingProduct] = useState<LibraryItem | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);

  const loadLibrary = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithAuth("/api/v1/buyer/library");
      const json = await res.json();

      if (res.ok && Array.isArray(json.data)) {
        setItems(json.data);
      } else {
        setError(json.error?.message || "Failed to load library items");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [token, fetchWithAuth]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingProduct) return;
    setSubmittingReview(true);
    setReviewStatus(null);

    try {
      const res = await fetchWithAuth(
        `/api/v1/products/${reviewingProduct.product.id}/reviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating,
            title: reviewTitle,
            comment: reviewComment,
          }),
        }
      );
      const json = await res.json();
      if (res.ok) {
        setReviewStatus("✅ Review submitted successfully!");
        setTimeout(() => {
          setReviewingProduct(null);
          setReviewStatus(null);
          setReviewTitle("");
          setReviewComment("");
        }, 1200);
      } else {
        setReviewStatus(`❌ ${json.error?.message || "Failed to submit review"}`);
      }
    } catch {
      setReviewStatus("❌ Network error submitting review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredItems = items.filter((it) =>
    it.product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    it.product.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Digital Library</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            All digital products, assets, and licenses provisioned to your account.
          </p>
        </div>

        {/* Search bar */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse"></div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-200 text-sm">
          <span>⚠️ {error}</span>
          <button
            onClick={loadLibrary}
            className="ml-3 underline hover:text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredItems.length === 0 && (
        <div className="py-16 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8">
          <div className="text-4xl mb-3">📚</div>
          <h3 className="font-bold text-base text-white">No items found in your library</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            {searchQuery
              ? `No library items matched "${searchQuery}".`
              : "You haven't acquired any digital products yet. Visit the catalog to get started."}
          </p>
          <Link
            href="/test/catalog"
            className="inline-flex px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Browse Digital Catalog
          </Link>
        </div>
      )}

      {/* Product Shelf Grid */}
      {!loading && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.entitlementId}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ACTIVE
                  </span>
                  <span>v{item.product.version}</span>
                </div>

                <div>
                  <h3 className="font-bold text-white text-base line-clamp-1">
                    {item.product.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Purchased on {new Date(item.purchasedAt).toLocaleDateString()}
                  </p>
                </div>

                {item.file && (
                  <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-800 text-xs text-slate-300">
                    <div className="truncate font-mono text-[11px] text-slate-200">
                      📄 {item.file.filename}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {(item.file.fileSize / 1024 / 1024).toFixed(2)} MB · Unlimited Access
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col gap-2">
                {item.file ? (
                  <a
                    href={`/api/v1/buyer/downloads/${item.file.id}/url`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-center py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>⬇️</span> Download File
                  </a>
                ) : (
                  <button
                    disabled
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 text-slate-500 text-xs font-semibold cursor-not-allowed"
                  >
                    No File Available
                  </button>
                )}

                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => {
                      setReviewingProduct(item);
                      setReviewTitle("");
                      setReviewComment("");
                      setRating(5);
                    }}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-center font-medium"
                  >
                    ⭐ Write Review
                  </button>
                  <Link
                    href={`/dashboard/orders/${item.orderId}`}
                    className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-center font-medium"
                  >
                    Receipt / Order
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal Form */}
      {reviewingProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="font-bold text-white text-base">
                Review: {reviewingProduct.product.title}
              </h2>
              <button
                onClick={() => setReviewingProduct(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Rating (1 to 5 Stars)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-xl p-1 transition-transform ${
                        star <= rating ? "scale-110" : "opacity-40"
                      }`}
                    >
                      ⭐
                    </button>
                  ))}
                  <span className="ml-2 font-bold text-amber-400">{rating} of 5 Stars</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Review Headline</label>
                <input
                  type="text"
                  placeholder="e.g. Excellent digital assets and clean code"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Your Detailed Feedback</label>
                <textarea
                  rows={4}
                  placeholder="Write your honest review based on your experience..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                  minLength={5}
                  maxLength={2000}
                ></textarea>
              </div>

              {reviewStatus && (
                <div className="p-2.5 rounded-lg bg-slate-800 text-xs font-medium">
                  {reviewStatus}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReviewingProduct(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50"
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
