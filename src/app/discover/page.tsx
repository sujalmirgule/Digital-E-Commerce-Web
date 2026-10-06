"use client";

import React, { useState, useEffect, Suspense, useTransition } from "react";
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
  Package,
  ArrowRight,
  Filter,
} from "lucide-react";
import { SpatialBackground } from "@/components/ui/SpatialBackground";
import { MarketplaceNavbar } from "@/components/ui/MarketplaceNavbar";
import { MarketplaceFooter } from "@/components/ui/MarketplaceFooter";
import { ProductCard, ProductCardData } from "@/components/ui/ProductCard";
import { MARKETPLACE_CATEGORIES } from "@/lib/categories";
import { getProducts, DEMO_PRODUCTS } from "@/lib/demo/products";

function DiscoverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Filters from URL query params
  const urlCategory = searchParams.get("category") || "";
  const urlSub = searchParams.get("sub") || "";
  const urlQuery = searchParams.get("query") || searchParams.get("q") || "";
  const urlMinPrice = searchParams.get("minPrice") || searchParams.get("priceMin") || "";
  const urlMaxPrice = searchParams.get("maxPrice") || searchParams.get("priceMax") || "";
  const urlRating = searchParams.get("rating") || "";
  const urlSort = searchParams.get("sort") || "newest";
  const urlPage = parseInt(searchParams.get("page") || "1", 10);

  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(urlQuery);

  // Sync search input if URL changes
  useEffect(() => {
    setSearchInput(urlQuery);
  }, [urlQuery]);

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
          limit: 12,
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
        }
      } catch (err) {
        console.error("Discovery catalog error:", err);
        if (!isCancelled) {
          setProducts([]);
          setTotalCount(0);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchFilteredProducts();
    return () => {
      isCancelled = true;
    };
  }, [urlCategory, urlSub, urlQuery, urlMinPrice, urlMaxPrice, urlRating, urlSort, urlPage]);

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
    urlCategory || urlSub || urlQuery || urlMinPrice || urlMaxPrice || urlRating
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 w-full">
      {/* Header Banner */}
      <div className="mb-10 pb-8 border-b border-[#E6DBD1]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D8BFA5] bg-[#F3E9DD] mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#6B4632]" />
              <span className="text-[11px] font-mono tracking-widest text-[#3B2418] uppercase font-semibold">
                Marketplace Discovery
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif font-medium text-[#111111] tracking-tight">
              Explore Digital Products
            </h1>
            <p className="text-sm text-[#6B4632] mt-2 font-light max-w-xl">
              Discover templates, UI kits, development kits, and resources made by independent creators.
            </p>
          </div>

          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#6B4632]" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search catalog..."
              className="w-full text-xs pl-9 pr-14 py-2.5 rounded-md bg-[#FFFFFF] border border-[#E6DBD1] text-[#111111] placeholder-[#A98165] focus:outline-none focus:border-[#3B2418] transition-all"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 px-3 py-1 text-[11px] font-mono uppercase bg-[#111111] text-[#FFFFFF] rounded hover:bg-[#3B2418] transition-colors"
            >
              Go
            </button>
          </form>
        </div>

        {/* Quick Category Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pt-6 no-scrollbar">
          <button
            onClick={() => updateFilter("category", null)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-colors ${
              !urlCategory
                ? "bg-[#111111] text-[#FFFFFF] font-semibold"
                : "bg-[#FFFFFF] text-[#6B4632] border border-[#E6DBD1] hover:border-[#3B2418]"
            }`}
          >
            All Disciplines
          </button>
          {MARKETPLACE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => updateFilter("category", cat.slug)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-colors ${
                urlCategory.toLowerCase() === cat.slug.toLowerCase()
                  ? "bg-[#111111] text-[#FFFFFF] font-semibold"
                  : "bg-[#FFFFFF] text-[#6B4632] border border-[#E6DBD1] hover:border-[#3B2418]"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar Filters (Desktop) */}
        <aside className="hidden lg:block lg:col-span-1 space-y-6">
          <div className="rounded-xl border border-[#E6DBD1] bg-[#FFFFFF] p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E6DBD1]">
              <span className="font-mono text-xs uppercase tracking-wider text-[#3B2418] font-bold flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#B42318]" />
                Filters
              </span>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-[11px] font-mono text-[#B42318] hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>

            {/* Categories & Subcategories Accordion */}
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-widest text-[#6B4632] block mb-2 font-semibold">
                  Category
                </label>
                <div className="space-y-1.5">
                  {MARKETPLACE_CATEGORIES.map((cat) => {
                    const isSelected = urlCategory.toLowerCase() === cat.slug.toLowerCase();
                    return (
                      <div key={cat.id}>
                        <button
                          type="button"
                          onClick={() => updateFilter("category", isSelected ? null : cat.slug)}
                          className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-[#F3E9DD] text-[#3B2418] font-bold"
                              : "text-[#6B4632] hover:bg-[#FAF8F4] hover:text-[#111111]"
                          }`}
                        >
                          <span>{cat.name}</span>
                          <span className="text-[10px] font-mono text-[#A98165]">
                            {cat.subCategories.length}
                          </span>
                        </button>

                        {/* Subcategories list if selected */}
                        {isSelected && (
                          <div className="pl-4 pt-1 space-y-1 border-l-2 border-[#D8BFA5] my-1 ml-2">
                            {cat.subCategories.map((sub) => {
                              const isSubSelected = urlSub.toLowerCase() === sub.slug.toLowerCase();
                              return (
                                <button
                                  key={sub.slug}
                                  type="button"
                                  onClick={() => updateFilter("sub", isSubSelected ? null : sub.slug)}
                                  className={`w-full text-left text-[11px] py-1 px-1.5 rounded transition-colors ${
                                    isSubSelected
                                      ? "text-[#B42318] font-bold"
                                      : "text-[#6B4632] hover:text-[#111111]"
                                  }`}
                                >
                                  {sub.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Price Tier */}
              <div className="pt-4 border-t border-[#E6DBD1]">
                <label className="text-[11px] font-mono uppercase tracking-widest text-[#6B4632] block mb-2 font-semibold">
                  Price
                </label>
                <div className="space-y-1.5 text-xs">
                  {[
                    { label: "All Prices", min: null, max: null },
                    { label: "Under ₹1,000", min: "0", max: "100000" },
                    { label: "₹1,000 – ₹3,000", min: "100000", max: "300000" },
                    { label: "₹3,000+", min: "300000", max: null },
                  ].map((tier, idx) => {
                    const isSelected =
                      (tier.min === null && !urlMinPrice && !urlMaxPrice) ||
                      (tier.min === urlMinPrice && tier.max === urlMaxPrice);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const next = new URLSearchParams(searchParams.toString());
                          if (tier.min) next.set("minPrice", tier.min);
                          else next.delete("minPrice");
                          if (tier.max) next.set("maxPrice", tier.max);
                          else next.delete("maxPrice");
                          next.delete("page");
                          router.push(`/discover?${next.toString()}`);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                          isSelected
                            ? "bg-[#F3E9DD] text-[#3B2418] font-bold"
                            : "text-[#6B4632] hover:bg-[#FAF8F4] hover:text-[#111111]"
                        }`}
                      >
                        {tier.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rating Filter */}
              <div className="pt-4 border-t border-[#E6DBD1]">
                <label className="text-[11px] font-mono uppercase tracking-widest text-[#6B4632] block mb-2 font-semibold">
                  Minimum Rating
                </label>
                <div className="space-y-1.5 text-xs">
                  {[
                    { label: "Any Rating", val: null },
                    { label: "4.5+ Stars", val: "4.5" },
                    { label: "4.0+ Stars", val: "4.0" },
                  ].map((r, idx) => {
                    const isSelected = (!r.val && !urlRating) || urlRating === r.val;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => updateFilter("rating", r.val)}
                        className={`w-full text-left px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
                          isSelected
                            ? "bg-[#F3E9DD] text-[#3B2418] font-bold"
                            : "text-[#6B4632] hover:bg-[#FAF8F4] hover:text-[#111111]"
                        }`}
                      >
                        {r.val && <Star className="w-3 h-3 fill-[#B42318] text-[#B42318]" />}
                        <span>{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Main Catalog Grid (3 Cols on Desktop) */}
        <section className="lg:col-span-3 space-y-6">
          {/* Toolbar: Count, Mobile filter button & Sort */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#E6DBD1]">
            <div className="flex items-center gap-2 text-xs font-mono text-[#6B4632]">
              <span>Showing</span>
              <strong className="text-[#111111]">{products.length}</strong>
              <span>of</span>
              <strong className="text-[#111111]">{totalCount || products.length}</strong>
              <span>products</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Mobile Filter Toggle */}
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                className="lg:hidden px-3 py-1.5 rounded border border-[#E6DBD1] bg-[#FFFFFF] text-xs font-mono text-[#3B2418] flex items-center gap-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters</span>
              </button>

              {/* Sort Selector */}
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-[#6B4632] hidden sm:inline">Sort:</span>
                <select
                  value={urlSort}
                  onChange={(e) => updateFilter("sort", e.target.value)}
                  className="px-2.5 py-1.5 rounded-md border border-[#E6DBD1] bg-[#FFFFFF] text-xs text-[#111111] focus:outline-none focus:border-[#3B2418]"
                >
                  <option value="newest">Newest Releases</option>
                  <option value="rating">Highest Rated</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-[#6B4632] uppercase">Active:</span>
              {urlCategory && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#F3E9DD] text-[#3B2418] border border-[#D8BFA5]">
                  <span>Category: {urlCategory}</span>
                  <button onClick={() => updateFilter("category", null)} className="hover:text-[#B42318]">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {urlSub && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#F3E9DD] text-[#3B2418] border border-[#D8BFA5]">
                  <span>Sub: {urlSub}</span>
                  <button onClick={() => updateFilter("sub", null)} className="hover:text-[#B42318]">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {urlQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#F3E9DD] text-[#3B2418] border border-[#D8BFA5]">
                  <span>Search: &quot;{urlQuery}&quot;</span>
                  <button onClick={() => updateFilter("query", null)} className="hover:text-[#B42318]">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {urlRating && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#F3E9DD] text-[#3B2418] border border-[#D8BFA5]">
                  <span>Rating: {urlRating}★+</span>
                  <button onClick={() => updateFilter("rating", null)} className="hover:text-[#B42318]">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="text-xs font-mono text-[#B42318] hover:underline ml-1"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-[#E6DBD1] bg-[#FFFFFF] p-5 h-72 animate-pulse flex flex-col justify-between"
                >
                  <div className="w-full h-36 bg-[#F3E9DD] rounded-lg" />
                  <div className="space-y-2 mt-4">
                    <div className="w-3/4 h-4 bg-[#E6DBD1] rounded" />
                    <div className="w-1/2 h-3 bg-[#F3E9DD] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="p-16 text-center rounded-xl border border-[#E6DBD1] bg-[#FFFFFF]">
              <Package className="w-12 h-12 text-[#6B4632] mx-auto mb-3" />
              <h3 className="font-serif text-xl text-[#111111]">No matching products found</h3>
              <p className="text-xs text-[#6B4632] mt-1.5 font-light max-w-sm mx-auto">
                We couldn&apos;t find any assets matching your active filters. Try expanding your search or clearing filters.
              </p>
              <button
                onClick={clearAllFilters}
                className="mt-5 px-5 py-2.5 rounded-md text-xs font-mono uppercase tracking-wider bg-[#111111] text-[#FFFFFF] hover:bg-[#3B2418] transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          )}

          {/* Bottom Callout */}
          <div className="mt-12 p-8 rounded-xl border border-[#D8BFA5] bg-[#F3E9DD]/60 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-serif text-lg font-medium text-[#111111]">
                Have a digital product ready to publish?
              </h3>
              <p className="text-xs text-[#6B4632] mt-1 font-light">
                Join our marketplace, list your assets, and earn 90% of every customer purchase.
              </p>
            </div>
            <Link
              href="/signup/seller"
              className="px-6 py-2.5 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#FFFFFF] bg-[#111111] hover:bg-[#3B2418] transition-colors shrink-0"
            >
              Start Selling →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <SpatialBackground>
      <MarketplaceNavbar />
      <main className="flex-1 w-full pt-16 sm:pt-20">
        <Suspense fallback={<div className="p-12 text-center text-xs font-mono text-[#6B4632]">Loading catalog discovery...</div>}>
          <DiscoverContent />
        </Suspense>
      </main>
      <MarketplaceFooter />
    </SpatialBackground>
  );
}
