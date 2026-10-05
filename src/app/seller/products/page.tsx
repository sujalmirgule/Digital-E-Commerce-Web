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
    if (!confirm("Submit this product to marketplace administrators for review?")) return;
    setSubmittingId(productId);
    try {
      const res = await fetchWithAuth(`/api/v1/seller/products/${productId}/submit`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        alert("Product submitted for review successfully!");
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Product Catalog Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Create, update, inspect moderation status, and track sales for your digital items.
          </p>
        </div>

        <Link
          href="/seller/products/new"
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>➕</span> New Product
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
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
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === tab.value
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search by title or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse"></div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-200 text-sm">
          <span>⚠️ {error}</span>
          <button onClick={loadProducts} className="ml-3 underline hover:text-white">
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && products.length === 0 && (
        <div className="py-16 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8">
          <div className="text-4xl mb-3">📦</div>
          <h3 className="font-bold text-base text-white">No products found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            {statusFilter || search
              ? "No products matched your search or status filter."
              : "You haven't created any products yet. Launch your first digital item now."}
          </p>
          <Link
            href="/seller/products/new"
            className="inline-flex px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
          >
            Create New Product
          </Link>
        </div>
      )}

      {/* Products Table */}
      {!loading && products.length > 0 && (
        <div className="space-y-3">
          {products.map((prod) => (
            <div
              key={prod.id}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-colors"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-white text-sm">{prod.title}</span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded ${
                      prod.status === "PUBLISHED"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : prod.status === "PENDING_REVIEW"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : prod.status === "REJECTED"
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : "bg-slate-700/60 text-slate-300"
                    }`}
                  >
                    {prod.status}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">v{prod.version}</span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-1">{prod.shortDescription}</p>

                {prod.rejectionReason && (
                  <div className="p-2 rounded bg-red-950/30 border border-red-800/40 text-[11px] text-red-300">
                    <strong>Moderation Feedback:</strong> {prod.rejectionReason}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                  <span>Price: <strong className="text-slate-200">₹{(prod.pricePaise / 100).toFixed(2)}</strong></span>
                  <span>Sales: <strong className="text-slate-200">{prod.salesCount}</strong></span>
                  <span>Files: <strong className="text-slate-200">{prod.filesCount}</strong></span>
                  {prod.ratingAvg > 0 && (
                    <span className="text-amber-400">★ {prod.ratingAvg} ({prod.reviewsCount})</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800 shrink-0">
                <Link
                  href={`/seller/products/${prod.id}`}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                >
                  Manage / Edit
                </Link>

                {prod.status === "DRAFT" && (
                  <button
                    onClick={() => handleSubmitForReview(prod.id)}
                    disabled={submittingId === prod.id}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
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
