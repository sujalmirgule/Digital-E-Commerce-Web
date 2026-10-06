"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSellerAuth } from "../SellerAuthContext";
import { SellerProductListItemDTO } from "@/lib/services/seller-dashboard";
import {
  Package,
  Plus,
  Search,
  ExternalLink,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
  Star,
  Layers,
} from "lucide-react";
import { formatPaise } from "@/lib/utils";

export default function SellerProductsPage() {
  const { token, isApproved, fetchWithAuth } = useSellerAuth();
  const [products, setProducts] = useState<SellerProductListItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Deletion Confirmation Modal State
  const [productToDelete, setProductToDelete] = useState<SellerProductListItemDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      setDeleting(true);
      const res = await fetchWithAuth(`/api/v1/seller/products/${productToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok) {
        // Optimistically remove from state
        setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
        setProductToDelete(null);
      } else {
        alert(`Deletion failed: ${json.error?.message || "Could not delete product"}`);
      }
    } catch {
      alert("Network error during product deletion");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#C8AA91]/60">
        <div>
          <h1 className="text-3xl sm:text-4xl font-sans font-extrabold text-[#151311] tracking-tight">
            Product Management
          </h1>
          <p className="text-[#684332] text-xs sm:text-sm mt-1">
            Build, edit, submit for curation review, and safely manage active catalog inventory.
          </p>
        </div>

        <Link
          href="/seller/products/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3B261C] hover:bg-[#684332] active:bg-[#211D1A] text-[#FAF7F2] text-xs font-extrabold uppercase tracking-wider shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-[#C46A4A]" />
          <span>New Product</span>
        </Link>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#FFFFFF] border border-[#C8AA91]/60 p-1.5 rounded-2xl text-xs">
          {[
            { label: "All Active", value: "" },
            { label: "Published", value: "PUBLISHED" },
            { label: "In Review", value: "PENDING_REVIEW" },
            { label: "Drafts", value: "DRAFT" },
            { label: "Rejected", value: "REJECTED" },
            { label: "Archived", value: "ARCHIVED" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                statusFilter === tab.value
                  ? "bg-[#3B261C] text-[#FAF7F2] shadow-xs"
                  : "text-[#684332] hover:text-[#151311] hover:bg-[#F2E7DB]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A6048]" />
          <input
            type="text"
            placeholder="Search by title or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-[#FFFFFF] border border-[#C8AA91]/60 text-[#151311] placeholder-[#8A6048]/70 focus:outline-none focus:border-[#3B261C] transition-colors font-medium"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#A94432] text-[#A94432] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={loadProducts} className="px-3 py-1 bg-[#FAF7F2] border border-[#A94432] rounded-lg text-xs font-bold">
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-[#FFFFFF] border border-[#C8AA91]/50 rounded-2xl p-5" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && products.length === 0 && (
        <div className="py-20 text-center bg-[#FFFFFF] border border-dashed border-[#C8AA91] rounded-3xl p-8 max-w-lg mx-auto">
          <Package className="w-12 h-12 text-[#C8AA91] mx-auto mb-3" />
          <h3 className="font-sans text-lg font-bold text-[#151311]">No products found</h3>
          <p className="text-xs text-[#684332] max-w-sm mx-auto mt-1 mb-6 font-normal">
            {statusFilter || search
              ? "No items match your active search query or filter."
              : "You haven't listed any digital products yet. Start selling to collectors and builders."}
          </p>
          <Link
            href="/seller/products/new"
            className="inline-flex px-6 py-2.5 rounded-xl bg-[#3B261C] text-[#FAF7F2] text-xs font-bold uppercase tracking-wider hover:bg-[#684332] transition-colors"
          >
            Create First Product →
          </Link>
        </div>
      )}

      {/* Product List Cards */}
      {!loading && products.length > 0 && (
        <div className="space-y-4">
          {products.map((prod) => (
            <div
              key={prod.id}
              className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#C8AA91]/60 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-[#3B261C] transition-all shadow-[0_2px_8px_rgba(59,38,28,0.04)]"
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* Product Thumbnail Image */}
                <div className="relative w-24 h-16 sm:w-28 sm:h-20 rounded-xl overflow-hidden bg-[#F2E7DB] border border-[#C8AA91]/50 shrink-0">
                  {prod.thumbnailUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={prod.thumbnailUrl}
                      alt={prod.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#8A6048]">
                      <Layers className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-sans font-bold text-base text-[#151311] truncate max-w-md">
                      {prod.title}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-md tracking-wider ${
                        prod.status === "PUBLISHED"
                          ? "bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]"
                          : prod.status === "PENDING_REVIEW"
                          ? "bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3]"
                          : prod.status === "REJECTED"
                          ? "bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF]"
                          : prod.status === "ARCHIVED"
                          ? "bg-[#F2E7DB] text-[#8A6048] border border-[#C8AA91]"
                          : "bg-[#F2E7DB] text-[#3B261C] border border-[#C8AA91]"
                      }`}
                    >
                      {prod.status}
                    </span>
                    <span className="text-[11px] text-[#8A6048] font-mono">v{prod.version}</span>
                  </div>

                  <p className="text-xs text-[#684332] line-clamp-1 font-normal">
                    {prod.shortDescription}
                  </p>

                  {prod.rejectionReason && (
                    <div className="p-2.5 rounded-xl bg-[#FCE8E6] border border-[#FAD2CF] text-xs text-[#C5221F]">
                      <strong>Curation Feedback:</strong> {prod.rejectionReason}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#8A6048] pt-1 font-medium">
                    <span>
                      Price: <strong className="text-[#151311] font-bold">{formatPaise(prod.pricePaise)}</strong>
                    </span>
                    <span>
                      Sales: <strong className="text-[#151311] font-bold">{prod.salesCount}</strong>
                    </span>
                    <span>
                      Digital Files: <strong className="text-[#151311] font-bold">{prod.filesCount}</strong>
                    </span>
                    {prod.ratingAvg > 0 && (
                      <span className="text-[#151311] font-bold flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-[#C46A4A] text-[#C46A4A]" />
                        <span>{prod.ratingAvg}</span>
                        <span className="text-[#8A6048] font-normal">({prod.reviewsCount})</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons: View, Edit, Submit, Delete */}
              <div className="flex flex-wrap items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-[#E6DBD1] shrink-0">
                {prod.status === "PUBLISHED" && (
                  <Link
                    href={`/products/${prod.slug}`}
                    target="_blank"
                    className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#C8AA91]/70 hover:border-[#3B261C] text-[#3B261C] hover:text-[#151311] transition-all"
                    title="View Public Page"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                )}

                <Link
                  href={`/seller/products/${prod.id}/edit`}
                  className="px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#C8AA91]/70 hover:border-[#3B261C] text-[#3B261C] hover:text-[#151311] text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </Link>

                {prod.status === "DRAFT" && (
                  <button
                    onClick={() => handleSubmitForReview(prod.id)}
                    disabled={submittingId === prod.id}
                    className="px-4 py-2 rounded-xl bg-[#3B261C] hover:bg-[#684332] text-[#FAF7F2] text-xs font-extrabold uppercase tracking-wider transition-colors disabled:opacity-50"
                  >
                    {submittingId === prod.id ? "Submitting..." : "Submit for Review"}
                  </button>
                )}

                {/* Safe Delete / Archive Trigger */}
                {prod.status !== "ARCHIVED" && (
                  <button
                    onClick={() => setProductToDelete(prod)}
                    className="p-2.5 rounded-xl border border-[#C8AA91]/60 text-[#8A6048] hover:text-[#A94432] hover:bg-[#A94432]/10 transition-colors"
                    title="Delete / Archive Product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================== */}
      {/* DELETE CONFIRMATION MODAL (Strictly Required by Specification) */}
      {/* ============================================================== */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151311]/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-[#FFFFFF] border border-[#C8AA91] p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6DBD1]">
              <div className="flex items-center gap-2 text-[#A94432]">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h3 className="font-sans text-lg font-bold text-[#151311]">
                  Delete this product?
                </h3>
              </div>
              <button
                onClick={() => setProductToDelete(null)}
                className="text-[#8A6048] hover:text-[#151311]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#684332] leading-relaxed">
              <p>
                Are you sure you want to delete <strong className="text-[#151311]">&quot;{productToDelete.title}&quot;</strong>?
              </p>
              <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#C8AA91]/60 space-y-1.5 text-[11px]">
                <p className="font-bold text-[#3B261C]">✓ Historical Data Protection:</p>
                <p>
                  This will safely remove the product from active marketplace listings. All past orders, customer purchase entitlements, and transaction ledgers remain intact.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-[#C8AA91] text-[#3B261C] hover:bg-[#F2E7DB] text-xs font-bold transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl bg-[#A94432] hover:bg-[#843224] text-[#FFFFFF] text-xs font-bold transition-colors disabled:opacity-50"
              >
                {deleting ? "Archiving..." : "Delete / Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
