"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSellerAuth } from "../../../SellerAuthContext";
import { ArrowLeft, Save, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

export default function SellerProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const { token, isApproved, fetchWithAuth } = useSellerAuth();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [priceRupees, setPriceRupees] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [tagsInput, setTagsInput] = useState("");
  const [fileFormatsInput, setFileFormatsInput] = useState("");
  const [demoUrl, setDemoUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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
        const p = json.data;
        setProduct(p);
        setTitle(p.title || "");
        setShortDescription(p.shortDescription || "");
        setDescription(p.description || "");
        setPriceRupees(((p.pricePaise || 0) / 100).toString());
        setVersion(p.version || "1.0.0");
        setTagsInput(Array.isArray(p.tags) ? p.tags.join(", ") : "");
        setFileFormatsInput(Array.isArray(p.fileFormats) ? p.fileFormats.join(", ") : "");
        setDemoUrl(p.demoUrl || "");
      } else {
        setError(json.error?.message || "Failed to load product specifications");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus(null);
    setSaveError(null);

    const priceNum = parseFloat(priceRupees);
    if (isNaN(priceNum) || priceNum < 0) {
      setSaveError("Price must be a valid non-negative number");
      setSaving(false);
      return;
    }

    const pricePaise = Math.round(priceNum * 100);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const fileFormats = fileFormatsInput.split(",").map((f) => f.trim()).filter(Boolean);

    try {
      const res = await fetchWithAuth(`/api/v1/seller/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          shortDescription: shortDescription.trim(),
          description: description.trim(),
          version: version.trim() || "1.0.0",
          pricePaise,
          tags,
          fileFormats,
          demoUrl: demoUrl.trim() || null,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setSaveStatus("Product specifications updated successfully!");
        loadProduct();
      } else {
        setSaveError(json.error?.message || "Failed to update product");
      }
    } catch {
      setSaveError("Network error saving product details");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-velvet-cream-muted">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-velvet-rose" />
        <p className="text-xs font-mono">Loading product configuration...</p>
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
      {/* Navigation & Header */}
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
            Edit Product Specifications
          </h1>
          <p className="text-xs text-velvet-cream-muted mt-0.5">
            Modify title, price, descriptions, and metadata for <span className="text-velvet-cream">{product.title}</span>
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

      {saveStatus && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{saveStatus}</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-velvet-mocha border border-velvet-border space-y-5">
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-velvet-cream-muted font-mono mb-1">Product Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream focus:outline-none focus:border-velvet-cream transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-velvet-cream-muted font-mono mb-1">URL Slug (System Managed)</label>
            <input
              type="text"
              value={product.slug}
              disabled
              className="w-full px-3.5 py-2.5 rounded-xl bg-velvet-plum/40 border border-velvet-border/50 text-velvet-cream-muted font-mono cursor-not-allowed text-[11px]"
            />
          </div>

          <div>
            <label className="block text-velvet-cream-muted font-mono mb-1">Short Description (Excerpt)</label>
            <input
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream focus:outline-none focus:border-velvet-cream transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-velvet-cream-muted font-mono mb-1">Full Description</label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream focus:outline-none focus:border-velvet-cream transition-colors font-light"
              required
            ></textarea>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-velvet-cream-muted font-mono mb-1">Price (₹ INR)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={priceRupees}
                onChange={(e) => setPriceRupees(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream focus:outline-none focus:border-velvet-cream transition-colors font-mono"
                required
              />
              <span className="text-[10px] text-velvet-cream-muted/70 mt-1 block">
                Stored server-side in integer paise (₹1 = 100 paise)
              </span>
            </div>

            <div>
              <label className="block text-velvet-cream-muted font-mono mb-1">Version String</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream focus:outline-none focus:border-velvet-cream transition-colors font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-velvet-cream-muted font-mono mb-1">Tags (Comma-separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Figma, UI Kit, Dark Mode"
                className="w-full px-3.5 py-2.5 rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream focus:outline-none focus:border-velvet-cream transition-colors"
              />
            </div>

            <div>
              <label className="block text-velvet-cream-muted font-mono mb-1">File Formats (Comma-separated)</label>
              <input
                type="text"
                value={fileFormatsInput}
                onChange={(e) => setFileFormatsInput(e.target.value)}
                placeholder="ZIP, FIG, PDF"
                className="w-full px-3.5 py-2.5 rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream focus:outline-none focus:border-velvet-cream transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-velvet-cream-muted font-mono mb-1">Demo / Preview URL (Optional)</label>
            <input
              type="url"
              value={demoUrl}
              onChange={(e) => setDemoUrl(e.target.value)}
              placeholder="https://example.com/demo"
              className="w-full px-3.5 py-2.5 rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream focus:outline-none focus:border-velvet-cream transition-colors"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-velvet-border/60 flex items-center justify-between">
          <Link
            href={`/seller/products/${productId}`}
            className="text-xs text-velvet-cream-muted hover:text-velvet-cream transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-velvet-rose hover:bg-velvet-rose-soft text-white text-xs font-semibold shadow-md disabled:opacity-50 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Saving Changes..." : "Save Product Details"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
