"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSellerAuth } from "../../SellerAuthContext";

export default function NewProductPage() {
  const router = useRouter();
  const { isApproved, fetchWithAuth } = useSellerAuth();

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [priceRupees, setPriceRupees] = useState("499");
  const [categoryId, setCategoryId] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [tagsInput, setTagsInput] = useState("Template, Digital");
  const [fileFormatsInput, setFileFormatsInput] = useState("ZIP");

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
        alert("Draft product created successfully!");
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

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create New Digital Product</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Initial setup for your product listing. Upload digital files and thumbnails in the next step.
          </p>
        </div>
        <Link
          href="/seller/products"
          className="text-xs text-slate-400 hover:text-white"
        >
          ← Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Product Title</label>
            <input
              type="text"
              placeholder="e.g. Next.js SaaS Starter Kit Pro"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              required
              minLength={3}
              maxLength={150}
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Short Description (Summary)</label>
            <input
              type="text"
              placeholder="A brief 1-2 sentence overview for catalog cards..."
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              required
              maxLength={300}
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Full Description</label>
            <textarea
              rows={5}
              placeholder="Describe what is included, features, tech stack, and documentation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
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
                placeholder="499"
                value={priceRupees}
                onChange={(e) => setPriceRupees(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                required
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Calculated to integer paise on the server.
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Initial Version</label>
              <input
                type="text"
                placeholder="1.0.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Tags (comma separated)</label>
              <input
                type="text"
                placeholder="React, Nextjs, UI"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">File Formats</label>
              <input
                type="text"
                placeholder="ZIP, FIG, PDF"
                value={fileFormatsInput}
                onChange={(e) => setFileFormatsInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
          <Link
            href="/seller/products"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors disabled:opacity-50 shadow-sm"
          >
            {submitting ? "Creating Draft..." : "Create Draft Product →"}
          </button>
        </div>
      </form>
    </div>
  );
}
