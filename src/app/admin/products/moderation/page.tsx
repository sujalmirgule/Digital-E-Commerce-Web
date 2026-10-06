"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminAuth } from "../../AdminAuthContext";
import {
  ShieldCheck,
  ShieldAlert,
  Package,
  Store,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Tag,
  DollarSign,
  FileText,
  Calendar,
  Layers,
} from "lucide-react";

interface ModerationProduct {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  productType: string;
  pricePaise: number;
  discountPricePaise: number | null;
  isFree: boolean;
  licenseType: string;
  version: string | null;
  tags: string[];
  fileFormats: string[];
  demoUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  seller: {
    id: string;
    userId: string;
    storeName: string;
    storeSlug: string;
    user: {
      fullName: string;
      email: string;
    };
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  files: Array<{
    id: string;
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    version: string;
  }>;
}

export default function AdminProductModerationPage() {
  const { token, user: currentAdmin } = useAdminAuth();
  const [products, setProducts] = useState<ModerationProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetProduct, setTargetProduct] = useState<ModerationProduct | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchModerationQueue = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/v1/admin/products/moderation", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load moderation queue");
      }
      setProducts(data.data.products || []);
    } catch (err: any) {
      setError(err.message || "Failed to load moderation queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchModerationQueue();
    }
  }, [token]);

  const handleApprove = async (product: ModerationProduct) => {
    if (!token) return;
    if (product.seller.userId === currentAdmin?.id) {
      setError("Self-approval forbidden: You cannot approve products from your own seller store.");
      return;
    }

    try {
      setActionLoadingId(product.id);
      setError(null);
      const res = await fetch(`/api/v1/admin/products/${product.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to approve product");
      }
      setSuccess(`Product '${product.title}' has been successfully approved and published.`);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (err: any) {
      setError(err.message || "Failed to approve product");
    } finally {
      setActionLoadingId(null);
    }
  };

  const openRejectModal = (product: ModerationProduct) => {
    if (product.seller.userId === currentAdmin?.id) {
      setError("Self-rejection forbidden: You cannot moderate products from your own store.");
      return;
    }
    setTargetProduct(product);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !targetProduct) return;
    if (!rejectionReason.trim()) {
      setError("A rejection reason is mandatory.");
      return;
    }

    try {
      setActionLoadingId(targetProduct.id);
      setError(null);
      const res = await fetch(`/api/v1/admin/products/${targetProduct.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to reject product");
      }
      setSuccess(`Product '${targetProduct.title}' has been rejected.`);
      setProducts((prev) => prev.filter((p) => p.id !== targetProduct.id));
      setRejectModalOpen(false);
      setTargetProduct(null);
      setRejectionReason("");
    } catch (err: any) {
      setError(err.message || "Failed to reject product");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif text-[#F7EFE2] flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-[#F43F5E]" />
            <span>Product Moderation Queue</span>
          </h1>
          <p className="text-xs text-[#BBAE9F] mt-1">
            Review pending seller submissions before publishing them to the public catalog.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchModerationQueue}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs bg-[#211815] hover:bg-[#2B201C] border border-[#3A2930] text-[#E8D5B5] flex items-center gap-2 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Queue</span>
          </button>
          <Link
            href="/admin/products"
            className="px-3.5 py-2 rounded-xl text-xs bg-[#211815] hover:bg-[#2B201C] border border-[#3A2930] text-[#BBAE9F] hover:text-[#F7EFE2] transition"
          >
            All Products →
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Moderation List */}
      {loading ? (
        <div className="py-24 text-center text-[#BBAE9F]">
          <RefreshCw className="w-8 h-8 animate-spin text-[#F43F5E] mx-auto mb-3" />
          <p className="text-xs font-mono">Loading moderation queue from database...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center bg-[#211815] border border-[#3A2930] rounded-3xl p-8 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="font-serif text-lg text-[#F7EFE2]">Moderation Queue is Empty</h3>
          <p className="text-xs text-[#BBAE9F] max-w-md mx-auto">
            All submitted products have been reviewed. New seller submissions in PENDING_REVIEW status will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((p) => {
            const isSelf = p.seller.userId === currentAdmin?.id;
            const isActionLoading = actionLoadingId === p.id;
            return (
              <div
                key={p.id}
                className="bg-[#211815] border border-[#3A2930] hover:border-[#E8D5B5]/30 rounded-2xl p-5 sm:p-6 transition space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/40">
                        PENDING_REVIEW
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1B101B] text-[#E8D5B5] border border-[#3A2930]">
                        {p.category.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1B101B] text-[#BBAE9F] border border-[#3A2930]">
                        {p.productType}
                      </span>
                    </div>

                    <h2 className="text-lg font-serif text-[#F7EFE2] hover:text-[#E8D5B5] transition">
                      <Link href={`/admin/products/${p.id}`}>{p.title}</Link>
                    </h2>

                    {p.shortDescription && (
                      <p className="text-xs text-[#BBAE9F] leading-relaxed line-clamp-2">
                        {p.shortDescription}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#BBAE9F] pt-1">
                      <span className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-[#FB7185]" />
                        <Link
                          href={`/admin/sellers/${p.seller.id}`}
                          className="hover:underline text-[#E8D5B5]"
                        >
                          {p.seller.storeName}
                        </Link>
                      </span>
                      <span>•</span>
                      <span>
                        Seller: {p.seller.user.fullName} ({p.seller.user.email})
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-[#BBAE9F]" />
                        Submitted: {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Pricing & Asset Snapshot */}
                  <div className="flex flex-col lg:items-end justify-between gap-3 shrink-0">
                    <div className="text-left lg:text-right">
                      <div className="text-base font-serif text-[#F7EFE2]">
                        {p.isFree ? "Free" : `₹${(p.pricePaise / 100).toLocaleString()}`}
                      </div>
                      <span className="text-[10px] font-mono text-[#BBAE9F]">
                        {p.files.length} attached digital {p.files.length === 1 ? "file" : "files"}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="px-3 py-1.5 rounded-xl text-xs bg-[#2B201C] hover:bg-[#3A2930] border border-[#3A2930] text-[#E8D5B5] transition"
                      >
                        Inspect
                      </Link>
                      <button
                        onClick={() => openRejectModal(p)}
                        disabled={isActionLoading || isSelf}
                        className={`px-3 py-1.5 rounded-xl text-xs bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-800/40 transition ${
                          isSelf ? "opacity-40 cursor-not-allowed" : ""
                        }`}
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(p)}
                        disabled={isActionLoading || isSelf}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium bg-[#F43F5E] hover:bg-[#FB7185] text-white shadow-lg transition ${
                          isSelf ? "opacity-40 cursor-not-allowed" : ""
                        }`}
                      >
                        {isActionLoading ? "Publishing..." : "Approve & Publish"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Attached Files List */}
                {p.files.length > 0 && (
                  <div className="pt-3 border-t border-[#3A2930]/70 flex flex-wrap gap-2 text-[11px] font-mono text-[#BBAE9F]">
                    {p.files.map((f) => (
                      <span
                        key={f.id}
                        className="px-2.5 py-1 rounded-lg bg-[#1B101B] border border-[#3A2930] flex items-center gap-1.5"
                      >
                        <FileText className="w-3 h-3 text-[#FB7185]" />
                        <span>{f.fileName}</span>
                        <span className="text-[#BBAE9F]/60">
                          ({(f.fileSizeBytes / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && targetProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#211815] border border-[#3A2930] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800/40 text-rose-400 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-[#F7EFE2] text-base">Reject Product</h3>
                <p className="text-xs text-[#BBAE9F]">{targetProduct.title}</p>
              </div>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#BBAE9F] mb-1.5">
                  Rejection Reason (Required)
                </label>
                <textarea
                  rows={4}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this product is rejected (e.g. Broken download asset, copyright violation, incomplete description)..."
                  className="w-full text-xs p-3 bg-[#1B101B] border border-[#3A2930] rounded-xl text-[#F7EFE2] outline-none focus:border-[#E8D5B5] transition"
                />
              </div>

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  disabled={actionLoadingId !== null}
                  className="px-4 py-2 text-xs text-[#BBAE9F] hover:text-[#F7EFE2] rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId !== null || !rejectionReason.trim()}
                  className="px-4 py-2 text-xs font-medium bg-[#F43F5E] hover:bg-[#FB7185] text-white rounded-xl shadow-lg transition"
                >
                  {actionLoadingId !== null ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
