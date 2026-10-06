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
  const [targetProductId, setTargetProductId] = useState<string | null>(null);
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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-velvet-plum text-velvet-cream-muted border border-velvet-border">
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
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] bg-velvet-plum text-velvet-cream-muted border border-velvet-border">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-velvet-border/80">
        <div>
          <h1 className="text-3xl font-serif font-normal text-velvet-cream-soft tracking-tight">
            Product Catalog Moderation
          </h1>
          <p className="text-velvet-cream-muted text-xs mt-1">
            Audit digital asset submissions, inspect deliverables, and moderate catalog listings.
          </p>
        </div>
        <button
          onClick={() => fetchProducts(page, statusFilter, search)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-velvet-cream bg-velvet-mocha border border-velvet-border rounded-xl hover:border-velvet-cream/40 transition-colors shadow-sm disabled:opacity-50"
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
        <div className="flex items-center gap-1.5 p-1 bg-velvet-mocha border border-velvet-border/80 rounded-xl overflow-x-auto">
          {[
            { label: "All Products", value: "ALL" },
            { label: "Pending Review", value: "PENDING_REVIEW" },
            { label: "Published", value: "PUBLISHED" },
            { label: "Draft", value: "DRAFT" },
            { label: "Rejected", value: "REJECTED" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                statusFilter === tab.value
                  ? "bg-velvet-rose text-white shadow-sm"
                  : "text-velvet-cream-muted hover:text-velvet-cream-soft hover:bg-velvet-plum/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-velvet-cream-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product title, seller..."
              className="text-xs pl-8 pr-3 py-2 bg-velvet-mocha border border-velvet-border rounded-xl text-velvet-cream placeholder-velvet-cream-muted/50 focus:outline-none focus:border-velvet-cream w-64"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-velvet-plum hover:bg-velvet-mocha-elevated text-velvet-cream border border-velvet-border rounded-xl text-xs font-medium transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Products Table */}
      <div className="bg-velvet-mocha border border-velvet-border/80 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-velvet-cream-muted">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-velvet-rose" />
            <p className="text-xs font-medium">Loading products register...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center text-velvet-cream-muted">
            <Package className="w-12 h-12 text-velvet-cream-muted/40 mx-auto mb-3" />
            <h3 className="font-serif text-base text-velvet-cream-soft">No Products Found</h3>
            <p className="text-xs text-velvet-cream-muted mt-1">Try modifying your filter or query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-velvet-plum/60 border-b border-velvet-border/80 text-[10px] font-medium text-velvet-cream-muted uppercase tracking-wider">
                  <th className="py-3 px-4">Product Title</th>
                  <th className="py-3 px-4">Creator</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Deliverables</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-velvet-border/50 text-xs">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-velvet-plum/40 transition-colors">
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-serif font-medium text-velvet-cream-soft truncate">{product.title}</div>
                      <div className="text-[11px] text-velvet-cream-muted flex items-center gap-1.5 mt-0.5">
                        <span>{product.category?.name || "General"}</span>
                        <span>•</span>
                        <Link
                          href={`/products/${product.slug}`}
                          target="_blank"
                          className="text-velvet-rose hover:text-velvet-rose-soft inline-flex items-center gap-0.5"
                        >
                          View catalog
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-velvet-cream-soft">
                      <div className="font-medium">{product.seller.storeName}</div>
                      <div className="text-[11px] text-velvet-cream-muted font-mono">/{product.seller.storeSlug}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-velvet-cream">
                      {formatRupee(product.pricePaise)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-velvet-cream-muted">
                      <span className="inline-flex items-center gap-1">
                        <FileArchive className="w-3.5 h-3.5 text-velvet-cream-muted" />
                        {product.filesCount} file(s)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(product.status)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span className="font-medium text-velvet-cream-soft">{product.ratingAvg.toFixed(1)}</span>
                        <span className="text-[11px] text-velvet-cream-muted">({product.reviewsCount})</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {product.status === "PENDING_REVIEW" ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleApprove(product.id, product.title)}
                            disabled={actionLoading}
                            className="px-3 py-1 text-[11px] font-medium bg-velvet-rose hover:bg-velvet-rose-soft text-white rounded-full transition shadow-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleOpenReject(product.id)}
                            disabled={actionLoading}
                            className="px-3 py-1 text-[11px] font-medium bg-velvet-plum hover:bg-velvet-mocha-elevated text-velvet-cream-muted hover:text-velvet-cream border border-velvet-border rounded-full transition"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-velvet-cream-muted/60">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-velvet-border/80 flex items-center justify-between text-xs text-velvet-cream-muted bg-velvet-plum/40">
            <span>
              Page {page} of {totalPages} ({totalCount} total products)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchProducts(page - 1, statusFilter, search)}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-velvet-plum hover:bg-velvet-mocha-elevated disabled:opacity-40 text-velvet-cream border border-velvet-border"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                onClick={() => fetchProducts(page + 1, statusFilter, search)}
                disabled={page >= totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-velvet-plum hover:bg-velvet-mocha-elevated disabled:opacity-40 text-velvet-cream border border-velvet-border"
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
          <div className="bg-velvet-mocha border border-velvet-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-serif font-medium text-velvet-cream-soft flex items-center gap-2">
              <XCircle className="w-5 h-5 text-velvet-rose" />
              Reject Product Submission
            </h3>
            <p className="text-xs text-velvet-cream-muted">
              Provide actionable moderation feedback explaining why this product cannot be published (e.g. missing preview assets or licensing conflict).
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Attached archive file is corrupted or documentation is incomplete."
              className="w-full text-xs p-3 bg-velvet-plum border border-velvet-border rounded-xl text-velvet-cream outline-none focus:border-velvet-cream"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                disabled={actionLoading}
                className="px-4 py-1.5 text-xs text-velvet-cream-muted hover:text-velvet-cream"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={actionLoading || !rejectionReason.trim()}
                className="px-4 py-1.5 text-xs font-medium bg-velvet-rose hover:bg-velvet-rose-soft text-white rounded-xl disabled:opacity-50 transition-colors shadow-sm"
              >
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
