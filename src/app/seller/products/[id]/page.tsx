"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSellerAuth } from "../../SellerAuthContext";

export default function SellerProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const { token, isApproved, fetchWithAuth } = useSellerAuth();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit fields
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [priceRupees, setPriceRupees] = useState("");
  const [version, setVersion] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadProduct = useCallback(async () => {
    if (!token || !isApproved || !productId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithAuth(`/api/v1/seller/products/${productId}`);
      const json = await res.json();

      if (res.ok && json.data) {
        const p = json.data;
        setProduct(p);
        setTitle(p.title || "");
        setShortDescription(p.shortDescription || "");
        setDescription(p.description || "");
        setPriceRupees(((p.pricePaise || 0) / 100).toString());
        setVersion(p.version || "1.0.0");
      } else {
        setError(json.error?.message || "Failed to load product details");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [token, isApproved, productId, fetchWithAuth]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus(null);

    const priceNum = parseFloat(priceRupees);
    const pricePaise = !isNaN(priceNum) && priceNum >= 0 ? Math.round(priceNum * 100) : undefined;

    try {
      const res = await fetchWithAuth(`/api/v1/seller/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          shortDescription: shortDescription.trim(),
          description: description.trim(),
          version: version.trim(),
          ...(pricePaise !== undefined && { pricePaise }),
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setSaveStatus("✅ Product details saved successfully!");
        loadProduct();
      } else {
        setSaveStatus(`❌ ${json.error?.message || "Failed to update product"}`);
      }
    } catch {
      setSaveStatus("❌ Network error saving product");
    } finally {
      setSaving(false);
    }
  };

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-slate-800 rounded w-1/4 animate-pulse"></div>
        <div className="h-64 bg-slate-900 border border-slate-800 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
        <div className="text-3xl">⚠️</div>
        <h2 className="text-lg font-bold text-white">Access Denied or Not Found</h2>
        <p className="text-sm text-red-400 max-w-md mx-auto">{error}</p>
        <Link
          href="/seller/products"
          className="inline-flex px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
        >
          ← Back to Products
        </Link>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <Link
            href="/seller/products"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-1 font-medium"
          >
            ← Back to Products
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">{product.title}</h1>
            <span
              className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded ${
                product.status === "PUBLISHED"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : product.status === "PENDING_REVIEW"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : product.status === "REJECTED"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-slate-700/60 text-slate-300"
              }`}
            >
              {product.status}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {product.status === "DRAFT" && (
            <button
              onClick={handleSubmitForReview}
              disabled={submittingReview}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {submittingReview ? "Submitting..." : "Submit for Moderation"}
            </button>
          )}
          {product.status === "PUBLISHED" && (
            <Link
              href={`/products/${product.slug}`}
              target="_blank"
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <span>👁️</span> Public View
            </Link>
          )}
        </div>
      </div>

      {/* Moderation Feedback Banner if rejected */}
      {product.status === "REJECTED" && product.rejectionReason && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-200 text-xs space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-sm">
            <span>⚠️</span> Product Moderation Rejection Notice
          </div>
          <p className="text-red-300">{product.rejectionReason}</p>
          <div className="text-[11px] text-red-400/80 pt-1">
            Please make the necessary changes below and resubmit for review.
          </div>
        </div>
      )}

      {/* Files Section */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h2 className="font-bold text-white text-sm flex items-center gap-2">
            <span>📁</span> Digital Deliverables & Files ({product.files?.length || 0})
          </h2>
          <Link
            href="/test/upload"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Upload Digital Package →
          </Link>
        </div>

        {(!product.files || product.files.length === 0) ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No digital files packaged yet. You must upload at least one file before submitting for review.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {product.files.map((file: any) => (
              <div key={file.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-mono text-white font-medium">📄 {file.originalFilename}</div>
                  <div className="text-[10px] text-slate-500">
                    {(file.fileSize / 1024 / 1024).toFixed(2)} MB · {file.mimeType} · v{file.version}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  READY
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSaveProduct} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="font-bold text-white text-sm">Product Specifications</h2>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Short Description</label>
            <input
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Full Description</label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
              required
            ></textarea>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Price in INR (₹)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={priceRupees}
                onChange={(e) => setPriceRupees(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Version</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {saveStatus && (
          <div className="p-3 rounded-lg bg-slate-800 text-xs font-medium">
            {saveStatus}
          </div>
        )}

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors disabled:opacity-50 shadow-sm"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
