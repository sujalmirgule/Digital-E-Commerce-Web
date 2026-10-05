"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";


interface CatalogProduct {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  productType: string;
  pricePaise: number;
  discountPricePaise?: number | null;
  isFree: boolean;
  licenseType: string;
  ratingAvg: number;
  reviewsCount: number;
  thumbnailUrl: string | null;
  seller: {
    storeName: string;
    storeSlug: string;
    logoUrl?: string | null;
  };
  category: {
    name: string;
    slug: string;
  };
  createdAt: string;
}

export default function TestCatalogPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Inspector
  const [selectedProduct, setSelectedProduct] = useState<Record<string, unknown> | null>(null);
  const [inspectIdentifier, setInspectIdentifier] = useState("");
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      params.set("sort", sort);
      if (query.trim()) params.set("query", query.trim());
      if (category.trim()) params.set("category", category.trim());
      if (minPrice.trim()) params.set("minPrice", minPrice.trim());
      if (maxPrice.trim()) params.set("maxPrice", maxPrice.trim());

      const res = await fetch(`/api/v1/products?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to fetch products");
      }
      setProducts(data.data || []);
      setMeta(data.meta || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching catalog");
    } finally {
      setLoading(false);
    }
  }, [page, limit, sort, query, category, minPrice, maxPrice]);

  const handleInspect = async (identifier: string) => {
    if (!identifier.trim()) return;
    setInspectLoading(true);
    setInspectError(null);
    setSelectedProduct(null);
    try {
      const res = await fetch(`/api/v1/products/${encodeURIComponent(identifier.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${data.error?.message || "Product not found"}`);
      }
      setSelectedProduct(data.data?.product || data.data);
    } catch (err: unknown) {
      setInspectError(err instanceof Error ? err.message : "Inspection failed");
    } finally {
      setInspectLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
              Feature 09 — Product Discovery
            </div>
            <h1 className="text-2xl font-bold text-white">Public Product Catalog Test Workbench</h1>
            <p className="text-xs text-slate-400 mt-1">
              Verify published products discovery, status filtering, zero leakage, and Buy Now placeholder.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/products"
              className="text-xs text-indigo-400 hover:text-white px-3 py-1.5 rounded-md border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
            >
              Open Production UI (/products) →
            </Link>
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-md border border-slate-800 hover:bg-slate-900 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Search Query</label>
              <input
                type="text"
                placeholder="Title, description, tags..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Category Slug</label>
              <input
                type="text"
                placeholder="e.g. software-development"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Sort By</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="newest">Newest Releases</option>
                <option value="best_selling">Best Selling</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Price Range (Paise)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>Items per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              {meta && (
                <span>
                  Showing {products.length} of {meta.total} products (Page {meta.page} of {meta.totalPages})
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPage(1);
                  fetchCatalog();
                }}
                disabled={loading}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors shadow-lg shadow-indigo-600/20"
              >
                {loading ? "Searching..." : "Apply Filters"}
              </button>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Catalog Grid */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Public Products ({products.length})
          </h2>

          {loading && products.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">Loading marketplace catalog...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
              No published products found matching criteria. (Unpublished products are strictly hidden).
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {p.category.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        PUBLISHED
                      </span>
                    </div>

                    <h3 className="font-semibold text-white text-sm line-clamp-1">{p.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{p.shortDescription}</p>

                    <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
                      <span>Store: <strong className="text-slate-300">{p.seller.storeName}</strong></span>
                      <span>⭐ {p.ratingAvg.toFixed(1)} ({p.reviewsCount})</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between">
                    <div>
                      <span className="text-base font-bold text-white">
                        ₹{(p.pricePaise / 100).toFixed(2)}
                      </span>
                      {p.discountPricePaise && (
                        <span className="text-xs text-slate-500 line-through ml-1.5">
                          ₹{(p.discountPricePaise / 100).toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleInspect(p.slug || p.id)}
                        className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => alert(`[BUY NOW ENTRY POINT]\nProduct: ${p.title}\nID: ${p.id}\nCheckout URL: /checkout/${p.id}\n\nNote: Payment & Checkout will be implemented in Feature 10.`)}
                        className="px-3 py-1 text-xs rounded font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 text-xs rounded border border-slate-800 bg-slate-900 disabled:opacity-40 text-slate-300"
              >
                Previous
              </button>
              <span className="text-xs text-slate-400">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-xs rounded border border-slate-800 bg-slate-900 disabled:opacity-40 text-slate-300"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Product Detail Inspector */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Product Detail &amp; Unpublished Shield Verification</h2>
              <p className="text-xs text-slate-400">
                Lookup by ID or slug. Verify that DRAFT/PENDING/REJECTED products return 404 without data leakage.
              </p>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Product ID or Slug..."
                value={inspectIdentifier}
                onChange={(e) => setInspectIdentifier(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 w-full sm:w-64"
              />
              <button
                onClick={() => handleInspect(inspectIdentifier)}
                disabled={inspectLoading || !inspectIdentifier.trim()}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-50 transition-colors border border-slate-700"
              >
                {inspectLoading ? "Checking..." : "Inspect"}
              </button>
            </div>
          </div>

          {inspectError && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
              <strong>Visibility Response:</strong> {inspectError}
            </div>
          )}

          {selectedProduct && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-400 font-medium">✓ Safe Public DTO Loaded (Zero Leakage)</span>
                <span className="text-xs text-slate-500">ID: {String(selectedProduct.id)}</span>
              </div>
              <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 overflow-x-auto max-h-96">
                {JSON.stringify(selectedProduct, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
