"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (fileId: string) => {
    try {
      setDownloadingId(fileId);
      const res = await fetchWithAuth(`/api/v1/buyer/downloads/${fileId}/url`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.data?.downloadUrl) {
        window.open(json.data.downloadUrl, "_blank");
      } else {
        const direct = `/api/v1/buyer/downloads/${fileId}/url`;
        const fallback = token ? `${direct}?token=${encodeURIComponent(token)}` : direct;
        window.open(fallback, "_blank");
      }
    } catch {
      const direct = `/api/v1/buyer/downloads/${fileId}/url`;
      const fallback = token ? `${direct}?token=${encodeURIComponent(token)}` : direct;
      window.open(fallback, "_blank");
    } finally {
      setDownloadingId(null);
    }
  };

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
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-velvet-border/80">
        <div>
          <h1 className="text-3xl font-serif font-normal text-velvet-cream-soft tracking-tight">
            Digital Vault & Library
          </h1>
          <p className="text-velvet-cream-muted text-xs mt-1">
            All verified digital products, templates, and licenses provisioned to your account.
          </p>
        </div>

        {/* Search bar */}
        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search within your vault..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 text-xs rounded-xl bg-velvet-mocha border border-velvet-border text-velvet-cream placeholder-velvet-cream-muted/50 focus:outline-none focus:border-velvet-cream/60 transition-colors"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 bg-velvet-mocha border border-velvet-border/80 rounded-2xl"></div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-velvet-mocha border border-rose-900/50 text-rose-200 text-sm flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button
            onClick={loadLibrary}
            className="px-3 py-1 bg-velvet-rose text-white rounded-lg text-xs font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredItems.length === 0 && (
        <div className="py-20 text-center bg-velvet-mocha/40 border border-velvet-border/80 rounded-3xl p-8 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-velvet-plum border border-velvet-border flex items-center justify-center text-xl mx-auto mb-3">
            ✦
          </div>
          <h3 className="font-serif text-base text-velvet-cream-soft">Your vault is empty</h3>
          <p className="text-xs text-velvet-cream-muted max-w-sm mx-auto mt-1 mb-6">
            {searchQuery
              ? `No library items matched "${searchQuery}".`
              : "You haven't acquired any digital products yet. Visit the curated catalog to discover items."}
          </p>
          <Link
            href="/products"
            className="inline-flex px-5 py-2.5 rounded-full bg-velvet-rose hover:bg-velvet-rose-soft text-white text-xs font-semibold shadow-md transition-colors"
          >
            Browse Products →
          </Link>
        </div>
      )}

      {/* Product Shelf Grid */}
      {!loading && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.entitlementId}
              className="p-5 rounded-2xl bg-velvet-mocha border border-velvet-border/80 flex flex-col justify-between hover:border-velvet-cream/40 transition-all shadow-sm group"
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ACTIVE LICENSE
                  </span>
                  <span className="text-[11px] text-velvet-cream-muted">v{item.product.version}</span>
                </div>

                {item.product.thumbnailUrl && (
                  <div className="aspect-[16/9] rounded-xl overflow-hidden bg-velvet-plum relative border border-velvet-border/40">
                    <Image
                      src={item.product.thumbnailUrl}
                      alt={item.product.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}

                <div>
                  <h3 className="font-serif font-medium text-velvet-cream-soft text-base line-clamp-1">
                    {item.product.title}
                  </h3>
                  <p className="text-[11px] text-velvet-cream-muted mt-0.5">
                    Purchased on {new Date(item.purchasedAt).toLocaleDateString()}
                  </p>
                </div>

                {item.file && (
                  <div className="p-3 rounded-xl bg-velvet-plum/60 border border-velvet-border/60 text-xs">
                    <div className="truncate font-mono text-[11px] text-velvet-cream">
                      📄 {item.file.filename}
                    </div>
                    <div className="text-[10px] text-velvet-cream-muted mt-0.5">
                      {(item.file.fileSize / 1024 / 1024).toFixed(2)} MB · Unlimited Redownloads
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-5 pt-4 border-t border-velvet-border/60 flex flex-col gap-2">
                {item.file ? (
                  <button
                    onClick={() => handleDownload(item.file!.id)}
                    disabled={downloadingId === item.file.id}
                    className="w-full text-center py-2 px-3 rounded-xl bg-velvet-rose hover:bg-velvet-rose-soft text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <span>{downloadingId === item.file.id ? "⏳ Authorizing..." : "⬇️ Download Vault Asset"}</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-2 px-3 rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream-muted/50 text-xs font-medium cursor-not-allowed"
                  >
                    No Direct File
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
                    className="flex-1 py-1.5 px-2 rounded-xl bg-velvet-plum hover:bg-velvet-mocha-elevated text-velvet-cream border border-velvet-border hover:border-velvet-cream/40 transition-colors text-center font-medium"
                  >
                    ⭐ Review
                  </button>
                  <Link
                    href={`/dashboard/orders/${item.orderId}`}
                    className="py-1.5 px-3 rounded-xl bg-velvet-plum hover:bg-velvet-mocha-elevated text-velvet-cream border border-velvet-border hover:border-velvet-cream/40 transition-colors text-center font-medium"
                  >
                    Receipt
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal Form */}
      {reviewingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-velvet-mocha border border-velvet-border p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-velvet-border/70">
              <h2 className="font-serif font-medium text-velvet-cream-soft text-base">
                Review: {reviewingProduct.product.title}
              </h2>
              <button
                onClick={() => setReviewingProduct(null)}
                className="text-velvet-cream-muted hover:text-velvet-cream text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-velvet-cream-muted font-medium mb-1.5">Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-xl p-1 transition-transform ${
                        star <= rating ? "scale-110" : "opacity-30"
                      }`}
                    >
                      ⭐
                    </button>
                  ))}
                  <span className="ml-2 font-semibold text-velvet-cream">{rating} of 5 Stars</span>
                </div>
              </div>

              <div>
                <label className="block text-velvet-cream-muted font-medium mb-1">Headline</label>
                <input
                  type="text"
                  placeholder="e.g. Exceptional digital craftsmanship"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream placeholder-velvet-cream-muted/50 focus:outline-none focus:border-velvet-cream"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-velvet-cream-muted font-medium mb-1">Your Detailed Feedback</label>
                <textarea
                  rows={4}
                  placeholder="Write your honest assessment..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream placeholder-velvet-cream-muted/50 focus:outline-none focus:border-velvet-cream"
                  required
                  minLength={5}
                  maxLength={2000}
                ></textarea>
              </div>

              {reviewStatus && (
                <div className="p-3 rounded-xl bg-velvet-plum text-xs font-medium text-velvet-cream border border-velvet-border">
                  {reviewStatus}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-velvet-border/70">
                <button
                  type="button"
                  onClick={() => setReviewingProduct(null)}
                  className="px-4 py-2 rounded-xl bg-velvet-plum hover:bg-velvet-mocha-elevated text-velvet-cream-muted hover:text-velvet-cream font-medium border border-velvet-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2 rounded-xl bg-velvet-rose hover:bg-velvet-rose-soft text-white font-medium disabled:opacity-50 transition-colors"
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
