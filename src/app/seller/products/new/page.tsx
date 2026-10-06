"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSellerAuth } from "../../SellerAuthContext";

export default function NewProductPage() {
  const router = useRouter();
  const { isApproved, fetchWithAuth } = useSellerAuth();

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Information
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [tagsInput, setTagsInput] = useState("Template, Digital");

  // Step 2: Media
  const [fileFormatsInput, setFileFormatsInput] = useState("ZIP, PDF");
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  // Step 3: Pricing
  const [priceRupees, setPriceRupees] = useState("499");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/v1/products");
        const json = await res.json();
        if (json.data?.categories) {
          setCategories(json.data.categories);
          if (json.data.categories.length > 0) {
            setCategoryId(json.data.categories[0].id);
          }
        }
      } catch {}
    }
    loadCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isApproved) {
      alert("Only approved sellers can create products.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const priceNum = parseFloat(priceRupees);
    if (isNaN(priceNum) || priceNum < 0) {
      setErrorMsg("Price must be a valid non-negative number");
      setSubmitting(false);
      return;
    }

    const pricePaise = Math.round(priceNum * 100);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const fileFormats = fileFormatsInput.split(",").map((f) => f.trim()).filter(Boolean);

    try {
      const res = await fetchWithAuth("/api/v1/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          shortDescription: shortDescription.trim(),
          description: description.trim(),
          pricePaise,
          categoryId,
          version: version.trim() || "1.0.0",
          tags,
          fileFormats,
        }),
      });

      const json = await res.json();
      if (res.ok && json.data?.product) {
        router.push(`/seller/products/${json.data.product.id}`);
      } else {
        setErrorMsg(json.error?.message || "Failed to create product");
      }
    } catch {
      setErrorMsg("Network error creating product");
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: "Information", desc: "Basic product details" },
    { num: 2, title: "Media & Formats", desc: "Digital asset parameters" },
    { num: 3, title: "Pricing", desc: "Set creator license value" },
    { num: 4, title: "Review", desc: "Inspect summary before upload" },
    { num: 5, title: "Submit", desc: "Send for marketplace review" },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-velvet-border/80">
        <div>
          <h1 className="text-3xl font-serif font-normal text-velvet-cream-soft tracking-tight">
            Add New Digital Product
          </h1>
          <p className="text-velvet-cream-muted text-xs mt-1">
            Structured curation wizard for publishing verified digital assets on Marketify.
          </p>
        </div>
        <Link
          href="/seller/products"
          className="text-xs text-velvet-cream-muted hover:text-velvet-cream transition-colors"
        >
          ← Return to Inventory
        </Link>
      </div>

      {/* Progress Steps Header */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {steps.map((s) => (
          <button
            key={s.num}
            type="button"
            onClick={() => setCurrentStep(s.num)}
            className={`p-3 rounded-2xl border text-left transition-all ${
              currentStep === s.num
                ? "bg-velvet-mocha border-velvet-rose text-velvet-cream-soft shadow-md shadow-velvet-rose/15"
                : currentStep > s.num
                ? "bg-velvet-plum border-velvet-cream/40 text-velvet-cream"
                : "bg-velvet-plum/60 border-velvet-border text-velvet-cream-muted"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-serif ${
                  currentStep === s.num
                    ? "bg-velvet-rose text-white"
                    : currentStep > s.num
                    ? "bg-velvet-cream text-velvet-plum"
                    : "bg-velvet-mocha text-velvet-cream-muted"
                }`}
              >
                {s.num}
              </span>
              <span className="text-xs font-serif font-medium">{s.title}</span>
            </div>
            <p className="text-[10px] text-velvet-cream-muted line-clamp-1">{s.desc}</p>
          </button>
        ))}
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-3xl bg-velvet-mocha border border-velvet-border space-y-6">
        {/* Step 1: Information */}
        {currentStep === 1 && (
          <div className="space-y-4 text-xs">
            <h2 className="text-base font-serif font-medium text-velvet-cream-soft pb-2 border-b border-velvet-border/60">
              01 — Product Information
            </h2>

            <div>
              <label className="block text-velvet-cream-muted font-medium mb-1.5">Product Title</label>
              <input
                type="text"
                placeholder="e.g. Notion Minimal Workspace Kit"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream placeholder-velvet-cream-muted/50 focus:outline-none focus:border-velvet-cream"
                required
                minLength={3}
                maxLength={150}
              />
            </div>

            <div>
              <label className="block text-velvet-cream-muted font-medium mb-1.5">Short Description (Summary)</label>
              <input
                type="text"
                placeholder="A concise 1-2 sentence overview for catalog showcase cards..."
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream placeholder-velvet-cream-muted/50 focus:outline-none focus:border-velvet-cream"
                required
                maxLength={300}
              />
            </div>

            <div>
              <label className="block text-velvet-cream-muted font-medium mb-1.5">Full Editorial Description</label>
              <textarea
                rows={5}
                placeholder="Provide detailed breakdown of what is included, specifications, documentation, and usage instructions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream placeholder-velvet-cream-muted/50 focus:outline-none focus:border-velvet-cream"
                required
              ></textarea>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-velvet-cream-muted font-medium mb-1.5">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream focus:outline-none focus:border-velvet-cream"
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-velvet-cream-muted font-medium mb-1.5">Initial Version</label>
                <input
                  type="text"
                  placeholder="1.0.0"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream focus:outline-none focus:border-velvet-cream"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Media */}
        {currentStep === 2 && (
          <div className="space-y-4 text-xs">
            <h2 className="text-base font-serif font-medium text-velvet-cream-soft pb-2 border-b border-velvet-border/60">
              02 — Media & File Specification
            </h2>

            <div>
              <label className="block text-velvet-cream-muted font-medium mb-1.5">Thumbnail / Cover Preview URL</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/photo-..."
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream placeholder-velvet-cream-muted/50 focus:outline-none focus:border-velvet-cream"
              />
              <span className="text-[11px] text-velvet-cream-muted mt-1 block">
                Direct files and high-res screenshot attachments will be uploaded once this product record is created.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-velvet-cream-muted font-medium mb-1.5">Supported File Formats</label>
                <input
                  type="text"
                  placeholder="ZIP, FIG, PDF, NOTION"
                  value={fileFormatsInput}
                  onChange={(e) => setFileFormatsInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream focus:outline-none focus:border-velvet-cream"
                />
              </div>

              <div>
                <label className="block text-velvet-cream-muted font-medium mb-1.5">Tags (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="React, Nextjs, Dark Theme, Tailwind"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream focus:outline-none focus:border-velvet-cream"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Pricing */}
        {currentStep === 3 && (
          <div className="space-y-4 text-xs">
            <h2 className="text-base font-serif font-medium text-velvet-cream-soft pb-2 border-b border-velvet-border/60">
              03 — Pricing & Licensing
            </h2>

            <div className="max-w-md">
              <label className="block text-velvet-cream-muted font-medium mb-1.5">Price in INR (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-2.5 text-velvet-cream-muted font-mono">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="499"
                  value={priceRupees}
                  onChange={(e) => setPriceRupees(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream text-sm font-serif placeholder-velvet-cream-muted/50 focus:outline-none focus:border-velvet-cream"
                  required
                />
              </div>
              <span className="text-[11px] text-velvet-cream-muted mt-1.5 block">
                Platform fee: 10% standard marketplace commission upon verified sale.
              </span>
            </div>
          </div>
        )}

        {/* Step 4 & 5: Review & Submit */}
        {(currentStep === 4 || currentStep === 5) && (
          <div className="space-y-4 text-xs">
            <h2 className="text-base font-serif font-medium text-velvet-cream-soft pb-2 border-b border-velvet-border/60">
              {currentStep === 4 ? "04 — Review Product Information" : "05 — Submit for Moderation"}
            </h2>

            <div className="p-5 rounded-2xl bg-velvet-plum/60 border border-velvet-border space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-velvet-rose">Draft Preview</span>
                  <h3 className="text-lg font-serif text-velvet-cream-soft mt-0.5">{title || "Untitled Product"}</h3>
                  <p className="text-xs text-velvet-cream-muted mt-1">{shortDescription || "No summary provided."}</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-serif text-velvet-cream font-medium">₹{priceRupees || "0"}</span>
                  <span className="text-[10px] text-velvet-cream-muted block">INR Single License</span>
                </div>
              </div>

              <div className="pt-3 border-t border-velvet-border/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <span className="text-velvet-cream-muted block">Version:</span>
                  <span className="text-velvet-cream">{version || "1.0.0"}</span>
                </div>
                <div>
                  <span className="text-velvet-cream-muted block">Formats:</span>
                  <span className="text-velvet-cream">{fileFormatsInput || "ZIP"}</span>
                </div>
                <div>
                  <span className="text-velvet-cream-muted block">Status:</span>
                  <span className="text-amber-400">Ready for Draft Creation</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="pt-4 border-t border-velvet-border/70 flex items-center justify-between">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            className="px-4 py-2 rounded-xl bg-velvet-plum hover:bg-velvet-mocha-elevated text-velvet-cream-muted hover:text-velvet-cream text-xs font-medium border border-velvet-border disabled:opacity-40"
          >
            ← Previous Step
          </button>

          <div className="flex items-center gap-3">
            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1))}
                className="px-5 py-2.5 rounded-full bg-velvet-cream hover:bg-velvet-cream-soft text-velvet-plum text-xs font-semibold shadow-sm transition-all"
              >
                Next Step →
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-full bg-velvet-rose hover:bg-velvet-rose-soft text-white text-xs font-semibold shadow-lg shadow-velvet-rose/25 transition-all disabled:opacity-50"
              >
                {submitting ? "Publishing Draft..." : "Confirm & Submit Product"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
