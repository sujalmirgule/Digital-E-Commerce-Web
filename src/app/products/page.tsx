"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
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
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function ProductsDiscoveryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Active query filters from URL
  const urlQ = searchParams.get("q") || "";
  const urlCategory = searchParams.get("category") || "";
  const urlMinPrice = searchParams.get("priceMin") || "";
  const urlMaxPrice = searchParams.get("priceMax") || "";
  const urlRating = searchParams.get("rating") || "";
  const urlSeller = searchParams.get("seller") || "";
  const urlSort = searchParams.get("sort") || "newest";
  const urlLicense = searchParams.get("licenseType") || "";
  const urlPage = parseInt(searchParams.get("page") || "1", 10);

  // Local state
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [meta, setMeta] = useState<MetaPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search input state
  const [searchInput, setSearchInput] = useState(urlQ);

  // Price range local state
  const [minPriceInput, setMinPriceInput] = useState(
    urlMinPrice ? String(parseInt(urlMinPrice, 10) / 100) : ""
  );
  const [maxPriceInput, setMaxPriceInput] = useState(
    urlMaxPrice ? String(parseInt(urlMaxPrice, 10) / 100) : ""
  );

  // Mobile drawer filter state
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Synchronize search input if URL changes
  useEffect(() => {
    setSearchInput(urlQ);
  }, [urlQ]);

  // Update URL helper with shallow transitions
  const updateFilters = useCallback(
    (newParams: Record<string, string | null>) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));

      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === "") {
          current.delete(key);
        } else {
          current.set(key, value);
        }
      });

      // Always reset to page 1 on filter changes unless changing page directly
      if (!newParams.page) {
        current.delete("page");
      }

      const search = current.toString();
      const query = search ? `?${search}` : "";
      startTransition(() => {
        router.push(`/products${query}`, { scroll: false });
      });
    },
    [router, searchParams]
  );

  // Fetch products from authoritative API
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (!params.has("limit")) params.set("limit", "12");

      const res = await fetch(`/api/v1/products?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load products");
      }

      setProducts(json.data.products || []);
      setMeta(json.data.pagination || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  // Fetch categories once on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/v1/categories");
        const json = await res.json();
        if (res.ok && json.success) {
          setCategories(json.data.categories || []);
        }
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    }
    loadCategories();
  }, []);

  // Re-fetch products whenever query string updates
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchInput.trim() || null });
  };

  // Handle Price Range Submission
  const handlePriceApply = (e: React.FormEvent) => {
    e.preventDefault();
    const minPaise = minPriceInput ? String(Math.round(parseFloat(minPriceInput) * 100)) : null;
    const maxPaise = maxPriceInput ? String(Math.round(parseFloat(maxPriceInput) * 100)) : null;
    updateFilters({ priceMin: minPaise, priceMax: maxPaise });
  };

  // Clear all filters
  const handleClearAllFilters = () => {
    setSearchInput("");
    setMinPriceInput("");
    setMaxPriceInput("");
    startTransition(() => {
      router.push("/products");
    });
  };

  const formatRupees = (paise: number) => {
    return `₹${(paise / 100).toLocaleString("en-IN")}`;
  };

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
    <div className="min-h-screen bg-velvet-plum text-velvet-cream-soft font-sans">
      <MarketplaceNavbar />

      {/* ── Top Hero / Editorial Header ── */}
      <div className="relative border-b border-velvet-border/80 bg-gradient-to-b from-velvet-plum via-velvet-mocha/40 to-velvet-plum px-4 pt-32 pb-12 sm:px-6 sm:pb-16">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-serif font-medium bg-velvet-rose/10 text-velvet-rose border border-velvet-rose/25">
                <Sparkles className="w-3.5 h-3.5" />
                Curated Marketplace Collection
              </span>
              <span className="hidden sm:inline-block text-xs text-velvet-cream-muted font-light">
                Verified Creator Assets
              </span>
            </div>
            <Link
              href="/"
              className="text-xs text-velvet-cream-muted hover:text-velvet-cream px-3 py-1.5 rounded-xl border border-velvet-border hover:bg-velvet-mocha transition-colors"
            >
              ← Back to Home
            </Link>
          </div>

          <h1 className="text-3xl sm:text-5xl font-serif font-normal text-velvet-cream-soft tracking-tight">
            Worth discovering.
          </h1>
          <p className="text-xs sm:text-sm text-velvet-cream-muted max-w-2xl font-light">
            A curated collection of digital assets, templates, design systems, and developer kits
            crafted by independent creators.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative max-w-3xl pt-2">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-velvet-cream-muted pointer-events-none" />
              <input
                id="search-input"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search templates, UI kits, notion setups, codebases..."
                maxLength={100}
                className="w-full bg-velvet-mocha border border-velvet-border rounded-2xl pl-12 pr-28 py-3.5 text-sm text-velvet-cream placeholder-velvet-cream-muted/50 focus:outline-none focus:border-velvet-cream/60 shadow-xl transition-all font-light"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    updateFilters({ q: null });
                  }}
                  className="absolute right-24 p-1.5 text-velvet-cream-muted hover:text-white rounded-md transition-colors"
                  title="Clear search query"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                id="search-button"
                className="absolute right-2 px-5 py-2 rounded-xl text-xs font-semibold bg-velvet-rose hover:bg-velvet-rose-soft text-white transition-all shadow-md shadow-velvet-rose/25 active:scale-95"
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
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  !urlCategory
                    ? "bg-velvet-rose text-white shadow-sm"
                    : "bg-velvet-mocha text-velvet-cream-muted border border-velvet-border hover:bg-velvet-mocha-elevated hover:text-velvet-cream"
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
                    className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-velvet-rose text-white shadow-sm"
                        : "bg-velvet-mocha text-velvet-cream-muted border border-velvet-border hover:bg-velvet-mocha-elevated hover:text-velvet-cream"
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className="text-[10px] opacity-70 px-1.5 py-0.5 rounded-full bg-velvet-plum">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── DESKTOP SIDEBAR FILTERS ── */}
          <aside className="hidden lg:block w-72 flex-shrink-0 space-y-6">
            <div className="p-6 rounded-3xl border border-velvet-border/80 bg-velvet-mocha sticky top-24 space-y-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-velvet-border/60">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-velvet-cream" />
                  <span className="text-sm font-serif font-medium text-velvet-cream-soft">Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-velvet-rose/20 text-velvet-rose border border-velvet-rose/30">
                      {activeFiltersCount}
                    </span>
                  )}
                </div>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={handleClearAllFilters}
                    className="text-xs text-velvet-rose hover:text-velvet-rose-soft transition-colors font-medium"
                  >
                    Reset All
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs font-serif font-medium text-velvet-cream mb-2">
                  Category
                </label>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  <button
                    onClick={() => updateFilters({ category: null })}
                    className={`w-full flex items-center justify-between text-xs px-3 py-1.5 rounded-xl text-left transition-colors ${
                      !urlCategory
                        ? "bg-velvet-rose/15 text-velvet-rose font-medium border border-velvet-rose/25"
                        : "text-velvet-cream-muted hover:bg-velvet-plum hover:text-velvet-cream"
                    }`}
                  >
                    <span>All Products</span>
                    {!urlCategory && <Check className="w-3.5 h-3.5 text-velvet-rose" />}
                  </button>
                  {categories.map((c) => {
                    const isSelected = urlCategory === c.slug || urlCategory === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => updateFilters({ category: isSelected ? null : c.slug })}
                        className={`w-full flex items-center justify-between text-xs px-3 py-1.5 rounded-xl text-left transition-colors ${
                          isSelected
                            ? "bg-velvet-rose/15 text-velvet-rose font-medium border border-velvet-rose/25"
                            : "text-velvet-cream-muted hover:bg-velvet-plum hover:text-velvet-cream"
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        <span className="text-[10px] text-velvet-cream-muted">{c.productCount}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Filter */}
              <div className="border-t border-velvet-border/60 pt-4">
                <label className="block text-xs font-serif font-medium text-velvet-cream mb-2">
                  Price Range
                </label>

                <form onSubmit={handlePriceApply} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-velvet-cream-muted">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Min"
                        value={minPriceInput}
                        onChange={(e) => setMinPriceInput(e.target.value)}
                        className="w-full pl-6 pr-2 py-1.5 text-xs rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream placeholder-velvet-cream-muted/40 focus:outline-none focus:border-velvet-cream"
                      />
                    </div>
                    <span className="text-velvet-cream-muted text-xs">-</span>
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-velvet-cream-muted">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Max"
                        value={maxPriceInput}
                        onChange={(e) => setMaxPriceInput(e.target.value)}
                        className="w-full pl-6 pr-2 py-1.5 text-xs rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream placeholder-velvet-cream-muted/40 focus:outline-none focus:border-velvet-cream"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 rounded-xl bg-velvet-plum hover:bg-velvet-mocha-elevated text-velvet-cream border border-velvet-border text-xs font-medium transition-colors"
                  >
                    Apply Filter
                  </button>
                </form>
              </div>

              {/* License Type */}
              <div className="border-t border-velvet-border/60 pt-4">
                <label className="block text-xs font-serif font-medium text-velvet-cream mb-2">
                  License
                </label>
                <div className="space-y-1">
                  {[
                    { label: "Standard License", val: "STANDARD" },
                    { label: "Commercial License", val: "COMMERCIAL" },
                    { label: "Extended License", val: "EXTENDED" },
                  ].map((lic) => {
                    const isSelected = urlLicense === lic.val;
                    return (
                      <button
                        key={lic.label}
                        onClick={() => updateFilters({ licenseType: isSelected ? null : lic.val })}
                        className={`w-full flex items-center justify-between text-xs px-3 py-1.5 rounded-xl text-left transition-colors ${
                          isSelected
                            ? "bg-velvet-rose/15 text-velvet-rose font-medium border border-velvet-rose/25"
                            : "text-velvet-cream-muted hover:bg-velvet-plum hover:text-velvet-cream"
                        }`}
                      >
                        <span>{lic.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-velvet-rose" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* ── MAIN RESULTS AREA ── */}
          <main className="flex-1 space-y-6">
            {/* Top Results Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-velvet-border/80 bg-velvet-mocha">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
                  className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-velvet-plum text-velvet-cream border border-velvet-border"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-velvet-rose text-white text-[10px]">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
                <div className="text-xs text-velvet-cream-muted">
                  {loading ? (
                    <span>Searching catalog...</span>
                  ) : (
                    <span>
                      Found <strong className="text-velvet-cream-soft font-serif">{meta?.total ?? products.length}</strong>{" "}
                      curated items
                    </span>
                  )}
                </div>
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-xs text-velvet-cream-muted flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  Sort:
                </span>
                <select
                  id="sort-select"
                  value={urlSort}
                  onChange={(e) => updateFilters({ sort: e.target.value })}
                  className="bg-velvet-plum border border-velvet-border rounded-xl px-3 py-1.5 text-xs text-velvet-cream focus:outline-none focus:border-velvet-cream"
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

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-2xl border border-rose-900/50 bg-velvet-mocha text-rose-300 text-xs flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={fetchProducts}
                  className="px-3 py-1 rounded-lg bg-velvet-rose text-white font-medium"
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
                    className="animate-pulse rounded-2xl border border-velvet-border/80 bg-velvet-mocha p-4 space-y-3"
                  >
                    <div className="h-44 bg-velvet-plum rounded-xl" />
                    <div className="h-4 bg-velvet-plum rounded w-3/4" />
                    <div className="h-3 bg-velvet-plum rounded w-full" />
                    <div className="h-3 bg-velvet-plum rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              /* Empty State */
              <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-velvet-border/80 bg-velvet-mocha/40 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-velvet-plum flex items-center justify-center text-velvet-cream-muted">
                  <Search className="w-8 h-8 opacity-60" />
                </div>
                <h3 className="font-serif text-base text-velvet-cream-soft">No products found</h3>
                <p className="text-xs text-velvet-cream-muted max-w-sm mx-auto">
                  We couldn&apos;t find any products matching your active search and filter criteria.
                  Try modifying your keywords or resetting filters.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleClearAllFilters}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold bg-velvet-rose hover:bg-velvet-rose-soft text-white transition-all shadow-md shadow-velvet-rose/20"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset All Filters</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Product Cards Grid matching Velvet Market Design */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((p) => {
                  return (
                    <div
                      key={p.id}
                      className="group flex flex-col justify-between rounded-2xl border border-velvet-border/80 bg-velvet-mocha hover:border-velvet-cream/40 transition-all duration-300 overflow-hidden shadow-sm"
                    >
                      <div>
                        {/* Thumbnail */}
                        <div className="relative aspect-[16/10] w-full bg-velvet-plum overflow-hidden">
                          {p.thumbnailUrl ? (
                            <Image
                              src={p.thumbnailUrl}
                              alt={p.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-velvet-cream-muted bg-velvet-plum p-4 text-center">
                              <Layers className="w-8 h-8 text-velvet-cream mb-1" />
                              <span className="text-[11px] font-serif text-velvet-cream-soft">
                                {p.category.name}
                              </span>
                            </div>
                          )}

                          {/* Top Badges */}
                          <div className="absolute top-3 left-3 flex items-center gap-1.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-velvet-plum/90 text-velvet-cream backdrop-blur-md border border-velvet-border">
                              {p.category.name}
                            </span>
                          </div>

                          <div className="absolute top-3 right-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono bg-velvet-plum/90 text-velvet-cream-muted backdrop-blur-md border border-velvet-border">
                              {p.licenseType}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-2.5">
                          {/* Seller link */}
                          <div className="flex items-center justify-between text-[11px] text-velvet-cream-muted">
                            <button
                              onClick={() => updateFilters({ seller: p.seller.storeSlug })}
                              className="inline-flex items-center gap-1 text-velvet-cream-muted hover:text-velvet-cream transition-colors truncate max-w-[180px]"
                            >
                              <Store className="w-3 h-3 text-velvet-rose" />
                              <span>by {p.seller.storeName}</span>
                            </button>

                            {/* Rating */}
                            <div className="flex items-center gap-1 text-amber-400">
                              <Star className="w-3 h-3 fill-amber-400" />
                              <span className="font-medium text-velvet-cream-soft text-xs">
                                {p.ratingAvg > 0 ? p.ratingAvg.toFixed(1) : "5.0"}
                              </span>
                              {p.reviewsCount > 0 && (
                                <span className="text-velvet-cream-muted text-[10px]">({p.reviewsCount})</span>
                              )}
                            </div>
                          </div>

                          {/* Title */}
                          <Link href={`/products/${p.slug}`} className="block">
                            <h4 className="text-base font-serif font-medium text-velvet-cream-soft group-hover:text-velvet-cream transition-colors line-clamp-1">
                              {p.title}
                            </h4>
                          </Link>

                          {/* Short Description */}
                          <p className="text-xs text-velvet-cream-muted line-clamp-2 leading-relaxed font-light">
                            {p.shortDescription}
                          </p>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="p-5 pt-3 border-t border-velvet-border/60 flex items-center justify-between">
                        <div>
                          {p.isFree ? (
                            <span className="text-sm font-serif font-medium text-emerald-400">Free</span>
                          ) : (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-base font-serif font-medium text-velvet-cream">
                                {formatRupees(p.pricePaise)}
                              </span>
                              {p.discountPricePaise && p.discountPricePaise > p.pricePaise && (
                                <span className="text-xs line-through text-velvet-cream-muted font-mono">
                                  {formatRupees(p.discountPricePaise)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <Link
                          href={`/products/${p.slug}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-velvet-rose hover:bg-velvet-rose-soft text-white shadow-sm shadow-velvet-rose/20 transition-all active:scale-95"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>View Product</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── PAGINATION CONTROLS ── */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between pt-8 border-t border-velvet-border/80">
                <button
                  disabled={meta.page <= 1}
                  onClick={() => updateFilters({ page: String(meta.page - 1) })}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-medium border border-velvet-border bg-velvet-mocha text-velvet-cream hover:border-velvet-cream/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="text-xs text-velvet-cream-muted">
                  Page <strong className="text-velvet-cream-soft">{meta.page}</strong> of{" "}
                  <strong className="text-velvet-cream-soft">{meta.totalPages}</strong>
                </div>

                <button
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => updateFilters({ page: String(meta.page + 1) })}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-medium border border-velvet-border bg-velvet-mocha text-velvet-cream hover:border-velvet-cream/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
        <div className="min-h-screen bg-velvet-plum text-velvet-cream-soft flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-velvet-rose" />
        </div>
      }
    >
      <ProductsDiscoveryContent />
    </React.Suspense>
  );
}
