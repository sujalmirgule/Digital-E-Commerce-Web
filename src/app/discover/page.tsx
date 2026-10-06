"use client";

import React, { useState, useEffect, Suspense, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  X,
  Star,
  ChevronDown,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Filter,
  Layers,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Store,
} from "lucide-react";
import { SpatialBackground } from "@/components/ui/SpatialBackground";
import { MarketplaceNavbar } from "@/components/ui/MarketplaceNavbar";
import { MarketplaceFooter } from "@/components/ui/MarketplaceFooter";
import { ProductCard, ProductCardData } from "@/components/ui/ProductCard";
import { MARKETPLACE_CATEGORIES } from "@/lib/categories";
import { getProducts } from "@/lib/demo/products";

const PRIMARY_NAV_CATEGORIES = MARKETPLACE_CATEGORIES.slice(0, 9);
const MORE_NAV_CATEGORIES = MARKETPLACE_CATEGORIES.slice(9);

function DiscoverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Filters from URL
  const urlCategory = searchParams.get("category") || "";
  const urlQuery = searchParams.get("query") || searchParams.get("q") || "";
  const urlMinPrice = searchParams.get("minPrice") || searchParams.get("priceMin") || "";
  const urlMaxPrice = searchParams.get("maxPrice") || searchParams.get("priceMax") || "";
  const urlRating = searchParams.get("rating") || "";
  const urlSort = searchParams.get("sort") || "newest";
  const urlPage = parseInt(searchParams.get("page") || "1", 10);

  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(urlQuery);
  const [moreOpen, setMoreOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Sync search input with URL
  useEffect(() => {
    setSearchInput(urlQuery);
  }, [urlQuery]);

  // Click outside to close More dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch real products matching query filters
  useEffect(() => {
    let isCancelled = false;
    async function fetchFilteredProducts() {
      setLoading(true);
      try {
        const result = await getProducts({
          category: urlCategory,
          query: urlQuery,
          sort: urlSort,
          page: urlPage,
          limit: 16,
          allowDemoFallback: true,
        });

        if (!isCancelled) {
          let list = result.products as ProductCardData[];

          // Apply client-side price filter if present and fallback mode
          if (result.isFallback) {
            if (urlMinPrice) {
              const min = parseInt(urlMinPrice, 10);
              list = list.filter((p) => p.pricePaise >= min);
            }
            if (urlMaxPrice) {
              const max = parseInt(urlMaxPrice, 10);
              list = list.filter((p) => p.pricePaise <= max);
            }
            if (urlRating) {
              const r = parseFloat(urlRating);
              list = list.filter((p) => (p.ratingAvg || 0) >= r);
            }
          }

          setProducts(list);
          setTotalCount(result.total);
          setTotalPages(Math.max(1, Math.ceil(result.total / 16)));
        }
      } catch (err) {
        console.error("Discovery catalog error:", err);
        if (!isCancelled) {
          setProducts([]);
          setTotalCount(0);
          setTotalPages(1);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchFilteredProducts();
    return () => {
      isCancelled = true;
    };
  }, [urlCategory, urlQuery, urlMinPrice, urlMaxPrice, urlRating, urlSort, urlPage]);

  // Apply filters to URL
  const updateFilter = (key: string, value: string | null) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (value === null || value === "" || value === "all") {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }
    // Reset page to 1 on filter change
    if (key !== "page") {
      nextParams.delete("page");
    }
    startTransition(() => {
      router.push(`/discover?${nextParams.toString()}`);
    });
  };

  const clearAllFilters = () => {
    setSearchInput("");
    startTransition(() => {
      router.push("/discover");
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter("query", searchInput.trim() || null);
  };

  const hasActiveFilters = Boolean(
    urlCategory || urlQuery || urlMinPrice || urlMaxPrice || urlRating
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 w-full">
      {/* ============================================================== */}
      {/* 1. DISCOVER HEADER                                             */}
      {/* ============================================================== */}
      <div className="mb-10 pb-8 border-b border-[#C8AA91]/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#C8AA91]/70 bg-[#F2E7DB] mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#C46A4A]" />
              <span className="text-[11px] font-sans font-bold tracking-widest text-[#3B261C] uppercase">
                Digital Marketplace Discovery
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-sans font-extrabold text-[#151311] tracking-tight">
              Explore Digital Products
            </h1>
            <p className="text-sm sm:text-base text-[#684332] mt-2 font-normal max-w-xl">
              Inspect verified code templates, Figma UI systems, audio packs, and handbooks created by independent makers.
            </p>
          </div>

          {/* Search + Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#8A6048]" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search digital products..."
                className="w-full text-xs sm:text-sm pl-10 pr-14 py-3 rounded-xl bg-[#FFFFFF] border border-[#C8AA91] text-[#151311] placeholder-[#8A6048]/70 focus:outline-none focus:border-[#3B261C] focus:ring-1 focus:ring-[#3B261C]/30 transition-all font-medium"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 px-3 py-1.5 text-xs font-bold uppercase bg-[#3B261C] text-[#FAF7F2] rounded-lg hover:bg-[#684332] transition-colors"
              >
                Go
              </button>
            </form>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/dashboard"
                className="px-4 py-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider text-[#3B261C] bg-[#FAF7F2] border border-[#C8AA91] hover:bg-[#F2E7DB] transition-all flex items-center gap-1.5"
              >
                <BookOpen className="w-4 h-4 text-[#8A6048]" />
                <span>Library</span>
              </Link>
              <Link
                href="/signup/seller"
                className="px-4.5 py-3 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#FAF7F2] bg-[#3B261C] hover:bg-[#684332] transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Store className="w-4 h-4 text-[#C46A4A]" />
                <span>Start Selling</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. CATEGORY NAVIGATION BAR WITH MORE ▼ DROPDOWN                */}
        {/* ============================================================== */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {/* All Button */}
          <button
            onClick={() => updateFilter("category", null)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-[13px] font-bold whitespace-nowrap transition-all border ${
              !urlCategory
                ? "bg-[#3B261C] text-[#FAF7F2] border-[#3B261C] shadow-sm"
                : "bg-[#FFFFFF] text-[#3B261C] border-[#C8AA91]/60 hover:bg-[#F2E7DB]"
            }`}
          >
            All Products
          </button>

          {/* Primary Category Pills */}
          {PRIMARY_NAV_CATEGORIES.map((cat) => {
            const isSelected = urlCategory.toLowerCase() === cat.slug.toLowerCase();
            return (
              <button
                key={cat.id}
                onClick={() => updateFilter("category", cat.slug)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-[13px] font-bold whitespace-nowrap transition-all border ${
                  isSelected
                    ? "bg-[#3B261C] text-[#FAF7F2] border-[#3B261C] shadow-sm"
                    : "bg-[#FFFFFF] text-[#3B261C] border-[#C8AA91]/60 hover:bg-[#F2E7DB]"
                }`}
              >
                {cat.name}
              </button>
            );
          })}

          {/* MORE ▼ MEGA DROPDOWN */}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen(!moreOpen)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-[13px] font-bold whitespace-nowrap flex items-center gap-1.5 transition-all border ${
                moreOpen || MORE_NAV_CATEGORIES.some((c) => c.slug.toLowerCase() === urlCategory.toLowerCase())
                  ? "bg-[#F2E7DB] text-[#3B261C] border-[#3B261C]"
                  : "bg-[#FFFFFF] text-[#3B261C] border-[#C8AA91]/60 hover:bg-[#F2E7DB]"
              }`}
            >
              <span>More Categories</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
            </button>

            {moreOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 rounded-2xl border border-[#C8AA91] bg-[#FFFFFF] p-3 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A6048] px-3 py-1.5 block">
                  Additional Disciplines
                </span>
                <div className="space-y-1 mt-1">
                  {MORE_NAV_CATEGORIES.map((c) => {
                    const isSelected = urlCategory.toLowerCase() === c.slug.toLowerCase();
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          updateFilter("category", c.slug);
                          setMoreOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                          isSelected
                            ? "bg-[#3B261C] text-[#FAF7F2]"
                            : "text-[#3B261C] hover:bg-[#F2E7DB]"
                        }`}
                      >
                        <span>{c.name}</span>
                        <ArrowRight className="w-3 h-3 opacity-60" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. TOOLBAR (Sort, Result Count, Filter Toggles)                */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-[#E6DBD1]">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-[#8A6048]">
          <span>Showing</span>
          <strong className="text-[#151311] font-extrabold">{products.length}</strong>
          <span>of</span>
          <strong className="text-[#151311] font-extrabold">{totalCount || products.length}</strong>
          <span>digital products</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Price & Rating Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setFilterDrawerOpen(!filterDrawerOpen)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              filterDrawerOpen
                ? "bg-[#3B261C] text-[#FAF7F2] border-[#3B261C]"
                : "border-[#C8AA91]/70 bg-[#FFFFFF] text-[#3B261C] hover:bg-[#F2E7DB]"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Price & Rating Filters</span>
          </button>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#3B261C]">
            <span className="hidden sm:inline text-[#8A6048]">Sort:</span>
            <select
              value={urlSort}
              onChange={(e) => updateFilter("sort", e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#C8AA91]/70 bg-[#FFFFFF] text-xs font-bold text-[#151311] focus:outline-none focus:border-[#3B261C]"
            >
              <option value="newest">Newest Releases</option>
              <option value="rating">Highest Rated</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Collapsible Filter Bar */}
      {filterDrawerOpen && (
        <div className="p-5 rounded-2xl border border-[#C8AA91]/70 bg-[#FAF7F2] mb-8 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-[#E6DBD1] pb-3">
            <span className="text-xs uppercase font-extrabold tracking-wider text-[#3B261C] flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#A94432]" />
              Refine Pricing & Rating
            </span>
            <button
              onClick={() => setFilterDrawerOpen(false)}
              className="text-xs text-[#8A6048] hover:text-[#151311]"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Price Tiers */}
            <div>
              <span className="text-xs font-bold text-[#3B261C] block mb-2">Price Range</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "All Prices", min: null, max: null },
                  { label: "Under ₹500", min: null, max: "50000" },
                  { label: "₹500 – ₹1,500", min: "50000", max: "150000" },
                  { label: "₹1,500 – ₹3,000", min: "150000", max: "300000" },
                  { label: "₹3,000+", min: "300000", max: null },
                ].map((tier, idx) => {
                  const isSelected =
                    (!tier.min && !tier.max && !urlMinPrice && !urlMaxPrice) ||
                    (tier.min === urlMinPrice && tier.max === urlMaxPrice);
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        const next = new URLSearchParams(searchParams.toString());
                        if (tier.min) next.set("minPrice", tier.min);
                        else next.delete("minPrice");
                        if (tier.max) next.set("maxPrice", tier.max);
                        else next.delete("maxPrice");
                        next.delete("page");
                        router.push(`/discover?${next.toString()}`);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        isSelected
                          ? "bg-[#3B261C] text-[#FAF7F2] border-[#3B261C]"
                          : "bg-[#FFFFFF] text-[#3B261C] border-[#C8AA91]/60 hover:bg-[#F2E7DB]"
                      }`}
                    >
                      {tier.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rating */}
            <div>
              <span className="text-xs font-bold text-[#3B261C] block mb-2">Customer Rating</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "All Ratings", val: null },
                  { label: "4.5★ & Above", val: "4.5" },
                  { label: "4.8★ & Above", val: "4.8" },
                ].map((r, idx) => {
                  const isSelected = (!r.val && !urlRating) || urlRating === r.val;
                  return (
                    <button
                      key={idx}
                      onClick={() => updateFilter("rating", r.val)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1 transition-all ${
                        isSelected
                          ? "bg-[#3B261C] text-[#FAF7F2] border-[#3B261C]"
                          : "bg-[#FFFFFF] text-[#3B261C] border-[#C8AA91]/60 hover:bg-[#F2E7DB]"
                      }`}
                    >
                      {r.val && <Star className="w-3 h-3 fill-[#C46A4A] text-[#C46A4A]" />}
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs font-bold uppercase text-[#8A6048]">Active Filters:</span>
          {urlCategory && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F2E7DB] text-[#3B261C] border border-[#C8AA91]">
              <span>Category: {urlCategory}</span>
              <button onClick={() => updateFilter("category", null)} className="hover:text-[#A94432]">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}
          {urlQuery && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F2E7DB] text-[#3B261C] border border-[#C8AA91]">
              <span>Search: &quot;{urlQuery}&quot;</span>
              <button onClick={() => updateFilter("query", null)} className="hover:text-[#A94432]">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}
          {urlRating && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F2E7DB] text-[#3B261C] border border-[#C8AA91]">
              <span>Rating: {urlRating}★+</span>
              <button onClick={() => updateFilter("rating", null)} className="hover:text-[#A94432]">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}
          <button
            onClick={clearAllFilters}
            className="text-xs font-bold text-[#A94432] hover:underline ml-2"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. PRODUCT GRID (4 COLS DESKTOP, 2-3 TABLET, 1-2 MOBILE)       */}
      {/* ============================================================== */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[#C8AA91]/50 bg-[#FFFFFF] p-5 h-80 animate-pulse flex flex-col justify-between"
            >
              <div className="w-full h-44 bg-[#F2E7DB] rounded-xl" />
              <div className="space-y-2 mt-4">
                <div className="w-3/4 h-5 bg-[#E6DBD1] rounded-lg" />
                <div className="w-1/2 h-4 bg-[#E6DBD1] rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center rounded-3xl border border-dashed border-[#C8AA91] bg-[#FFFFFF] p-8 max-w-lg mx-auto">
          <Layers className="w-12 h-12 text-[#8A6048] mx-auto mb-4" />
          <h3 className="text-xl font-sans font-bold text-[#151311]">No products found</h3>
          <p className="text-sm text-[#684332] mt-2 mb-6">
            We couldn&apos;t find any digital products matching your active filters.
          </p>
          <button
            onClick={clearAllFilters}
            className="px-6 py-2.5 rounded-xl bg-[#3B261C] text-[#FAF7F2] font-bold text-xs uppercase"
          >
            Clear Filters & View Catalog
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. PAGINATION                                                  */}
      {/* ============================================================== */}
      {totalPages > 1 && (
        <div className="mt-14 pt-8 border-t border-[#E6DBD1] flex items-center justify-between">
          <button
            disabled={urlPage <= 1}
            onClick={() => updateFilter("page", String(urlPage - 1))}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#C8AA91] bg-[#FFFFFF] text-xs font-bold text-[#3B261C] hover:bg-[#F2E7DB] disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-xs font-bold text-[#8A6048]">
            Page {urlPage} of {totalPages}
          </span>

          <button
            disabled={urlPage >= totalPages}
            onClick={() => updateFilter("page", String(urlPage + 1))}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#C8AA91] bg-[#FFFFFF] text-xs font-bold text-[#3B261C] hover:bg-[#F2E7DB] disabled:opacity-40 disabled:pointer-events-none"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <SpatialBackground>
      <MarketplaceNavbar />
      <main className="flex-1 w-full pt-[73px]">
        <Suspense
          fallback={
            <div className="max-w-7xl mx-auto px-4 py-24 text-center">
              <span className="text-sm font-bold text-[#8A6048] animate-pulse">
                Loading marketplace catalog...
              </span>
            </div>
          }
        >
          <DiscoverContent />
        </Suspense>
      </main>
      <MarketplaceFooter />
    </SpatialBackground>
  );
}
