"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSellerAuth } from "../../../SellerAuthContext";
import {
  ArrowLeft,
  Clock,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

export default function SellerProductModerationPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const { token, isApproved, fetchWithAuth } = useSellerAuth();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

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
        setError(json.error?.message || "Failed to load moderation status");
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
    if (!confirm("Are you sure you want to submit this product for marketplace review?")) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await fetchWithAuth(`/api/v1/seller/products/${productId}/submit`, {
        method: "POST",
      });

      const json = await res.json();
      if (res.ok) {
        setSubmitSuccess("Product successfully submitted for curation review!");
        loadProduct();
      } else {
        setSubmitError(json.error?.message || "Submission failed. Ensure all checklist items are met.");
      }
    } catch {
      setSubmitError("Network error submitting product for moderation");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-velvet-cream-muted">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-velvet-rose" />
        <p className="text-xs font-mono">Loading curation records...</p>
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

  const hasTitle = Boolean(product.title && product.title.trim().length >= 3);
  const hasDescription = Boolean(product.description && product.description.trim().length >= 10);
  const hasPrice = Boolean(product.pricePaise && product.pricePaise > 0);
  const hasFiles = Boolean(product.files && product.files.length > 0);
  const isReadyForSubmission = hasTitle && hasDescription && hasPrice && hasFiles;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-velvet-border/80">
        <div>
          <Link
            href={`/seller/products/${productId}`}
            className="inline-flex items-center gap-1.5 text-xs text-velvet-cream-muted hover:text-velvet-cream transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Product Overview</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-serif text-velvet-cream-soft">
            Curation & Moderation Lifecycle
          </h1>
          <p className="text-xs text-velvet-cream-muted mt-0.5">
            Verification status, quality audit checklist, and review submissions for <span className="text-velvet-cream">{product.title}</span>
          </p>
        </div>
      </div>

      {/* Notifications */}
      {submitSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{submitSuccess}</span>
        </div>
      )}

      {submitError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Current Lifecycle Status Banner */}
      <div className="p-6 rounded-2xl bg-velvet-mocha border border-velvet-border space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase text-velvet-cream-muted">Current Verification Stage</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider ${
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

        {/* Detailed Explanation for each status */}
        {product.status === "DRAFT" && (
          <div className="text-xs text-velvet-cream-muted leading-relaxed">
            Your product is currently in <strong className="text-velvet-cream">DRAFT</strong> mode. Complete all checklist requirements below (specifications and deliverable file upload), then submit to marketplace curation for public verification.
          </div>
        )}

        {product.status === "PENDING_REVIEW" && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>In Marketplace Curation Queue</span>
            </div>
            <p className="text-amber-200/90">
              An administrator will verify that your digital deliverables match quality guidelines and virus scan benchmarks. Products are typically processed within 24–48 hours.
            </p>
          </div>
        )}

        {product.status === "PUBLISHED" && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-2">
            <div className="font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Product Published & Active in Public Catalog</span>
            </div>
            <p className="text-emerald-200/90">
              This product is verified and live on Marketify. Buyers can view, license, and checkout.
            </p>
            <Link
              href={`/products/${product.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline font-mono"
            >
              <span>View Public Listing</span>
              <span>↗</span>
            </Link>
          </div>
        )}

        {product.status === "REJECTED" && (
          <div className="p-5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-2">
            <div className="font-semibold flex items-center gap-1.5 text-sm">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Curation Review Feedback</span>
            </div>
            <p className="text-rose-200 bg-rose-950/40 p-3 rounded-lg border border-rose-900/40 font-mono text-[11px]">
              {product.rejectionReason || "Please review asset formatting and deliverable completeness."}
            </p>
            <p className="text-rose-300/80 text-[11px]">
              You can edit your product details and re-upload deliverables in DRAFT mode, then resubmit for curation review.
            </p>
          </div>
        )}
      </div>

      {/* Pre-Submission Checklist */}
      <div className="p-6 rounded-2xl bg-velvet-mocha border border-velvet-border space-y-4">
        <h2 className="font-serif text-sm font-medium text-velvet-cream-soft">
          Pre-Submission Verification Checklist
        </h2>
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-velvet-plum border border-velvet-border">
            <div className="flex items-center gap-2.5">
              {hasTitle ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400" />
              )}
              <span className={hasTitle ? "text-velvet-cream-soft" : "text-velvet-cream-muted"}>
                Product Title Set (minimum 3 characters)
              </span>
            </div>
            <Link href={`/seller/products/${productId}/edit`} className="text-velvet-rose text-[11px]">
              {hasTitle ? "Edit" : "Set"}
            </Link>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-velvet-plum border border-velvet-border">
            <div className="flex items-center gap-2.5">
              {hasDescription ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400" />
              )}
              <span className={hasDescription ? "text-velvet-cream-soft" : "text-velvet-cream-muted"}>
                Description & Specifications provided
              </span>
            </div>
            <Link href={`/seller/products/${productId}/edit`} className="text-velvet-rose text-[11px]">
              {hasDescription ? "Edit" : "Set"}
            </Link>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-velvet-plum border border-velvet-border">
            <div className="flex items-center gap-2.5">
              {hasPrice ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400" />
              )}
              <span className={hasPrice ? "text-velvet-cream-soft" : "text-velvet-cream-muted"}>
                Price configured (₹{(product.pricePaise / 100).toFixed(0)} INR)
              </span>
            </div>
            <Link href={`/seller/products/${productId}/edit`} className="text-velvet-rose text-[11px]">
              {hasPrice ? "Edit" : "Set"}
            </Link>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-velvet-plum border border-velvet-border">
            <div className="flex items-center gap-2.5">
              {hasFiles ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              )}
              <span className={hasFiles ? "text-velvet-cream-soft" : "text-rose-300"}>
                Digital Deliverable File Uploaded ({product.files?.length || 0} file)
              </span>
            </div>
            <Link href={`/seller/products/${productId}/files`} className="text-velvet-rose text-[11px]">
              {hasFiles ? "View Files" : "Upload File"}
            </Link>
          </div>
        </div>

        {/* Action Button */}
        {product.status === "DRAFT" && (
          <div className="pt-4 border-t border-velvet-border/60 flex items-center justify-between">
            <span className="text-[11px] text-velvet-cream-muted">
              {isReadyForSubmission
                ? "All requirements satisfied. Ready for moderation."
                : "Complete all checklist items before submitting."}
            </span>
            <button
              onClick={handleSubmitForReview}
              disabled={submitting || !isReadyForSubmission}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md disabled:opacity-40 transition-colors"
            >
              <span>{submitting ? "Submitting..." : "Submit for Moderation"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
