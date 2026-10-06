"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSellerAuth } from "../SellerAuthContext";
import { SellerProductListItemDTO } from "@/lib/services/seller-dashboard";

export default function SellerProductsPage() {
  const { token, isApproved, fetchWithAuth } = useSellerAuth();
  const [products, setProducts] = useState<SellerProductListItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    if (!token || !isApproved) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetchWithAuth(`/api/v1/seller/products?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.data?.products) {
        setProducts(json.data.products);
      } else {
        setError(json.error?.message || "Failed to load seller products");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [token, isApproved, statusFilter, search, fetchWithAuth]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSubmitForReview = async (productId: string) => {
    if (!confirm("Submit this product to marketplace curation for verification?")) return;
    setSubmittingId(productId);
    try {
      const res = await fetchWithAuth(`/api/v1/seller/products/${productId}/submit`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        alert("Product submitted for moderation review successfully!");
        loadProducts();
      } else {
        alert(`Submission failed: ${json.error?.message || "Ensure files and details are complete."}`);
      }
    } catch {
      alert("Network error submitting product");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-velvet-border/80">
        <div>
          <h1 className="text-3xl font-serif font-normal text-velvet-cream-soft tracking-tight">
            Creator Product Inventory
          </h1>
          <p className="text-velvet-cream-muted text-xs mt-1">
            Build, publish, inspect curation status, and track sales performance for your digital products.
          </p>
        </div>

        <Link
          href="/seller/products/new"
          className="px-5 py-2.5 rounded-full bg-velvet-rose hover:bg-velvet-rose-soft text-white text-xs font-semibold shadow-md shadow-velvet-rose/20 transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>+</span> Add Product
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-velvet-mocha border border-velvet-border/80 p-1 rounded-xl text-xs">
          {[
            { label: "All", value: "" },
            { label: "Published", value: "PUBLISHED" },
            { label: "In Review", value: "PENDING_REVIEW" },
            { label: "Drafts", value: "DRAFT" },
            { label: "Rejected", value: "REJECTED" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all text-xs ${
                statusFilter === tab.value
                  ? "bg-velvet-rose text-white shadow-sm"
                  : "text-velvet-cream-muted hover:text-velvet-cream-soft hover:bg-velvet-plum/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search by title or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 text-xs rounded-xl bg-velvet-mocha border border-velvet-border text-velvet-cream placeholder-velvet-cream-muted/50 focus:outline-none focus:border-velvet-cream/60 transition-colors"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3.5 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-velvet-mocha border border-velvet-border/80 rounded-2xl p-4"></div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-velvet-mocha border border-rose-900/50 text-rose-200 text-sm flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={loadProducts} className="px-3 py-1 bg-velvet-rose text-white rounded-lg text-xs font-medium">
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && products.length === 0 && (
        <div className="py-20 text-center bg-velvet-mocha/40 border border-velvet-border/80 rounded-3xl p-8 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-velvet-plum border border-velvet-border flex items-center justify-center text-xl mx-auto mb-3">
            📦
          </div>
          <h3 className="font-serif text-base text-velvet-cream-soft">No products found</h3>
          <p className="text-xs text-velvet-cream-muted max-w-sm mx-auto mt-1 mb-6">
            {statusFilter || search
              ? "No items matched your search query or curation filter."
              : "You haven't listed any digital products yet. Start selling to collectors."}
          </p>
          <Link
            href="/seller/products/new"
            className="inline-flex px-5 py-2.5 rounded-full bg-velvet-rose hover:bg-velvet-rose-soft text-white text-xs font-semibold shadow-md transition-colors"
          >
            Create First Product →
          </Link>
        </div>
      )}

      {/* Products Table */}
      {!loading && products.length > 0 && (
        <div className="space-y-3.5">
          {products.map((prod) => (
            <div
              key={prod.id}
              className="p-5 rounded-2xl bg-velvet-mocha border border-velvet-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-velvet-cream/40 transition-all shadow-sm"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-serif font-medium text-velvet-cream-soft text-base">{prod.title}</span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full tracking-wider ${
                      prod.status === "PUBLISHED"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        : prod.status === "PENDING_REVIEW"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                        : prod.status === "REJECTED"
                        ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                        : "bg-velvet-plum text-velvet-cream-muted border border-velvet-border"
                    }`}
                  >
                    {prod.status}
                  </span>
                  <span className="text-[11px] text-velvet-cream-muted/70 font-mono">v{prod.version}</span>
                </div>

                <p className="text-xs text-velvet-cream-muted line-clamp-1">{prod.shortDescription}</p>

                {prod.rejectionReason && (
                  <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-800/40 text-[11px] text-rose-300">
                    <strong>Moderation Feedback:</strong> {prod.rejectionReason}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-velvet-cream-muted pt-1">
                  <span>Price: <strong className="text-velvet-cream font-mono">₹{(prod.pricePaise / 100).toFixed(2)}</strong></span>
                  <span>Sales: <strong className="text-velvet-cream-soft">{prod.salesCount}</strong></span>
                  <span>Files: <strong className="text-velvet-cream-soft">{prod.filesCount}</strong></span>
                  {prod.ratingAvg > 0 && (
                    <span className="text-amber-400">★ {prod.ratingAvg} ({prod.reviewsCount})</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-velvet-border/60 shrink-0">
                <Link
                  href={`/seller/products/${prod.id}`}
                  className="px-3.5 py-1.5 rounded-xl bg-velvet-plum hover:bg-velvet-mocha-elevated text-velvet-cream border border-velvet-border hover:border-velvet-cream/40 text-xs font-medium transition-all"
                >
                  Manage / Edit
                </Link>

                {prod.status === "DRAFT" && (
                  <button
                    onClick={() => handleSubmitForReview(prod.id)}
                    disabled={submittingId === prod.id}
                    className="px-4 py-1.5 rounded-xl bg-velvet-rose hover:bg-velvet-rose-soft text-white text-xs font-medium transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {submittingId === prod.id ? "Submitting..." : "Submit for Review"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
