"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAdminAuth } from "../AdminAuthContext";
import {
  Package,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Star,
  FileArchive,
} from "lucide-react";

interface ProductItem {
  id: string;
  title: string;
  slug: string;
  pricePaise: number;
  discountPricePaise: number | null;
  status: string;
  rejectionReason: string | null;
  category: { id: string; name: string };
  seller: { id: string; storeName: string; storeSlug: string };
  ratingAvg: number;
  reviewsCount: number;
  filesCount: number;
  createdAt: string;
}

export default function AdminProductsPage() {
  const { token } = useAdminAuth();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Moderation state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetProductId, setTargetProductId] = useState<string | null>(null);
  const [targetProductTitle, setTargetProductTitle] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProducts = useCallback(async (p = page, s = statusFilter, q = search) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", "15");
      if (s !== "ALL") params.set("status", s);
      if (q.trim()) params.set("search", q.trim());

      const res = await fetch(`/api/v1/admin/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load products register");
      }
      setProducts(data.data.products || []);
      setTotalPages(data.data.pagination?.totalPages || 1);
      setTotalCount(data.data.pagination?.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [token, page, statusFilter, search]);

  useEffect(() => {
    if (token) {
      fetchProducts(1, statusFilter, search);
    }
  }, [token, statusFilter, fetchProducts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts(1, statusFilter, search);
  };

  const handleApprove = async (productId: string, title: string) => {
    if (!token) return;
    if (!confirm(`Are you sure you want to approve and publish "${title}"?`)) return;
    try {
      setActionLoading(true);
      setError(null);
      setActionSuccess(null);
      const res = await fetch(`/api/v1/admin/products/${productId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Approval failed");
      }
      setActionSuccess(`"${title}" has been approved and published to the marketplace.`);
      fetchProducts(page, statusFilter, search);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to approve product");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (productId: string) => {
    setTargetProductId(productId);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!token || !targetProductId) return;
    if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
      alert("Please provide a rejection reason (minimum 5 characters).");
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      setActionSuccess(null);
      const res = await fetch(`/api/v1/admin/products/${targetProductId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Rejection failed");
      }
      setRejectModalOpen(false);
      setActionSuccess("Product has been rejected with feedback.");
      fetchProducts(page, statusFilter, search);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reject product");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDelete = (productId: string, title: string) => {
    setTargetProductId(productId);
    setTargetProductTitle(title);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!token || !targetProductId) return;
    try {
      setActionLoading(true);
      setError(null);
      setActionSuccess(null);
      const res = await fetch(`/api/v1/admin/products/${targetProductId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to remove product");
      }
      setDeleteModalOpen(false);
      setActionSuccess(`Product "${targetProductTitle}" was successfully removed and archived.`);
      fetchProducts(page, statusFilter, search);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove product");
    } finally {
      setActionLoading(false);
    }
  };

  const formatRupee = (paise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(paise / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Published
          </span>
        );
      case "PENDING_REVIEW":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
            Pending Moderation
          </span>
        );
      case "DRAFT":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-stone-700/40 text-stone-300 border border-stone-600/40">
            Draft
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      case "ARCHIVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-500/15 text-zinc-400 border border-zinc-500/20">
            Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] bg-stone-700/40 text-stone-300 border border-stone-600/40">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3B261C]/20 dark:border-stone-800">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#151311] dark:text-[#FAF7F2] tracking-tight">
            Product Catalog Moderation
          </h1>
          <p className="text-[#8A6048] dark:text-[#C8AA91] text-xs mt-1">
            Audit digital asset submissions, inspect deliverables, and safely moderate or archive catalog listings.
          </p>
        </div>
        <button
          onClick={() => fetchProducts(page, statusFilter, search)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#3B261C] dark:text-[#F2E7DB] bg-white dark:bg-[#211D1A] border border-[#C8AA91]/60 dark:border-stone-700 rounded-xl hover:border-[#3B261C] transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-900/50 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-900/50 rounded-2xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 rounded-xl overflow-x-auto">
          {[
            { label: "All Products", value: "ALL" },
            { label: "Pending Review", value: "PENDING_REVIEW" },
            { label: "Published", value: "PUBLISHED" },
            { label: "Draft", value: "DRAFT" },
            { label: "Rejected", value: "REJECTED" },
            { label: "Archived", value: "ARCHIVED" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === tab.value
                  ? "bg-[#3B261C] text-[#FAF7F2] shadow-sm"
                  : "text-[#684332] dark:text-[#C8AA91] hover:text-[#151311] dark:hover:text-[#FAF7F2] hover:bg-stone-200/60 dark:hover:bg-stone-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8A6048] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product title, seller..."
              className="text-xs pl-8 pr-3 py-2 bg-white dark:bg-[#211D1A] border border-stone-300 dark:border-stone-700 rounded-xl text-[#151311] dark:text-[#FAF7F2] placeholder-[#8A6048]/60 focus:outline-none focus:border-[#3B261C] w-64"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-[#3B261C] text-[#FAF7F2] hover:bg-[#684332] rounded-xl text-xs font-semibold transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-[#8A6048]">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#A94432]" />
            <p className="text-xs font-medium">Loading products register...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center text-[#8A6048]">
            <Package className="w-12 h-12 text-[#8A6048]/40 mx-auto mb-3" />
            <h3 className="font-serif text-base font-bold text-[#151311] dark:text-[#FAF7F2]">No Products Found</h3>
            <p className="text-xs text-[#8A6048] mt-1">Try modifying your filter or query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 text-[10px] font-bold text-[#8A6048] uppercase tracking-wider">
                  <th className="py-3 px-4">Product Title</th>
                  <th className="py-3 px-4">Creator</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Deliverables</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4 text-right">Moderation & Removal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors">
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-serif font-bold text-[#151311] dark:text-[#FAF7F2] truncate">{product.title}</div>
                      <div className="text-[11px] text-[#8A6048] flex items-center gap-1.5 mt-0.5">
                        <span>{product.category?.name || "General"}</span>
                        <span>•</span>
                        <Link
                          href={`/products/${product.slug}`}
                          target="_blank"
                          className="text-[#A94432] hover:text-[#C46A4A] inline-flex items-center gap-0.5"
                        >
                          View catalog
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-[#151311] dark:text-[#FAF7F2]">
                      <div className="font-semibold">{product.seller.storeName}</div>
                      <div className="text-[11px] text-[#8A6048] font-mono">/{product.seller.storeSlug}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-[#151311] dark:text-[#FAF7F2]">
                      {formatRupee(product.pricePaise)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-[#8A6048]">
                      <span className="inline-flex items-center gap-1">
                        <FileArchive className="w-3.5 h-3.5 text-[#8A6048]" />
                        {product.filesCount} file(s)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(product.status)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-amber-500" />
                        <span className="font-bold text-[#151311] dark:text-[#FAF7F2]">{product.ratingAvg.toFixed(1)}</span>
                        <span className="text-[11px] text-[#8A6048]">({product.reviewsCount})</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {product.status === "PENDING_REVIEW" && (
                          <>
                            <button
                              onClick={() => handleApprove(product.id, product.title)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenReject(product.id)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-300 transition"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {product.status !== "ARCHIVED" ? (
                          <button
                            onClick={() => handleOpenDelete(product.id, product.title)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 text-[11px] font-semibold text-[#A94432] bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-lg hover:bg-rose-100 transition"
                          >
                            Remove
                          </button>
                        ) : (
                          <span className="text-[11px] text-zinc-500 italic">Archived</span>
                        )}
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
          <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-[#8A6048] bg-stone-50 dark:bg-stone-900">
            <span>
              Page {page} of {totalPages} ({totalCount} total products)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchProducts(page - 1, statusFilter, search)}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 disabled:opacity-40 text-[#151311] dark:text-[#FAF7F2] border border-stone-200 dark:border-stone-700 font-semibold"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                onClick={() => fetchProducts(page + 1, statusFilter, search)}
                disabled={page >= totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 disabled:opacity-40 text-[#151311] dark:text-[#FAF7F2] border border-stone-200 dark:border-stone-700 font-semibold"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-serif font-bold text-[#151311] dark:text-[#FAF7F2] flex items-center gap-2">
              <XCircle className="w-5 h-5 text-[#A94432]" />
              Reject Product Submission
            </h3>
            <p className="text-xs text-[#8A6048] dark:text-[#C8AA91]">
              Provide actionable moderation feedback explaining why this product cannot be published (e.g. missing preview assets or licensing conflict).
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Attached archive file is corrupted or documentation is incomplete."
              className="w-full text-xs p-3 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl text-[#151311] dark:text-[#FAF7F2] outline-none focus:border-[#3B261C]"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                disabled={actionLoading}
                className="px-4 py-1.5 text-xs text-[#8A6048] hover:text-[#151311] font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={actionLoading || !rejectionReason.trim()}
                className="px-4 py-1.5 text-xs font-semibold bg-[#A94432] hover:bg-[#8A3626] text-white rounded-xl disabled:opacity-50 transition-colors shadow-sm"
              >
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Delete / Archive Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#211D1A] border border-stone-300 dark:border-stone-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-[#A94432] shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-[#151311] dark:text-[#FAF7F2]">
                  Remove & Archive Product?
                </h3>
                <p className="text-xs text-[#8A6048] dark:text-[#C8AA91] mt-0.5">
                  Are you sure you want to remove &quot;{targetProductTitle}&quot;?
                </p>
              </div>
            </div>

            <div className="bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl p-3 text-xs text-[#684332] dark:text-[#C8AA91] leading-relaxed">
              <strong className="block text-[#151311] dark:text-[#FAF7F2] mb-1">Marketplace Safe Archive Policy:</strong>
              This will remove the product from active marketplace search and category discovery. Historical customer purchase records, seller earnings, platform ledgers, and existing buyer download entitlements remain permanently preserved.
            </div>

            <div className="flex justify-end items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-[#8A6048] hover:text-[#151311] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold bg-[#A94432] hover:bg-[#8A3626] text-white rounded-xl shadow-sm transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Removing..." : "Remove & Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
