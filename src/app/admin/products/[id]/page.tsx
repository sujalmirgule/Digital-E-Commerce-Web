"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAdminAuth } from "../../AdminAuthContext";
import {
  Package,
  Store,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Calendar,
  DollarSign,
  FileText,
  Tag,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Layers,
  Lock,
} from "lucide-react";

interface AdminProductDetail {
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
  licenseTerms: string | null;
  version: string | null;
  tags: string[];
  fileFormats: string[];
  demoUrl: string | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  seller: {
    id: string;
    storeName: string;
    storeSlug: string;
    logoUrl: string | null;
    user: {
      id: string;
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
    createdAt: string;
  }>;
}

export default function AdminProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user: currentAdmin } = useAdminAuth();

  const [product, setProduct] = useState<AdminProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchProduct = async () => {
    if (!token || !id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/admin/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load product details");
      }
      setProduct(data.data.product);
    } catch (err: any) {
      setError(err.message || "Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && id) {
      fetchProduct();
    }
  }, [token, id]);

  const handleApprove = async () => {
    if (!token || !product) return;
    if (product.seller.user.id === currentAdmin?.id) {
      setError("Self-approval forbidden: You cannot approve products from your own store.");
      return;
    }

    try {
      setActionLoading(true);
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
      setSuccess("Product successfully approved and published.");
      setProduct((prev) => (prev ? { ...prev, status: "PUBLISHED", rejectionReason: null } : null));
    } catch (err: any) {
      setError(err.message || "Approval failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !product) return;
    if (!rejectionReason.trim()) {
      setError("Rejection reason is mandatory.");
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/admin/products/${product.id}/reject`, {
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
      setSuccess("Product rejected.");
      setProduct((prev) => (prev ? { ...prev, status: "REJECTED", rejectionReason: rejectionReason.trim() } : null));
      setRejectModalOpen(false);
      setRejectionReason("");
    } catch (err: any) {
      setError(err.message || "Rejection failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-[#BBAE9F]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#F43F5E] mb-3" />
        <p className="text-xs font-mono">Retrieving secure product inspection record...</p>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-xs text-[#BBAE9F] hover:text-[#F7EFE2] transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Products Directory
        </Link>
        <div className="p-6 bg-rose-950/40 border border-rose-900/50 rounded-2xl text-rose-300 space-y-2">
          <div className="flex items-center gap-2 font-medium text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <span>Product Inspection Error</span>
          </div>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const isPending = product.status === "PENDING_REVIEW";
  const isSelf = product.seller.user.id === currentAdmin?.id;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 text-xs text-[#BBAE9F] hover:text-[#E8D5B5] transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Products Directory
          </Link>
          <h1 className="text-2xl font-serif text-[#F7EFE2] flex items-center gap-3">
            <span>{product.title}</span>
            <span
              className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full ${
                product.status === "PUBLISHED"
                  ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40"
                  : product.status === "PENDING_REVIEW"
                  ? "bg-amber-950/60 text-amber-300 border border-amber-800/40"
                  : "bg-rose-950/60 text-rose-300 border border-rose-800/40"
              }`}
            >
              {product.status}
            </span>
          </h1>
          <p className="text-xs text-[#BBAE9F] font-mono mt-1">
            Product ID: {product.id} • Slug: /{product.slug}
          </p>
        </div>

        {/* Action Controls for Moderation */}
        {isPending && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRejectModalOpen(true)}
              disabled={actionLoading || isSelf}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-800/40 transition ${
                isSelf ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              Reject Product
            </button>
            <button
              onClick={handleApprove}
              disabled={actionLoading || isSelf}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium bg-[#F43F5E] hover:bg-[#FB7185] text-white shadow-lg transition ${
                isSelf ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              {actionLoading ? "Publishing..." : "Approve & Publish"}
            </button>
          </div>
        )}
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

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details (2 cols) */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[#211815] border border-[#3A2930] rounded-2xl p-6 space-y-4">
            <h2 className="text-xs font-mono uppercase text-[#E8D5B5] tracking-wider border-b border-[#3A2930] pb-2">
              Product Overview & Content
            </h2>
            <div className="space-y-4 text-xs">
              {product.shortDescription && (
                <div>
                  <span className="text-[#BBAE9F] block text-[11px]">Short Description</span>
                  <p className="text-[#F7EFE2] mt-0.5 leading-relaxed">{product.shortDescription}</p>
                </div>
              )}
              <div>
                <span className="text-[#BBAE9F] block text-[11px]">Full Description</span>
                <p className="text-[#F7EFE2] mt-0.5 whitespace-pre-wrap leading-relaxed">
                  {product.description || "No full description provided."}
                </p>
              </div>
              {product.demoUrl && (
                <div>
                  <span className="text-[#BBAE9F] block text-[11px]">Live Demonstration URL</span>
                  <a
                    href={product.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FB7185] hover:underline inline-flex items-center gap-1 font-mono text-xs mt-0.5"
                  >
                    <span>{product.demoUrl}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
              {product.rejectionReason && (
                <div className="p-3 bg-rose-950/40 border border-rose-900/40 rounded-xl">
                  <span className="text-rose-400 block text-[11px] font-medium">Rejection Reason</span>
                  <p className="text-rose-300 text-xs mt-1">{product.rejectionReason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Attached Files & Storage Safety */}
          <div className="bg-[#211815] border border-[#3A2930] rounded-2xl p-6 space-y-4">
            <h2 className="text-xs font-mono uppercase text-[#E8D5B5] tracking-wider border-b border-[#3A2930] pb-2 flex items-center justify-between">
              <span>Attached Digital Assets</span>
              <span className="text-[10px] text-[#BBAE9F] font-normal flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-400" /> Private Storage Protected
              </span>
            </h2>
            <div className="space-y-3">
              {product.files.length === 0 ? (
                <p className="text-xs text-[#BBAE9F]">No digital files attached to this product.</p>
              ) : (
                product.files.map((file) => (
                  <div
                    key={file.id}
                    className="p-3.5 bg-[#1B101B] border border-[#3A2930] rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-medium text-[#F7EFE2] flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#FB7185]" />
                        <span>{file.fileName}</span>
                      </div>
                      <div className="text-[11px] font-mono text-[#BBAE9F]">
                        {file.mimeType} • {(file.fileSizeBytes / 1024 / 1024).toFixed(2)} MB • Version {file.version}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                      Verified
                    </span>
                  </div>
                ))
              )}
              <p className="text-[11px] text-[#BBAE9F]/70 pt-2 border-t border-[#3A2930]/70">
                Storage keys, S3 credentials, and raw filesystem paths are stripped from admin API responses to prevent unauthorized access.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Metadata (1 col) */}
        <div className="space-y-6">
          {/* Commercial & Pricing */}
          <div className="bg-[#211815] border border-[#3A2930] rounded-2xl p-6 space-y-4">
            <h2 className="text-xs font-mono uppercase text-[#E8D5B5] tracking-wider border-b border-[#3A2930] pb-2">
              Commercial Terms
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#BBAE9F] block text-[11px]">Listing Price</span>
                <span className="text-lg font-serif text-[#F7EFE2]">
                  {product.isFree ? "Free" : `₹${(product.pricePaise / 100).toLocaleString()}`}
                </span>
              </div>
              {product.discountPricePaise && (
                <div>
                  <span className="text-[#BBAE9F] block text-[11px]">Discount Price</span>
                  <span className="text-[#FB7185] font-serif">
                    ₹{(product.discountPricePaise / 100).toLocaleString()}
                  </span>
                </div>
              )}
              <div>
                <span className="text-[#BBAE9F] block text-[11px]">License Type</span>
                <span className="font-mono text-[#E8D5B5]">{product.licenseType}</span>
              </div>
              <div>
                <span className="text-[#BBAE9F] block text-[11px]">Category</span>
                <span className="text-[#F7EFE2]">{product.category.name}</span>
              </div>
              <div>
                <span className="text-[#BBAE9F] block text-[11px]">Type</span>
                <span className="font-mono text-[#F7EFE2]">{product.productType}</span>
              </div>
            </div>
          </div>

          {/* Seller Snapshot */}
          <div className="bg-[#211815] border border-[#3A2930] rounded-2xl p-6 space-y-4">
            <h2 className="text-xs font-mono uppercase text-[#E8D5B5] tracking-wider border-b border-[#3A2930] pb-2">
              Seller Information
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#BBAE9F] block text-[11px]">Store Name</span>
                <span className="text-[#F7EFE2] font-medium">{product.seller.storeName}</span>
              </div>
              <div>
                <span className="text-[#BBAE9F] block text-[11px]">Store Slug</span>
                <span className="font-mono text-[#E8D5B5]">@{product.seller.storeSlug}</span>
              </div>
              <div>
                <span className="text-[#BBAE9F] block text-[11px]">Seller Name</span>
                <span className="text-[#F7EFE2]">{product.seller.user.fullName}</span>
              </div>
              <div>
                <span className="text-[#BBAE9F] block text-[11px]">Seller Email</span>
                <span className="font-mono text-[#BBAE9F]">{product.seller.user.email}</span>
              </div>
              <div className="pt-2">
                <Link
                  href={`/admin/sellers/${product.seller.id}`}
                  className="text-xs text-[#FB7185] hover:underline inline-flex items-center gap-1"
                >
                  <Store className="w-3.5 h-3.5" /> View Seller Profile →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#211815] border border-[#3A2930] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800/40 text-rose-400 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-[#F7EFE2] text-base">Reject Product Submission</h3>
                <p className="text-xs text-[#BBAE9F]">{product.title}</p>
              </div>
            </div>

            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#BBAE9F] mb-1.5">
                  Rejection Reason (Required)
                </label>
                <textarea
                  rows={4}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this product cannot be published..."
                  className="w-full text-xs p-3 bg-[#1B101B] border border-[#3A2930] rounded-xl text-[#F7EFE2] outline-none focus:border-[#E8D5B5] transition"
                />
              </div>

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs text-[#BBAE9F] hover:text-[#F7EFE2] rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="px-4 py-2 text-xs font-medium bg-[#F43F5E] hover:bg-[#FB7185] text-white rounded-xl shadow-lg transition"
                >
                  {actionLoading ? "Processing..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
