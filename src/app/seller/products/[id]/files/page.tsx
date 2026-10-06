"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSellerAuth } from "../../../SellerAuthContext";
import {
  ArrowLeft,
  Upload,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Lock,
  FileText,
} from "lucide-react";

export default function SellerProductFilesPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const { token, isApproved, fetchWithAuth } = useSellerAuth();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setError(json.error?.message || "Failed to load product files");
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (product.status !== "DRAFT") {
      setUploadError(`Files can only be added or modified for DRAFT products. Current status: ${product.status}`);
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    setUploadStep("Authorizing upload with secure storage...");
    setUploadError(null);
    setUploadSuccess(null);

    try {
      // Step 1: Initialize upload authorization
      const initRes = await fetchWithAuth(`/api/v1/seller/products/${productId}/assets/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileSizeBytes: file.size,
          contentType: file.type || "application/octet-stream",
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok || !initData.data?.uploadUrl) {
        throw new Error(initData.error?.message || "Storage authorization failed");
      }

      const { uploadUrl, assetId } = initData.data;

      // Step 2: PUT raw file directly to storage URL
      setUploadProgress(45);
      setUploadStep("Transferring encrypted file package to private storage...");

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Storage transfer failed with status ${uploadRes.status}`);
      }

      // Step 3: Complete upload and confirm with backend verification
      setUploadProgress(85);
      setUploadStep("Verifying file integrity and updating registry...");

      const completeRes = await fetchWithAuth(
        `/api/v1/seller/products/${productId}/assets/${assetId}/complete`,
        {
          method: "POST",
        }
      );

      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(completeData.error?.message || "File verification failed");
      }

      setUploadProgress(100);
      setUploadSuccess(`File "${file.name}" uploaded and verified successfully!`);
      loadProduct();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "File upload failed");
    } finally {
      setUploading(false);
      setUploadStep(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
        <p className="text-xs font-mono">Loading digital package inventory...</p>
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
            Deliverable Files & Packages
          </h1>
          <p className="text-xs text-velvet-cream-muted mt-0.5">
            Manage buyer-downloadable digital assets for <span className="text-velvet-cream">{product.title}</span>
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider ${
            product.status === "PUBLISHED"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
              : product.status === "PENDING_REVIEW"
              ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
              : "bg-velvet-plum text-velvet-cream-muted border border-velvet-border"
          }`}
        >
          {product.status}
        </span>
      </div>

      {/* Security Privacy Notice */}
      <div className="flex items-start gap-3 p-4 bg-velvet-mocha border border-velvet-border/80 rounded-2xl text-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-serif font-medium text-velvet-cream-soft">Private Zero-Trust Storage Rails</p>
          <p className="text-velvet-cream-muted mt-0.5">
            Deliverables are securely stored in private storage. Raw storage paths and access keys are never exposed to clients. Buyers can only access verified downloads via short-lived signed tokens post-purchase.
          </p>
        </div>
      </div>

      {/* Status Banners */}
      {uploadSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {uploadError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Real Upload Dropzone / Button */}
      {product.status === "DRAFT" ? (
        <div className="p-6 rounded-2xl bg-velvet-mocha border border-dashed border-velvet-border hover:border-velvet-rose/60 transition-colors text-center space-y-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            id="file-upload-input"
          />
          <div className="w-12 h-12 rounded-2xl bg-velvet-plum border border-velvet-border flex items-center justify-center text-velvet-rose mx-auto">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif text-sm text-velvet-cream-soft">Upload Digital Deliverable Package</h3>
            <p className="text-[11px] text-velvet-cream-muted mt-1 max-w-sm mx-auto">
              Select your ZIP, PDF, or application asset bundle. The server enforces file size and MIME checks.
            </p>
          </div>

          {uploading ? (
            <div className="space-y-2 max-w-xs mx-auto pt-2">
              <div className="w-full bg-velvet-plum rounded-full h-2 overflow-hidden border border-velvet-border">
                <div
                  className="bg-velvet-rose h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-[11px] font-mono text-velvet-cream-muted">{uploadStep}</p>
            </div>
          ) : (
            <label
              htmlFor="file-upload-input"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-velvet-rose hover:bg-velvet-rose-soft text-white text-xs font-semibold cursor-pointer shadow-md transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Select File to Upload</span>
            </label>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-velvet-mocha border border-velvet-border text-xs text-velvet-cream-muted flex items-center gap-2">
          <Lock className="w-4 h-4 text-velvet-cream-muted shrink-0" />
          <span>
            File modification is locked for products in <strong className="text-velvet-cream">{product.status}</strong> status. To update deliverables on published products, version increments or curation re-submission is required.
          </span>
        </div>
      )}

      {/* Existing Deliverables List */}
      <section className="p-6 rounded-2xl bg-velvet-mocha border border-velvet-border space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-velvet-border/60">
          <h2 className="font-serif text-sm font-medium text-velvet-cream-soft flex items-center gap-2">
            <FileText className="w-4 h-4 text-velvet-cream" />
            <span>Packaged Files ({product.files?.length || 0})</span>
          </h2>
          <span className="text-[10px] font-mono text-velvet-cream-muted">
            Double-checked against private storage
          </span>
        </div>

        {(!product.files || product.files.length === 0) ? (
          <div className="py-12 text-center text-xs text-velvet-cream-muted space-y-2">
            <FileCheck className="w-8 h-8 text-velvet-cream-muted/40 mx-auto" />
            <p>No digital deliverables uploaded yet</p>
            <p className="text-[11px] text-velvet-cream-muted/70">
              You must upload at least one valid deliverable file before submitting this product for marketplace review.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-velvet-border/60">
            {product.files.map((file: any) => (
              <div key={file.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-medium text-velvet-cream-soft font-mono truncate">
                    {file.originalFilename}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-velvet-cream-muted mt-0.5">
                    <span>{formatFileSize(file.fileSize)}</span>
                    <span>·</span>
                    <span>{file.mimeType}</span>
                    <span>·</span>
                    <span>v{file.version}</span>
                    <span>·</span>
                    <span>Added {new Date(file.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    VERIFIED
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
