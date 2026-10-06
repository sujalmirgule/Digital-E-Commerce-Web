"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  Store,
  Layers,
  BookOpen,
  Music,
  LayoutTemplate,
  Box,
  Compass,
  Code,
  Sparkles,
  Palette,
  Briefcase,
  GraduationCap,
  Camera,
  PenTool,
  Download,
  ShieldCheck,
  Star,
  CheckCircle2,
  X,
} from "lucide-react";
import { SpatialBackground } from "@/components/ui/SpatialBackground";
import { MarketplaceNavbar } from "@/components/ui/MarketplaceNavbar";
import { MarketplaceFooter } from "@/components/ui/MarketplaceFooter";
import { ProductCard, ProductCardData } from "@/components/ui/ProductCard";
import { getProducts, DEMO_PRODUCTS } from "@/lib/demo/products";

// Curated Category Pills for EXPLORE BY CATEGORY section
const EXPLORE_CATEGORIES = [
  { name: "Design", slug: "design", icon: Palette },
  { name: "Development", slug: "development", icon: Code },
  { name: "Music", slug: "creative", sub: "music", icon: Music },
  { name: "Books", slug: "education", sub: "e-books", icon: BookOpen },
  { name: "3D", slug: "design", sub: "3d-assets", icon: Box },
  { name: "Education", slug: "education", icon: GraduationCap },
  { name: "Business", slug: "business", icon: Briefcase },
  { name: "Photography", slug: "creative", sub: "photography", icon: Camera },
  { name: "AI", slug: "ai", icon: Sparkles },
  { name: "Templates", slug: "templates", icon: LayoutTemplate },
  { name: "Writing", slug: "education", sub: "guides", icon: PenTool },
];

// Interactive Filter Pills for inline DISCOVER section
const DISCOVER_FILTER_PILLS = [
  { label: "All", value: "all" },
  { label: "Design", value: "design" },
  { label: "Development", value: "development" },
  { label: "Music", value: "music" },
  { label: "Education", value: "education" },
  { label: "3D", value: "3d" },
  { label: "AI", value: "ai" },
];

export default function HomePage() {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  // Discover section interactive search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPill, setSelectedPill] = useState("all");

  useEffect(() => {
    async function loadProducts() {
      try {
        const result = await getProducts({ limit: 24, allowDemoFallback: true });
        setProducts(result.products as ProductCardData[]);
      } catch (err) {
        console.error("Failed to load products for homepage:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  // Four featured archetypes matching wireframe: Website, Music Pack, Book, 3D Assets
  const featuredProducts = useMemo(() => {
    const list = products.length > 0 ? products : (DEMO_PRODUCTS as unknown as ProductCardData[]);
    return list.slice(0, 4);
  }, [products]);

  // Dynamic products filtered for the interactive DISCOVER section (4 cols x 2 rows = 8 items)
  const discoverFilteredProducts = useMemo(() => {
    const sourceList = products.length > 0 ? products : (DEMO_PRODUCTS as unknown as ProductCardData[]);
    return sourceList.filter((p) => {
      // 1. Category pill filter
      if (selectedPill !== "all") {
        const pillLower = selectedPill.toLowerCase();
        const catName = p.category?.name?.toLowerCase() || "";
        const catSlug = p.category?.slug?.toLowerCase() || "";
        const titleLower = p.title.toLowerCase();

        const matchesCategory =
          catName.includes(pillLower) ||
          catSlug.includes(pillLower) ||
          titleLower.includes(pillLower) ||
          (p.shortDescription || "").toLowerCase().includes(pillLower);

        if (!matchesCategory) return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchDesc = (p.shortDescription || "").toLowerCase().includes(q);
        const matchCat = (p.category?.name || "").toLowerCase().includes(q);
        const matchSeller = (p.seller?.storeName || "").toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCat && !matchSeller) return false;
      }

      return true;
    }).slice(0, 8);
  }, [products, selectedPill, searchQuery]);

  return (
    <SpatialBackground>
      {/* ============================================================ */}
      {/* 1. HEADER / NAVBAR                                           */}
      {/* ============================================================ */}
      <MarketplaceNavbar />

      <main className="flex-1 w-full pt-16 sm:pt-20">
        {/* ============================================================ */}
        {/* 2. HERO SECTION                                              */}
        {/* ============================================================ */}
        <section className="relative px-4 sm:px-6 lg:px-8 pt-10 pb-16 sm:pt-16 sm:pb-24 max-w-7xl mx-auto border-b border-[#E6DBD1]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Hero Column (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#D8BFA5] bg-[#F3E9DD] mb-6 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B42318]" />
                <span className="text-[11px] font-mono tracking-widest text-[#3B2418] uppercase font-semibold">
                  DISCOVER DIGITAL PRODUCTS
                </span>
              </div>

              {/* Big Bold Headline: 64–88px typography */}
              <h1 className="text-5xl sm:text-7xl lg:text-[76px] xl:text-[86px] font-serif font-medium tracking-tight text-[#111111] leading-[1.02] mb-6">
                Discover digital products made to move your{" "}
                <span className="italic text-[#6B4632]">work forward.</span>
              </h1>

              {/* Subtitle / Tagline */}
              <p className="text-lg sm:text-2xl font-serif text-[#3B2418] font-normal mb-2">
                Discover. Create. Sell.
              </p>
              <p className="text-xs sm:text-sm text-[#6B4632] font-light max-w-xl leading-relaxed mb-8">
                Explore templates, design assets, audio packs, e-books, and developer resources created by independent sellers worldwide.
              </p>

              {/* Primary Dual CTAs */}
              <div className="flex flex-wrap items-center gap-3.5 w-full sm:w-auto">
                <Link
                  href="/discover"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#FFFFFF] bg-[#111111] hover:bg-[#3B2418] transition-colors shadow-sm"
                >
                  <span>Explore Products</span>
                  <ArrowRight className="w-4 h-4 text-[#FAF8F4]" />
                </Link>

                <Link
                  href="/signup/seller"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#3B2418] hover:text-[#111111] bg-[#FFFFFF] hover:bg-[#F3E9DD] border border-[#D8BFA5] transition-colors shadow-2xs"
                >
                  <Store className="w-4 h-4 text-[#6B4632]" />
                  <span>Start Selling</span>
                </Link>
              </div>

              {/* Quick Trust Highlights */}
              <div className="grid grid-cols-3 gap-4 pt-8 mt-10 border-t border-[#E6DBD1] w-full text-left">
                <div>
                  <span className="text-xl sm:text-2xl font-serif font-semibold text-[#111111]">100%</span>
                  <p className="text-[10px] text-[#6B4632] uppercase font-mono mt-0.5">Instant Access</p>
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-serif font-semibold text-[#111111]">90% Net</span>
                  <p className="text-[10px] text-[#6B4632] uppercase font-mono mt-0.5">Creator Earnings</p>
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-serif font-semibold text-[#111111]">Verified</span>
                  <p className="text-[10px] text-[#6B4632] uppercase font-mono mt-0.5">Moderated Catalog</p>
                </div>
              </div>
            </div>

            {/* Right Hero Visual Composition: E-BOOK, MUSIC, UI/FIGMA (5 Cols) */}
            <div className="lg:col-span-5 relative w-full flex flex-col gap-4">
              {/* Top Row: Two Distinct Cards (E-BOOK & MUSIC) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. E-BOOK CARD */}
                <div className="group rounded-xl border border-[#D8BFA5] bg-[#FFFFFF] p-5 shadow-xs hover:border-[#3B2418] hover:-translate-y-1 transition-all duration-200">
                  <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-[#3B2418] via-[#6B4632] to-[#25160E] p-4 text-[#FAF8F4] flex flex-col justify-between mb-3 shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#FAF8F4]/20 text-[#FAF8F4]">
                        E-BOOK
                      </span>
                      <BookOpen className="w-3.5 h-3.5 text-[#D8BFA5]" />
                    </div>
                    <div>
                      <h4 className="font-serif text-sm font-medium leading-tight">The Modern Engineering Handbook</h4>
                      <p className="text-[10px] text-[#D8BFA5] mt-0.5 font-light">By Sarah Chen • 240 Pages</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-[#6B4632] uppercase font-mono block">PDF & EPUB</span>
                      <span className="text-sm font-mono font-bold text-[#111111]">₹799</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#B42318] group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5">
                      View →
                    </span>
                  </div>
                </div>

                {/* 2. MUSIC CARD */}
                <div className="group rounded-xl border border-[#D8BFA5] bg-[#FFFFFF] p-5 shadow-xs hover:border-[#3B2418] hover:-translate-y-1 transition-all duration-200">
                  <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-[#1A1715] via-[#3B2418] to-[#111111] p-4 text-[#FAF8F4] flex flex-col justify-between mb-3 shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#FAF8F4]/20 text-[#FAF8F4]">
                        MUSIC
                      </span>
                      <Music className="w-3.5 h-3.5 text-[#D8BFA5]" />
                    </div>
                    <div>
                      <h4 className="font-serif text-sm font-medium leading-tight">Analog Midnight Stems & Loops</h4>
                      <p className="text-[10px] text-[#D8BFA5] mt-0.5 font-light">WAV 48kHz • 24-Bit Stems</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-[#6B4632] uppercase font-mono block">Royalty Free</span>
                      <span className="text-sm font-mono font-bold text-[#111111]">₹1,299</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#B42318] group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5">
                      View →
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Wide Card (UI / FIGMA) */}
              <div className="group rounded-xl border border-[#3B2418] bg-[#FFFFFF] p-5 shadow-sm hover:border-[#111111] hover:-translate-y-1 transition-all duration-200">
                <div className="rounded-lg bg-gradient-to-br from-[#F3E9DD] via-[#FAF8F4] to-[#D8BFA5] p-5 mb-3 border border-[#E6DBD1]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-[#3B2418] text-[#FAF8F4]">
                      UI / FIGMA
                    </span>
                    <span className="text-[10px] font-mono text-[#B42318] font-semibold">
                      ★ 4.95 Rating
                    </span>
                  </div>
                  <h4 className="font-serif text-base sm:text-lg font-medium text-[#111111]">
                    Aura Studio Design System & React UI Kit
                  </h4>
                  <p className="text-xs text-[#6B4632] font-light mt-0.5 line-clamp-1">
                    200+ auto-layout Figma components, token engine, dark mode & Tailwind CSS exports.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[9px] text-[#6B4632] uppercase font-mono block">Commercial License Included</span>
                    <span className="text-base font-mono font-bold text-[#111111]">₹2,499</span>
                  </div>
                  <Link
                    href="/discover?category=design"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-mono uppercase font-semibold text-[#FFFFFF] bg-[#111111] hover:bg-[#3B2418] transition-colors"
                  >
                    <span>Preview Kit</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 3. EXPLORE BY CATEGORY                                       */}
        {/* ============================================================ */}
        <section className="px-4 sm:px-6 lg:px-8 py-14 sm:py-20 max-w-7xl mx-auto border-b border-[#E6DBD1]">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-[11px] font-mono tracking-widest uppercase text-[#B42318] font-bold block mb-1">
                MARKETPLACE TAXONOMY
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-medium text-[#111111]">
                EXPLORE BY CATEGORY
              </h2>
            </div>
            <Link
              href="/categories"
              className="text-xs font-mono uppercase tracking-wider font-semibold text-[#3B2418] hover:text-[#B42318] inline-flex items-center gap-1 transition-colors"
            >
              <span>View all categories</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Clean Category Pill Cloud matching wireframe */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {EXPLORE_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const href = cat.sub
                ? `/discover?category=${cat.slug}&sub=${cat.sub}`
                : `/discover?category=${cat.slug}`;
              return (
                <Link
                  key={cat.name}
                  href={href}
                  className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#D8BFA5] bg-[#FFFFFF] hover:border-[#111111] hover:bg-[#111111] transition-all duration-150 shadow-2xs"
                >
                  <Icon className="w-3.5 h-3.5 text-[#6B4632] group-hover:text-[#FAF8F4] transition-colors" />
                  <span className="text-xs font-mono uppercase tracking-wider font-semibold text-[#111111] group-hover:text-[#FAF8F4] transition-colors">
                    {cat.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ============================================================ */}
        {/* 4. FEATURED PRODUCTS (4 COLUMNS)                             */}
        {/* ============================================================ */}
        <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24 max-w-7xl mx-auto border-b border-[#E6DBD1]">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-[11px] font-mono tracking-widest uppercase text-[#6B4632] font-semibold block mb-1">
                HANDPICKED SELECTION
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-medium text-[#111111]">
                FEATURED PRODUCTS
              </h2>
            </div>
            <Link
              href="/discover?sort=rating"
              className="text-xs font-mono uppercase tracking-wider font-semibold text-[#111111] hover:text-[#B42318] inline-flex items-center gap-1 transition-colors"
            >
              <span>Explore highest rated</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 4 Columns Grid matching wireframe: Website, Music Pack, Book, 3D Assets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* 5. DISCOVER (INTERACTIVE SEARCH + PILLS + 8 PRODUCTS)        */}
        {/* ============================================================ */}
        <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24 max-w-7xl mx-auto border-b border-[#E6DBD1] bg-[#FAF8F4]">
          <div className="max-w-4xl mx-auto text-center mb-10">
            <span className="text-[11px] font-mono tracking-widest uppercase text-[#B42318] font-bold block mb-1">
              LIVE SEARCH & CATALOG
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-medium text-[#111111] mb-6">
              DISCOVER
            </h2>

            {/* Interactive Search Bar matching wireframe [ 🔍 Search digital products... ] */}
            <div className="relative max-w-2xl mx-auto mb-6">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#A98165] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search digital products, templates, audio, UI kits..."
                className="w-full pl-11 pr-10 py-3.5 rounded-full border border-[#D8BFA5] bg-[#FFFFFF] text-xs text-[#111111] placeholder-[#A98165] focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] shadow-2xs font-mono transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A98165] hover:text-[#111111]"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter Pills: All, Design, Development, Music, Education, 3D, AI */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {DISCOVER_FILTER_PILLS.map((pill) => (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setSelectedPill(pill.value)}
                  className={`px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider transition-all ${
                    selectedPill === pill.value
                      ? "bg-[#111111] text-[#FFFFFF] font-semibold shadow-xs"
                      : "bg-[#FFFFFF] text-[#6B4632] border border-[#E6DBD1] hover:border-[#3B2418] hover:text-[#111111]"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live 4 Columns x 2 Rows Product Grid (8 Items) */}
          {discoverFilteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {discoverFilteredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-xl border border-[#E6DBD1] bg-[#FFFFFF] max-w-xl mx-auto mb-10">
              <Compass className="w-8 h-8 text-[#A98165] mx-auto mb-2" />
              <h3 className="font-serif text-base font-medium text-[#111111]">No matching products found</h3>
              <p className="text-xs text-[#6B4632] mt-1 font-light">
                Try modifying your query or explore all categories.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedPill("all");
                }}
                className="mt-4 px-4 py-2 rounded-md text-xs font-mono uppercase bg-[#111111] text-[#FFFFFF]"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Deep Catalog Link */}
          <div className="text-center">
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#111111] hover:text-[#FFFFFF] bg-[#FFFFFF] hover:bg-[#111111] border border-[#111111] transition-all shadow-2xs"
            >
              <span>Explore Full Discovery Catalog</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 6. HAVE SOMETHING WORTH SELLING? (HIGH-CONTRAST SELLER BLOCK)*/}
        {/* ============================================================ */}
        <section
          id="seller-cta"
          className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-28 bg-[#1A1715] text-[#FAF8F4] overflow-hidden"
        >
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <span className="text-[11px] font-mono tracking-widest text-[#D8BFA5] uppercase font-bold block mb-3">
              CREATOR MONETIZATION
            </span>

            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-medium tracking-tight text-[#FAF8F4] leading-[1.15] mb-4">
              HAVE SOMETHING WORTH SELLING?
            </h2>

            <p className="text-xl sm:text-2xl font-serif text-[#D8BFA5] font-light mb-8">
              Create it. Upload it. Sell it.
            </p>

            <p className="text-xs sm:text-sm text-[#D8BFA5]/80 font-light max-w-xl mx-auto leading-relaxed mb-10">
              Turn your templates, code, audio, or books into recurring revenue. Keep 90% of every transaction with direct verified Indian bank payouts.
            </p>

            {/* High-Contrast Primary CTA Button */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/signup/seller"
                className="inline-flex items-center justify-center gap-2.5 px-9 py-4 rounded-md text-xs font-mono uppercase tracking-wider font-bold text-[#111111] bg-[#FAF8F4] hover:bg-[#FFFFFF] active:bg-[#F3E9DD] transition-all shadow-md"
              >
                <Store className="w-4 h-4 text-[#B42318]" />
                <span>START SELLING</span>
                <ArrowRight className="w-4 h-4 text-[#111111]" />
              </Link>
            </div>

            {/* Seller Proof Economics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-16 mt-16 border-t border-[#3B2418] text-left">
              <div className="p-5 rounded-lg border border-[#3B2418] bg-[#25160E]/50">
                <span className="text-xs font-mono text-[#D8BFA5] uppercase block mb-1">Simple Economics</span>
                <div className="text-xl font-serif font-medium text-[#FAF8F4]">90% Net Earnings</div>
                <p className="text-xs text-[#D8BFA5]/80 mt-1 font-light">
                  Flat 10% platform fee only on successful sales. Zero listing or recurring fees.
                </p>
              </div>

              <div className="p-5 rounded-lg border border-[#3B2418] bg-[#25160E]/50">
                <span className="text-xs font-mono text-[#D8BFA5] uppercase block mb-1">Protected Assets</span>
                <div className="text-xl font-serif font-medium text-[#FAF8F4]">Signed Presigned URLs</div>
                <p className="text-xs text-[#D8BFA5]/80 mt-1 font-light">
                  Files stored privately and served via 15-minute expiring download tokens.
                </p>
              </div>

              <div className="p-5 rounded-lg border border-[#3B2418] bg-[#25160E]/50">
                <span className="text-xs font-mono text-[#D8BFA5] uppercase block mb-1">Direct Settlement</span>
                <div className="text-xl font-serif font-medium text-[#FAF8F4]">Verified Bank Payouts</div>
                <p className="text-xs text-[#D8BFA5]/80 mt-1 font-light">
                  Seamless ledger accounting with automated disbursements directly to your Indian bank account.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 7. HOW IT WORKS (01 DISCOVER, 02 CHOOSE, 03 PURCHASE, 04 DOWNLOAD)*/}
        {/* ============================================================ */}
        <section id="how-it-works" className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24 max-w-7xl mx-auto border-b border-[#E6DBD1]">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-mono tracking-widest text-[#B42318] uppercase font-bold block mb-1">
              THE PLATFORM FLOW
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-medium text-[#111111]">
              HOW IT WORKS
            </h2>
            <p className="text-xs sm:text-sm text-[#6B4632] mt-2 font-light">
              Frictionless, audited digital transactions for both buyers and creators.
            </p>
          </div>

          {/* 4 Steps Sequence matching wireframe: 01 Discover, 02 Choose, 03 Purchase, 04 Download */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 01 */}
            <div className="rounded-xl border border-[#E6DBD1] bg-[#FFFFFF] p-6 shadow-xs flex flex-col justify-between hover:border-[#3B2418] transition-colors">
              <div>
                <span className="text-2xl font-mono font-bold text-[#B42318] block mb-3">01</span>
                <h3 className="font-serif text-lg font-medium text-[#111111] mb-2">Discover</h3>
                <p className="text-xs text-[#6B4632] font-light leading-relaxed">
                  Browse curated digital assets, templates, codebases, audio libraries, and e-books created by verified makers.
                </p>
              </div>
              <div className="pt-4 mt-6 border-t border-[#E6DBD1] text-[10px] font-mono text-[#A98165] uppercase">
                Categorized & Filtered
              </div>
            </div>

            {/* Step 02 */}
            <div className="rounded-xl border border-[#E6DBD1] bg-[#FFFFFF] p-6 shadow-xs flex flex-col justify-between hover:border-[#3B2418] transition-colors">
              <div>
                <span className="text-2xl font-mono font-bold text-[#3B2418] block mb-3">02</span>
                <h3 className="font-serif text-lg font-medium text-[#111111] mb-2">Choose</h3>
                <p className="text-xs text-[#6B4632] font-light leading-relaxed">
                  Inspect live previews, creator changelogs, customer ratings, included file formats, and commercial license terms.
                </p>
              </div>
              <div className="pt-4 mt-6 border-t border-[#E6DBD1] text-[10px] font-mono text-[#A98165] uppercase">
                Transparent Licensing
              </div>
            </div>

            {/* Step 03 */}
            <div className="rounded-xl border border-[#E6DBD1] bg-[#FFFFFF] p-6 shadow-xs flex flex-col justify-between hover:border-[#3B2418] transition-colors">
              <div>
                <span className="text-2xl font-mono font-bold text-[#3B2418] block mb-3">03</span>
                <h3 className="font-serif text-lg font-medium text-[#111111] mb-2">Purchase</h3>
                <p className="text-xs text-[#6B4632] font-light leading-relaxed">
                  Fast, encrypted checkout powered by Razorpay. Pay with UPI QR, cards, or net banking with instant verification.
                </p>
              </div>
              <div className="pt-4 mt-6 border-t border-[#E6DBD1] text-[10px] font-mono text-[#A98165] uppercase">
                256-Bit Encrypted
              </div>
            </div>

            {/* Step 04 */}
            <div className="rounded-xl border border-[#E6DBD1] bg-[#FFFFFF] p-6 shadow-xs flex flex-col justify-between hover:border-[#3B2418] transition-colors">
              <div>
                <span className="text-2xl font-mono font-bold text-[#111111] block mb-3">04</span>
                <h3 className="font-serif text-lg font-medium text-[#111111] mb-2">Download</h3>
                <p className="text-xs text-[#6B4632] font-light leading-relaxed">
                  Instant access to signed download packages. All items remain permanently stored in your buyer library with invoices.
                </p>
              </div>
              <div className="pt-4 mt-6 border-t border-[#E6DBD1] text-[10px] font-mono text-[#A98165] uppercase">
                Permanent Library
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 8. FINAL CTA                                                 */}
        {/* ============================================================ */}
        <section className="px-4 sm:px-6 lg:px-8 py-20 sm:py-28 max-w-7xl mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <span className="text-[11px] font-mono tracking-widest uppercase text-[#B42318] font-bold block mb-3">
              DIGITAL COMMERCE FOR CREATORS
            </span>

            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-medium text-[#111111] leading-tight mb-4">
              Find something useful.
            </h2>
            <h3 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-normal italic text-[#6B4632] leading-tight mb-8">
              Or make something worth selling.
            </h3>

            <p className="text-xs sm:text-sm text-[#6B4632] font-light max-w-md mx-auto mb-10 leading-relaxed">
              Join thousands of independent designers, engineers, and creators building and transacting on the open digital marketplace.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/discover"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#FFFFFF] bg-[#111111] hover:bg-[#3B2418] transition-colors shadow-sm"
              >
                <span>Explore Products</span>
                <ArrowRight className="w-4 h-4 text-[#FAF8F4]" />
              </Link>

              <Link
                href="/signup/seller"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#3B2418] hover:text-[#111111] bg-[#FFFFFF] hover:bg-[#F3E9DD] border border-[#D8BFA5] transition-colors shadow-2xs"
              >
                <Store className="w-4 h-4 text-[#6B4632]" />
                <span>Start Selling</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================ */}
      {/* 9. FOOTER                                                    */}
      {/* ============================================================ */}
      <MarketplaceFooter />
    </SpatialBackground>
  );
}
