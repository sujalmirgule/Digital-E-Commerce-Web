"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSellerAuth } from "../../SellerAuthContext";
import {
  ArrowLeft,
  Edit3,
  FileText,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Tag,
  Package,
} from "lucide-react";

export default function SellerProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const { token, isApproved, fetchWithAuth } = useSellerAuth();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadProduct = useCallback(async () => {
    if (!token || !productId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithAuth(`/api/v1/seller/products/${productId}`);
      const json = await res.json();

      if (res.ok && json.data) {
        setProduct(json.data);
      } else {
        setError(json.error?.message || "Failed to load product details");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [token, productId, fetchWithAuth]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handleSubmitForReview = async () => {
    if (!confirm("Submit this product for marketplace review?")) return;
    setSubmittingReview(true);
    try {
      const res = await fetchWithAuth(`/api/v1/seller/products/${productId}/submit`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        alert("Product submitted for review!");
        loadProduct();
      } else {
        alert(`Submission failed: ${json.error?.message || "Ensure files and details are complete."}`);
      }
    } catch {
      alert("Network error submitting product");
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatRupee = (paise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(paise / 100);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-velvet-cream-muted">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-velvet-rose" />
        <p className="text-xs font-mono">Loading product record...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-8 rounded-3xl bg-velvet-mocha border border-velvet-border text-center space-y-4 max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-lg font-serif text-velvet-cream-soft">Access Denied or Not Found</h2>
        <p className="text-xs text-rose-300">{error || "Product not found"}</p>
        <Link
          href="/seller/products"
          className="inline-flex px-4 py-2 rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream text-xs font-medium"
        >
          ← Return to Inventory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-velvet-border/80">
        <div>
          <Link
            href="/seller/products"
            className="inline-flex items-center gap-1.5 text-xs text-velvet-cream-muted hover:text-velvet-cream transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Inventory</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-serif text-velvet-cream-soft tracking-tight">
              {product.title}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${
                product.status === "PUBLISHED"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                  : product.status === "PENDING_REVIEW"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                  : product.status === "REJECTED"
                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                  : "bg-velvet-plum text-velvet-cream-muted border border-velvet-border"
              }`}
            >
              {product.status}
            </span>
          </div>
          <p className="text-xs font-mono text-velvet-cream-muted mt-1">
            /{product.slug} · v{product.version} · Created {new Date(product.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {product.status === "DRAFT" && (
            <button
              onClick={handleSubmitForReview}
              disabled={submittingReview}
              className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {submittingReview ? "Submitting..." : "Submit for Moderation"}
            </button>
          )}
          {product.status === "PUBLISHED" && (
            <Link
              href={`/products/${product.slug}`}
              target="_blank"
              className="px-4 py-2 rounded-full bg-velvet-plum border border-velvet-border hover:border-velvet-cream text-velvet-cream text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public View</span>
            </Link>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-velvet-border/60 pb-3 text-xs font-mono">
        <span className="px-3 py-1.5 rounded-lg bg-velvet-rose text-white font-medium">
          Overview
        </span>
        <Link
          href={`/seller/products/${productId}/edit`}
          className="px-3 py-1.5 rounded-lg text-velvet-cream-muted hover:text-velvet-cream hover:bg-velvet-plum/60 transition-colors"
        >
          Edit Specifications
        </Link>
        <Link
          href={`/seller/products/${productId}/files`}
          className="px-3 py-1.5 rounded-lg text-velvet-cream-muted hover:text-velvet-cream hover:bg-velvet-plum/60 transition-colors"
        >
          Deliverable Files ({product.files?.length || 0})
        </Link>
        <Link
          href={`/seller/products/${productId}/moderation`}
          className="px-3 py-1.5 rounded-lg text-velvet-cream-muted hover:text-velvet-cream hover:bg-velvet-plum/60 transition-colors"
        >
          Moderation Status
        </Link>
      </div>

      {/* Moderation Feedback Banner if rejected */}
      {product.status === "REJECTED" && product.rejectionReason && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-sm">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Product Moderation Rejection Notice</span>
          </div>
          <p className="text-rose-200 bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/40 font-mono text-[11px]">
            {product.rejectionReason}
          </p>
          <div className="text-[11px] text-rose-400/80 pt-1 flex items-center gap-2">
            <span>Please make the required changes and resubmit for review.</span>
            <Link href={`/seller/products/${productId}/edit`} className="underline font-semibold">
              Edit Specifications →
            </Link>
          </div>
        </div>
      )}

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-velvet-mocha border border-velvet-border/80">
          <span className="text-[10px] font-mono uppercase text-velvet-cream-muted block">Catalog Price</span>
          <span className="text-xl font-serif text-velvet-cream-soft mt-1 block">
            {formatRupee(product.pricePaise)}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-velvet-mocha border border-velvet-border/80">
          <span className="text-[10px] font-mono uppercase text-velvet-cream-muted block">Total Sales</span>
          <span className="text-xl font-serif text-velvet-cream-soft mt-1 block">
            {product.salesCount ?? 0}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-velvet-mocha border border-velvet-border/80">
          <span className="text-[10px] font-mono uppercase text-velvet-cream-muted block">Average Rating</span>
          <span className="text-xl font-serif text-velvet-cream-soft mt-1 block">
            {product.ratingAvg ? `${product.ratingAvg} ★` : "New"}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-velvet-mocha border border-velvet-border/80">
          <span className="text-[10px] font-mono uppercase text-velvet-cream-muted block">Deliverable Files</span>
          <span className="text-xl font-serif text-velvet-cream-soft mt-1 block">
            {product.files?.length ?? 0}
          </span>
        </div>
      </div>

      {/* Specifications & Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Descriptions Card */}
          <section className="p-6 rounded-2xl bg-velvet-mocha border border-velvet-border space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-velvet-border/60">
              <h2 className="font-serif text-base text-velvet-cream-soft">Product Specifications</h2>
              <Link
                href={`/seller/products/${productId}/edit`}
                className="text-xs text-velvet-rose hover:text-velvet-rose-soft flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </Link>
            </div>
            <div>
              <h3 className="text-xs font-mono uppercase text-velvet-cream-muted">Excerpt</h3>
              <p className="text-xs text-velvet-cream mt-1 font-light">{product.shortDescription}</p>
            </div>
            <div>
              <h3 className="text-xs font-mono uppercase text-velvet-cream-muted">Full Description</h3>
              <div className="text-xs text-velvet-cream-muted mt-1 whitespace-pre-wrap leading-relaxed font-light">
                {product.description}
              </div>
            </div>
          </section>

          {/* Files Card */}
          <section className="p-6 rounded-2xl bg-velvet-mocha border border-velvet-border space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-velvet-border/60">
              <h2 className="font-serif text-base text-velvet-cream-soft flex items-center gap-2">
                <FileText className="w-4 h-4 text-velvet-cream" />
                <span>Deliverable Files ({product.files?.length || 0})</span>
              </h2>
              <Link
                href={`/seller/products/${productId}/files`}
                className="text-xs text-velvet-rose hover:text-velvet-rose-soft font-mono"
              >
                Manage Files →
              </Link>
            </div>

            {(!product.files || product.files.length === 0) ? (
              <div className="py-6 text-center text-xs text-velvet-cream-muted">
                No deliverables attached yet. Upload at least one file before requesting curation.
              </div>
            ) : (
              <div className="divide-y divide-velvet-border/60">
                {product.files.map((file: any) => (
                  <div key={file.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono text-velvet-cream-soft font-medium">{file.originalFilename}</div>
                      <div className="text-[10px] text-velvet-cream-muted font-mono">
                        {formatFileSize(file.fileSize)} · {file.mimeType} · v{file.version}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono border border-emerald-500/20">
                      READY
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <section className="p-5 rounded-2xl bg-velvet-mocha border border-velvet-border space-y-4 text-xs">
            <h3 className="font-serif text-sm text-velvet-cream-soft border-b border-velvet-border/60 pb-2">
              Metadata & Attributes
            </h3>

            <div>
              <span className="text-[10px] font-mono uppercase text-velvet-cream-muted block">Category</span>
              <span className="text-velvet-cream mt-0.5 block">{product.category?.name || "General"}</span>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-velvet-cream-muted block">Tags</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {Array.isArray(product.tags) && product.tags.length > 0 ? (
                  product.tags.map((t: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-velvet-plum text-velvet-cream-muted text-[10px]">
                      #{t}
                    </span>
                  ))
                ) : (
                  <span className="text-velvet-cream-muted">None</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-velvet-cream-muted block">File Formats</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {Array.isArray(product.fileFormats) && product.fileFormats.length > 0 ? (
                  product.fileFormats.map((f: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-velvet-plum text-velvet-cream font-mono text-[10px]">
                      {f}
                    </span>
                  ))
                ) : (
                  <span className="text-velvet-cream-muted">None specified</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-velvet-cream-muted block">Live Demo</span>
              {product.demoUrl ? (
                <a
                  href={product.demoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-velvet-rose hover:underline truncate block text-[11px] font-mono mt-0.5"
                >
                  {product.demoUrl}
                </a>
              ) : (
                <span className="text-velvet-cream-muted">None provided</span>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
