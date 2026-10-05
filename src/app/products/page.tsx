"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  X,
  Star,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  Store,
  Layers,
  Check,
} from "lucide-react";
import { MarketplaceNavbar } from "@/components/ui/MarketplaceNavbar";
import { MarketplaceFooter } from "@/components/ui/MarketplaceFooter";

interface ProductItem {
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
  salesCount: number;
  tags: string[];
  fileFormats: string[];
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

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  productCount: number;
}

interface MetaPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  filters?: Record<string, unknown>;
}

function ProductsDiscoveryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // URL state reading
  const urlQ = searchParams.get("q") || searchParams.get("query") || "";
  const urlCategory = searchParams.get("category") || searchParams.get("categorySlug") || "";
  const urlMinPrice = searchParams.get("priceMin") || searchParams.get("minPrice") || "";
  const urlMaxPrice = searchParams.get("priceMax") || searchParams.get("maxPrice") || "";
  const urlRating = searchParams.get("rating") || searchParams.get("minRating") || "";
  const urlSeller = searchParams.get("seller") || searchParams.get("sellerSlug") || "";
  const urlLicense = searchParams.get("licenseType") || "";
  const urlSort = searchParams.get("sort") || "newest";
  const urlPage = parseInt(searchParams.get("page") || "1", 10);

  // Local state
  const [searchInput, setSearchInput] = useState(urlQ);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [meta, setMeta] = useState<MetaPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Custom price input state
  const [customMinInRupees, setCustomMinInRupees] = useState(
    urlMinPrice ? String(Math.floor(parseInt(urlMinPrice, 10) / 100)) : ""
  );
  const [customMaxInRupees, setCustomMaxInRupees] = useState(
    urlMaxPrice ? String(Math.floor(parseInt(urlMaxPrice, 10) / 100)) : ""
  );

  // Fetch categories once
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/v1/categories");
        if (res.ok) {
          const json = await res.json();
          if (json.data) setCategories(json.data);
        }
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    }
    loadCategories();
  }, []);

  // Sync search input when URL changes externally
  useEffect(() => {
    setSearchInput(urlQ);
    setCustomMinInRupees(urlMinPrice ? String(Math.floor(parseInt(urlMinPrice, 10) / 100)) : "");
    setCustomMaxInRupees(urlMaxPrice ? String(Math.floor(parseInt(urlMaxPrice, 10) / 100)) : "");
  }, [urlQ, urlMinPrice, urlMaxPrice]);

  // Update URL helper
  const updateFilters = useCallback(
    (newParams: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(newParams).forEach(([k, v]) => {
        if (v === null || v === "") {
          next.delete(k);
          // also delete alias if exists
          if (k === "q") next.delete("query");
          if (k === "priceMin") next.delete("minPrice");
          if (k === "priceMax") next.delete("maxPrice");
          if (k === "rating") next.delete("minRating");
          if (k === "seller") next.delete("sellerSlug");
          if (k === "category") next.delete("categorySlug");
        } else {
          next.set(k, v);
        }
      });

      // Reset to page 1 unless page itself was updated
      if (!("page" in newParams)) {
        next.set("page", "1");
      }

      startTransition(() => {
        router.replace(`/products?${next.toString()}`, { scroll: false });
      });
    },
    [router, searchParams]
  );

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (urlQ.trim()) params.set("q", urlQ.trim());
      if (urlCategory) params.set("category", urlCategory);
      if (urlMinPrice) params.set("priceMin", urlMinPrice);
      if (urlMaxPrice) params.set("priceMax", urlMaxPrice);
      if (urlRating) params.set("rating", urlRating);
      if (urlSeller) params.set("seller", urlSeller);
      if (urlLicense) params.set("licenseType", urlLicense);
      if (urlSort) params.set("sort", urlSort);
      params.set("page", String(urlPage || 1));
      params.set("limit", "12");

      const res = await fetch(`/api/v1/products?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to retrieve products");
      }

      setProducts(json.data || []);
      setMeta(json.meta || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [
    urlQ,
    urlCategory,
    urlMinPrice,
    urlMaxPrice,
    urlRating,
    urlSeller,
    urlLicense,
    urlSort,
    urlPage,
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handlers
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchInput.trim() || null });
  };

  const handleApplyPrice = (e: React.FormEvent) => {
    e.preventDefault();
    const minPaise = customMinInRupees ? Math.max(0, Math.floor(parseFloat(customMinInRupees) * 100)) : null;
    const maxPaise = customMaxInRupees ? Math.max(0, Math.floor(parseFloat(customMaxInRupees) * 100)) : null;

    if (minPaise !== null && maxPaise !== null && minPaise > maxPaise) {
      alert("Minimum price cannot exceed maximum price");
      return;
    }

    updateFilters({
      priceMin: minPaise !== null ? String(minPaise) : null,
      priceMax: maxPaise !== null ? String(maxPaise) : null,
    });
  };

  const handlePricePreset = (minPaise: number | null, maxPaise: number | null) => {
    setCustomMinInRupees(minPaise !== null ? String(minPaise / 100) : "");
    setCustomMaxInRupees(maxPaise !== null ? String(maxPaise / 100) : "");
    updateFilters({
      priceMin: minPaise !== null ? String(minPaise) : null,
      priceMax: maxPaise !== null ? String(maxPaise) : null,
    });
  };

  const handleClearAllFilters = () => {
    setSearchInput("");
    setCustomMinInRupees("");
    setCustomMaxInRupees("");
    router.replace("/products", { scroll: false });
  };

  const formatRupees = (paise: number) => {
    return (paise / 100).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
  };

  // Count active filters
  const activeFiltersCount = [
    urlQ,
    urlCategory,
    urlMinPrice || urlMaxPrice,
    urlRating,
    urlSeller,
    urlLicense,
    urlSort !== "newest" ? urlSort : null,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#06080d] text-slate-100 font-sans selection:bg-orange-500 selection:text-white">
      <MarketplaceNavbar />
      {/* ── Top Hero / Search Banner ── */}
      <div className="relative border-b border-slate-800/80 bg-gradient-to-b from-[#090d16] via-[#090d16]/90 to-[#06080d] px-4 pt-28 pb-10 sm:px-6 sm:pb-14">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                Curated Marketplace Catalog
              </span>
              <span className="hidden sm:inline-block text-xs text-slate-400 font-mono">
                Verified Creator Assets
              </span>
            </div>
            <Link
              href="/"
              className="text-xs font-mono text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>

          <h1 className="text-2xl sm:text-4xl font-light text-white tracking-tight">
            Discover Premium Digital Assets
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl font-light">
            Explore curated design systems, templates, developer kits, and production-ready software
            from verified independent creators.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative max-w-3xl pt-2">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                id="search-input"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search templates, UI kits, codebases, tags..."
                maxLength={100}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pl-12 pr-28 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/60 shadow-xl transition-all font-light"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    updateFilters({ q: null });
                  }}
                  className="absolute right-24 p-1.5 text-slate-400 hover:text-white rounded-md transition-colors"
                  title="Clear search query"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                id="search-button"
                className="absolute right-2 px-5 py-2 rounded-xl text-xs font-mono font-medium bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white transition-all shadow-md shadow-orange-600/30 active:scale-95"
              >
                Search
              </button>
            </div>
          </form>

          {/* Quick Categories Bar */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1 no-scrollbar">
              <button
                onClick={() => updateFilters({ category: null })}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all ${
                  !urlCategory
                    ? "bg-orange-600 text-white shadow-sm font-medium"
                    : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => {
                const isSelected = urlCategory === cat.slug || urlCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => updateFilters({ category: isSelected ? null : cat.slug })}
                    className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all ${
                      isSelected
                        ? "bg-orange-600 text-white shadow-sm font-medium"
                        : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className="text-[10px] opacity-70 px-1.5 py-0.5 rounded-full bg-slate-800">
                      {cat.productCount}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Marketplace Body ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── DESKTOP SIDEBAR FILTERS ── */}
          <aside className="hidden lg:block w-72 flex-shrink-0 space-y-6">
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur sticky top-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-semibold text-white">Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      {activeFiltersCount}
                    </span>
                  )}
                </div>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={handleClearAllFilters}
                    className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    Reset All
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Category
                </label>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  <button
                    onClick={() => updateFilters({ category: null })}
                    className={`w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                      !urlCategory
                        ? "bg-indigo-600/20 text-indigo-300 font-semibold"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <span>All Products</span>
                    {!urlCategory && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                  {categories.map((c) => {
                    const isSelected = urlCategory === c.slug || urlCategory === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => updateFilters({ category: isSelected ? null : c.slug })}
                        className={`w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                          isSelected
                            ? "bg-indigo-600/20 text-indigo-300 font-semibold"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        <span className="text-[10px] text-slate-500">{c.productCount}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Filter */}
              <div className="border-t border-slate-800 pt-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Price Range
                </label>

                {/* Preset Chips */}
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  <button
                    type="button"
                    onClick={() => handlePricePreset(0, 0)}
                    className="px-2 py-1 text-xs rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-center"
                  >
                    Free
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePricePreset(0, 50000)}
                    className="px-2 py-1 text-xs rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-center"
                  >
                    Under ₹500
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePricePreset(50000, 200000)}
                    className="px-2 py-1 text-xs rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-center"
                  >
                    ₹500 - ₹2,000
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePricePreset(200000, null)}
                    className="px-2 py-1 text-xs rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-center"
                  >
                    ₹2,000+
                  </button>
                </div>

                {/* Custom Min / Max inputs in Rupees */}
                <form onSubmit={handleApplyPrice} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1.5 text-xs text-slate-500">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Min"
                        value={customMinInRupees}
                        onChange={(e) => setCustomMinInRupees(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-6 pr-2 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <span className="text-xs text-slate-500">to</span>
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1.5 text-xs text-slate-500">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Max"
                        value={customMaxInRupees}
                        onChange={(e) => setCustomMaxInRupees(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-6 pr-2 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                  >
                    Apply Price
                  </button>
                </form>
              </div>

              {/* Rating Filter */}
              <div className="border-t border-slate-800 pt-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Customer Rating
                </label>
                <div className="space-y-1">
                  {[
                    { label: "4.5★ & up", val: "4.5" },
                    { label: "4.0★ & up", val: "4.0" },
                    { label: "3.0★ & up", val: "3.0" },
                    { label: "Any Rating", val: null },
                  ].map((r) => {
                    const isSelected = r.val === null ? !urlRating : urlRating === r.val;
                    return (
                      <button
                        key={r.label}
                        onClick={() => updateFilters({ rating: r.val })}
                        className={`w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                          isSelected
                            ? "bg-indigo-600/20 text-indigo-300 font-semibold"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          {r.val && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                          <span>{r.label}</span>
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* License Type Filter */}
              <div className="border-t border-slate-800 pt-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  License
                </label>
                <div className="space-y-1">
                  {[
                    { label: "All Licenses", val: null },
                    { label: "Commercial License", val: "COMMERCIAL" },
                    { label: "Personal License", val: "PERSONAL" },
                    { label: "Extended License", val: "EXTENDED" },
                  ].map((lic) => {
                    const isSelected = lic.val === null ? !urlLicense : urlLicense === lic.val;
                    return (
                      <button
                        key={lic.label}
                        onClick={() => updateFilters({ licenseType: lic.val })}
                        className={`w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                          isSelected
                            ? "bg-indigo-600/20 text-indigo-300 font-semibold"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <span>{lic.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seller Filter */}
              {urlSeller && (
                <div className="border-t border-slate-800 pt-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Creator Filter
                  </label>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
                    <span className="truncate">Store: {urlSeller}</span>
                    <button
                      onClick={() => updateFilters({ seller: null })}
                      className="p-1 hover:text-white text-indigo-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* ── MAIN RESULTS AREA ── */}
          <main className="flex-1 space-y-6">
            {/* Top Results Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-900/30">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
                  className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-[10px]">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
                <div className="text-xs text-slate-400">
                  {loading ? (
                    <span>Searching catalog...</span>
                  ) : (
                    <span>
                      Found <strong className="text-white">{meta?.total ?? products.length}</strong>{" "}
                      products
                    </span>
                  )}
                </div>
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  Sort:
                </span>
                <select
                  id="sort-select"
                  value={urlSort}
                  onChange={(e) => updateFilters({ sort: e.target.value })}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="newest">Newest Arrivals</option>
                  <option value="best_selling">Best Selling</option>
                  <option value="popular">Popular</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>

            {/* Active Filter Chips */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">Active filters:</span>
                {urlQ && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-slate-800 text-slate-200 border border-slate-700">
                    Search: &ldquo;{urlQ}&rdquo;
                    <button onClick={() => updateFilters({ q: null })}>
                      <X className="w-3 h-3 hover:text-rose-400" />
                    </button>
                  </span>
                )}
                {urlCategory && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-slate-800 text-slate-200 border border-slate-700">
                    Category: {urlCategory}
                    <button onClick={() => updateFilters({ category: null })}>
                      <X className="w-3 h-3 hover:text-rose-400" />
                    </button>
                  </span>
                )}
                {(urlMinPrice || urlMaxPrice) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-slate-800 text-slate-200 border border-slate-700">
                    Price: {urlMinPrice ? `₹${parseInt(urlMinPrice, 10) / 100}` : "₹0"} -{" "}
                    {urlMaxPrice ? `₹${parseInt(urlMaxPrice, 10) / 100}` : "Any"}
                    <button onClick={() => updateFilters({ priceMin: null, priceMax: null })}>
                      <X className="w-3 h-3 hover:text-rose-400" />
                    </button>
                  </span>
                )}
                {urlRating && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-slate-800 text-slate-200 border border-slate-700">
                    Rating: {urlRating}★+
                    <button onClick={() => updateFilters({ rating: null })}>
                      <X className="w-3 h-3 hover:text-rose-400" />
                    </button>
                  </span>
                )}
                {urlLicense && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-slate-800 text-slate-200 border border-slate-700">
                    License: {urlLicense}
                    <button onClick={() => updateFilters({ licenseType: null })}>
                      <X className="w-3 h-3 hover:text-rose-400" />
                    </button>
                  </span>
                )}
                {urlSeller && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-slate-800 text-slate-200 border border-slate-700">
                    Creator: {urlSeller}
                    <button onClick={() => updateFilters({ seller: null })}>
                      <X className="w-3 h-3 hover:text-rose-400" />
                    </button>
                  </span>
                )}
                <button
                  onClick={handleClearAllFilters}
                  className="text-xs text-rose-400 hover:text-rose-300 underline ml-1"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={fetchProducts}
                  className="px-2.5 py-1 rounded bg-rose-600/30 hover:bg-rose-600/40 text-white font-medium"
                >
                  Retry
                </button>
              </div>
            )}

            {/* ── PRODUCTS GRID ── */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/30 p-4 space-y-3"
                  >
                    <div className="h-44 bg-slate-800/60 rounded-xl" />
                    <div className="h-4 bg-slate-800/80 rounded w-3/4" />
                    <div className="h-3 bg-slate-800/50 rounded w-full" />
                    <div className="h-3 bg-slate-800/50 rounded w-2/3" />
                    <div className="pt-2 flex justify-between items-center">
                      <div className="h-5 bg-slate-800/80 rounded w-20" />
                      <div className="h-7 bg-slate-800/80 rounded w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              /* Empty State */
              <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-slate-800/60 flex items-center justify-center text-slate-400">
                  <Search className="w-8 h-8 opacity-60" />
                </div>
                <h3 className="text-base font-semibold text-white">No products found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  We couldn&apos;t find any products matching your active search and filter criteria.
                  Try modifying your search keywords or resetting some filters.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleClearAllFilters}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset All Filters</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Product Cards Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((p) => {
                  return (
                    <div
                      key={p.id}
                      className="group flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700 transition-all duration-200 overflow-hidden shadow-lg hover:shadow-2xl"
                    >
                      <div>
                        {/* Thumbnail / Header */}
                        <div className="relative aspect-video w-full bg-slate-800 overflow-hidden">
                          {p.thumbnailUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={p.thumbnailUrl}
                              alt={p.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/40 p-4 text-center">
                              <Layers className="w-8 h-8 text-indigo-400/60 mb-1" />
                              <span className="text-[11px] font-mono text-slate-400">
                                {p.category.name}
                              </span>
                            </div>
                          )}

                          {/* Top Badges */}
                          <div className="absolute top-2 left-2 flex items-center gap-1">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-950/80 text-indigo-300 backdrop-blur border border-slate-800">
                              {p.category.name}
                            </span>
                            {p.isFree && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/90 text-white shadow-sm">
                                FREE
                              </span>
                            )}
                          </div>

                          <div className="absolute top-2 right-2">
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-medium bg-slate-950/80 text-slate-300 backdrop-blur border border-slate-800">
                              {p.licenseType}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-2">
                          {/* Seller link */}
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <button
                              onClick={() => updateFilters({ seller: p.seller.storeSlug })}
                              className="inline-flex items-center gap-1 text-slate-400 hover:text-indigo-300 transition-colors truncate max-w-[180px]"
                            >
                              <Store className="w-3 h-3 text-slate-500" />
                              <span>{p.seller.storeName}</span>
                            </button>

                            {/* Rating */}
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span className="font-semibold text-slate-200">
                                {p.ratingAvg > 0 ? p.ratingAvg.toFixed(1) : "New"}
                              </span>
                              {p.reviewsCount > 0 && (
                                <span className="text-slate-500">({p.reviewsCount})</span>
                              )}
                            </div>
                          </div>

                          {/* Title */}
                          <Link href={`/checkout/${p.id}`} className="block">
                            <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                              {p.title}
                            </h4>
                          </Link>

                          {/* Short Description */}
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {p.shortDescription}
                          </p>

                          {/* Tags */}
                          {p.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {p.tags.slice(0, 3).map((tag) => (
                                <button
                                  key={tag}
                                  onClick={() => {
                                    setSearchInput(tag);
                                    updateFilters({ q: tag });
                                  }}
                                  className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                >
                                  #{tag}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="p-4 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                        <div>
                          {p.isFree ? (
                            <span className="text-sm font-extrabold text-emerald-400">Free</span>
                          ) : (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-sm font-extrabold text-white">
                                {formatRupees(p.pricePaise)}
                              </span>
                              {p.discountPricePaise && p.discountPricePaise > p.pricePaise && (
                                <span className="text-xs line-through text-slate-500">
                                  {formatRupees(p.discountPricePaise)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <Link
                          href={`/checkout/${p.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 transition-all active:scale-95"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Buy Now</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── PAGINATION CONTROLS ── */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 border-t border-slate-800">
                <button
                  disabled={meta.page <= 1}
                  onClick={() => updateFilters({ page: String(meta.page - 1) })}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-800 text-slate-300 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="text-xs text-slate-400">
                  Page <strong className="text-white">{meta.page}</strong> of{" "}
                  <strong className="text-white">{meta.totalPages}</strong>
                </div>

                <button
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => updateFilters({ page: String(meta.page + 1) })}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-800 text-slate-300 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
      <MarketplaceFooter />
    </div>
  );
}

export default function ProductsDiscoveryPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#06080d] text-slate-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      }
    >
      <ProductsDiscoveryContent />
    </React.Suspense>
  );
}
