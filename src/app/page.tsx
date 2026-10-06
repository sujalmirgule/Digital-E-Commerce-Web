"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Shield,
  Lock,
  Download,
  CheckCircle2,
  Layers,
  Store,
  Sparkles,
  TrendingUp,
  Package,
  Clock,
  Compass,
  Code,
  Palette,
  LayoutTemplate,
  Briefcase,
  GraduationCap,
  Camera,
  Star,
  Check,
} from "lucide-react";
import { SpatialBackground } from "@/components/ui/SpatialBackground";
import { MarketplaceNavbar } from "@/components/ui/MarketplaceNavbar";
import { MarketplaceFooter } from "@/components/ui/MarketplaceFooter";
import { ProductCard, ProductCardData } from "@/components/ui/ProductCard";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { MARKETPLACE_CATEGORIES } from "@/lib/categories";
import { getProducts, DEMO_PRODUCTS } from "@/lib/demo/products";

export default function HomePage() {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    async function loadProducts() {
      try {
        const result = await getProducts({ limit: 12, allowDemoFallback: true });
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

  const featuredProducts = products.slice(0, 4);
  const trendingProducts = products.slice(4, 8);
  const recentProducts = products.slice(8, 12);

  // Filter products by selected category for discovery preview
  const previewProducts = activeCategory === "all"
    ? products.slice(0, 6)
    : products.filter(
        (p) =>
          p.category?.slug?.toLowerCase() === activeCategory.toLowerCase() ||
          p.category?.name?.toLowerCase() === activeCategory.toLowerCase()
      ).slice(0, 6);

  return (
    <SpatialBackground>
      {/* 1. HEADER */}
      <MarketplaceNavbar />

      <main className="flex-1 w-full pt-16 sm:pt-20">
        {/* ============================================================ */}
        {/* 2 & 3. HERO SECTION + EDITORIAL VISUAL COMPOSITION           */}
        {/* ============================================================ */}
        <section className="relative px-4 sm:px-6 lg:px-8 pt-12 pb-20 md:pt-20 md:pb-28 max-w-7xl mx-auto border-b border-[#E6DBD1]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#D8BFA5] bg-[#F3E9DD] mb-6 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B42318]" />
                <span className="text-[11px] font-mono tracking-widest text-[#3B2418] uppercase font-semibold">
                  DIGITAL MARKETPLACE
                </span>
              </div>

              {/* Large Headline */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-medium tracking-tight text-[#111111] leading-[1.08] mb-6">
                Discover digital products made to move your{" "}
                <span className="italic text-[#6B4632]">work forward.</span>
              </h1>

              {/* Supporting Copy */}
              <p className="text-base sm:text-lg text-[#6B4632] font-light max-w-xl leading-relaxed mb-8">
                Explore templates, design assets, development resources, learning products, and other digital goods created by independent sellers.
              </p>

              {/* Primary Marketplace CTAs */}
              <div className="flex flex-wrap items-center gap-3.5 mb-12 w-full sm:w-auto">
                <Link
                  href="/discover"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#FFFFFF] bg-[#111111] hover:bg-[#3B2418] transition-colors shadow-sm"
                >
                  <span>Discover Products</span>
                  <ArrowRight className="w-4 h-4 text-[#FAF8F4]" />
                </Link>

                <Link
                  href="/signup/seller"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#3B2418] hover:text-[#111111] bg-[#FFFFFF] hover:bg-[#F3E9DD] border border-[#D8BFA5] transition-colors shadow-2xs"
                >
                  <Store className="w-4 h-4 text-[#6B4632]" />
                  <span>Start Selling</span>
                </Link>
              </div>

              {/* Platform Pillars */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t border-[#E6DBD1] w-full">
                <div>
                  <div className="text-2xl sm:text-3xl font-serif font-semibold text-[#111111]">100%</div>
                  <div className="text-[11px] text-[#6B4632] uppercase tracking-wider font-mono mt-0.5">
                    Instant Access
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-serif font-semibold text-[#111111]">Razorpay</div>
                  <div className="text-[11px] text-[#6B4632] uppercase tracking-wider font-mono mt-0.5">
                    UPI, QR & Cards
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-serif font-semibold text-[#111111]">90% Net</div>
                  <div className="text-[11px] text-[#6B4632] uppercase tracking-wider font-mono mt-0.5">
                    Creator Split
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-serif font-semibold text-[#111111] flex items-center gap-1.5">
                    <span>Verified</span>
                    <Shield className="w-4 h-4 text-[#B42318]" />
                  </div>
                  <div className="text-[11px] text-[#6B4632] uppercase tracking-wider font-mono mt-0.5">
                    Moderated Files
                  </div>
                </div>
              </div>
            </div>

            {/* Right Hero Visual Composition (5 Cols) */}
            <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
              <div className="w-full max-w-md relative">
                {/* Decorative background shadow cards */}
                <div className="absolute -top-3 -right-3 w-full h-full rounded-2xl border border-[#D8BFA5] bg-[#F3E9DD]/80 -rotate-2 pointer-events-none" />
                <div className="absolute -bottom-3 -left-3 w-full h-full rounded-2xl border border-[#E6DBD1] bg-[#E6DBD1]/40 rotate-1 pointer-events-none" />

                {/* Primary Spotlight Product Composition */}
                <div className="relative rounded-2xl border border-[#3B2418] bg-[#FFFFFF] p-6 shadow-md shadow-black/5">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E6DBD1]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#111111]" />
                      <span className="text-xs font-mono uppercase tracking-widest text-[#6B4632] font-semibold">
                        Curated Showcase
                      </span>
                    </div>
                    <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-[#FAF8F4] text-[#B42318] border border-[#E6DBD1] font-semibold">
                      Featured Today
                    </span>
                  </div>

                  {/* Visual Product Mockup Canvas */}
                  <div className="rounded-xl overflow-hidden border border-[#E6DBD1] bg-gradient-to-br from-[#F3E9DD] via-[#FAF8F4] to-[#D8BFA5] p-6 mb-5 text-center">
                    <div className="inline-flex p-3 rounded-xl bg-[#FFFFFF] border border-[#D8BFA5] shadow-xs mb-3">
                      <LayoutTemplate className="w-8 h-8 text-[#3B2418]" />
                    </div>
                    <h3 className="font-serif text-lg font-medium text-[#111111]">
                      Figma Editorial Systems & Assets
                    </h3>
                    <p className="text-xs text-[#6B4632] mt-1 font-light">
                      200+ auto-layout components, grids, typography presets & palettes.
                    </p>
                  </div>

                  {/* Metadata Row */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#6B4632] font-mono">Creator</span>
                      <span className="text-[#111111] font-medium font-mono">Studio Monolith</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#6B4632] font-mono">License</span>
                      <span className="text-[#111111] font-mono">Commercial Use</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#6B4632] font-mono">Customer Rating</span>
                      <div className="flex items-center gap-1 font-mono text-[#111111]">
                        <Star className="w-3.5 h-3.5 fill-[#B42318] text-[#B42318]" />
                        <span className="font-bold">4.95 / 5.0</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#E6DBD1] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#6B4632] uppercase font-mono block">Instant Download</span>
                        <span className="text-xl font-mono font-bold text-[#111111]">₹2,900</span>
                      </div>
                      <Link
                        href="/discover"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-mono uppercase font-semibold text-[#FFFFFF] bg-[#111111] hover:bg-[#3B2418] transition-colors"
                      >
                        <span>Explore Catalog</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 4 & 5. PRODUCT DISCOVERY PREVIEW                             */}
        {/* ============================================================ */}
        <section className="px-4 sm:px-6 lg:px-8 py-16 md:py-24 max-w-7xl mx-auto border-b border-[#E6DBD1]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D8BFA5] bg-[#F3E9DD] mb-3">
                <Compass className="w-3.5 h-3.5 text-[#6B4632]" />
                <span className="text-[11px] font-mono tracking-widest text-[#3B2418] uppercase font-semibold">
                  Product Discovery
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-[#111111]">
                Explore what creators are making.
              </h2>
              <p className="text-sm text-[#6B4632] mt-2 font-light max-w-xl">
                Browse our curated selection of digital products built by verified independent developers and designers.
              </p>
            </div>

            <Link
              href="/discover"
              className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-[#111111] hover:text-[#B42318] py-2 transition-colors self-start md:self-end"
            >
              <span>Explore all products</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-4 py-2 rounded-md text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-colors ${
                activeCategory === "all"
                  ? "bg-[#111111] text-[#FFFFFF] font-semibold"
                  : "bg-[#FFFFFF] text-[#6B4632] border border-[#E6DBD1] hover:border-[#3B2418]"
              }`}
            >
              All Assets
            </button>
            {MARKETPLACE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.slug)}
                className={`px-4 py-2 rounded-md text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-colors ${
                  activeCategory === cat.slug
                    ? "bg-[#111111] text-[#FFFFFF] font-semibold"
                    : "bg-[#FFFFFF] text-[#6B4632] border border-[#E6DBD1] hover:border-[#3B2418]"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          {previewProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {previewProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-xl border border-[#E6DBD1] bg-[#FFFFFF]">
              <Package className="w-10 h-10 text-[#6B4632] mx-auto mb-3" />
              <h3 className="font-serif text-lg text-[#111111]">No products published yet in this section.</h3>
              <p className="text-xs text-[#6B4632] mt-1 font-light">
                Explore other categories or apply to become a seller today.
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <Link
                  href="/categories"
                  className="px-4 py-2 text-xs font-mono uppercase border border-[#E6DBD1] rounded-md text-[#3B2418] hover:bg-[#F3E9DD]"
                >
                  Explore Categories
                </Link>
                <Link
                  href="/signup/seller"
                  className="px-4 py-2 text-xs font-mono uppercase bg-[#111111] text-[#FFFFFF] rounded-md hover:bg-[#3B2418]"
                >
                  Become a Seller
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* ============================================================ */}
        {/* 6. CATEGORIES SECTION (RICH ARCHITECTURE)                    */}
        {/* ============================================================ */}
        <section className="px-4 sm:px-6 lg:px-8 py-16 md:py-24 max-w-7xl mx-auto border-b border-[#E6DBD1] bg-[#FAF8F4]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D8BFA5] bg-[#F3E9DD] mb-3">
                <Layers className="w-3.5 h-3.5 text-[#6B4632]" />
                <span className="text-[11px] font-mono tracking-widest text-[#3B2418] uppercase font-semibold">
                  Taxonomy & Classification
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-[#111111]">
                Explore by category.
              </h2>
              <p className="text-sm text-[#6B4632] mt-2 font-light max-w-xl">
                Find exactly what your workflow requires across curated digital disciplines.
              </p>
            </div>

            <Link
              href="/categories"
              className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-[#B42318] hover:underline py-2 transition-colors self-start md:self-end"
            >
              <span>View all categories</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {MARKETPLACE_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                className="group rounded-xl border border-[#E6DBD1] bg-[#FFFFFF] p-6 hover:border-[#3B2418] hover:shadow-sm transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-9 h-9 rounded-lg border border-[#D8BFA5] bg-[#F3E9DD] flex items-center justify-center text-[#3B2418] group-hover:bg-[#3B2418] group-hover:text-[#FFFFFF] transition-colors">
                      {cat.slug === "design" && <Palette className="w-4 h-4" />}
                      {cat.slug === "development" && <Code className="w-4 h-4" />}
                      {cat.slug === "templates" && <LayoutTemplate className="w-4 h-4" />}
                      {cat.slug === "business" && <Briefcase className="w-4 h-4" />}
                      {cat.slug === "education" && <GraduationCap className="w-4 h-4" />}
                      {cat.slug === "creative" && <Camera className="w-4 h-4" />}
                      {cat.slug === "ai" && <Sparkles className="w-4 h-4" />}
                    </span>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#A98165]">
                      {cat.subCategories.length} Types
                    </span>
                  </div>

                  <h3 className="font-serif text-xl font-medium text-[#111111] group-hover:text-[#6B4632] transition-colors">
                    <Link href={`/discover?category=${cat.slug}`}>
                      {cat.name}
                    </Link>
                  </h3>
                  <p className="text-xs text-[#6B4632] font-light mt-1.5 line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>

                  <div className="mt-4 pt-4 border-t border-[#E6DBD1] flex flex-wrap gap-1.5">
                    {cat.subCategories.slice(0, 3).map((sub) => (
                      <Link
                        key={sub.slug}
                        href={`/discover?category=${cat.slug}&sub=${sub.slug}`}
                        className="text-[11px] font-mono text-[#6B4632] hover:text-[#111111] px-2 py-0.5 rounded bg-[#FAF8F4] border border-[#E6DBD1] hover:border-[#6B4632] transition-colors"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3">
                  <Link
                    href={`/discover?category=${cat.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#3B2418] group-hover:text-[#B42318] font-semibold transition-colors"
                  >
                    <span>Browse {cat.name}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* 7. FEATURED & POPULAR PRODUCTS SECTION                       */}
        {/* ============================================================ */}
        <section className="px-4 sm:px-6 lg:px-8 py-16 md:py-24 max-w-7xl mx-auto border-b border-[#E6DBD1]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D8BFA5] bg-[#F3E9DD] mb-3">
                <TrendingUp className="w-3.5 h-3.5 text-[#6B4632]" />
                <span className="text-[11px] font-mono tracking-widest text-[#3B2418] uppercase font-semibold">
                  Curated Catalog
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-[#111111]">
                Featured & Popular Products.
              </h2>
              <p className="text-sm text-[#6B4632] mt-2 font-light max-w-xl">
                Top-rated development boilerplates, design systems, and productivity kits trusted by teams.
              </p>
            </div>

            <Link
              href="/discover?sort=rating"
              className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-[#111111] hover:text-[#B42318] py-2 transition-colors self-start md:self-end"
            >
              <span>View highest rated</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(featuredProducts.length > 0 ? featuredProducts : DEMO_PRODUCTS.slice(0, 4)).map((p) => (
              <ProductCard key={p.id} product={p as ProductCardData} />
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* 9 & 12. DEDICATED SELLER CTA SECTION (DISTINCT PALETTE)      */}
        {/* ============================================================ */}
        <section
          id="seller-cta"
          className="relative px-4 sm:px-6 lg:px-8 py-20 md:py-28 bg-[#1A1715] text-[#FAF8F4] overflow-hidden"
        >
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#6B4632] bg-[#3B2418] mb-6">
              <Store className="w-3.5 h-3.5 text-[#D8BFA5]" />
              <span className="text-[11px] font-mono tracking-widest text-[#F3E9DD] uppercase font-semibold">
                CREATOR STOREFRONT
              </span>
            </div>

            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-medium tracking-tight text-[#FAF8F4] leading-[1.15] mb-6 max-w-3xl mx-auto">
              Have something worth selling?
            </h2>

            <p className="text-base sm:text-lg text-[#D8BFA5] font-light max-w-2xl mx-auto leading-relaxed mb-10">
              Turn your digital work into a product and reach customers looking for useful resources.
              Retain 90% of every sale with instant UPI and card settlements.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/signup/seller"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#111111] bg-[#FAF8F4] hover:bg-[#F3E9DD] transition-colors shadow-sm"
              >
                <span>Start Selling</span>
                <ArrowRight className="w-4 h-4 text-[#B42318]" />
              </Link>

              <Link
                href="/#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#FAF8F4] hover:text-[#FFFFFF] bg-[#3B2418] hover:bg-[#4D3122] border border-[#6B4632] transition-colors"
              >
                <span>Learn how selling works</span>
              </Link>
            </div>

            {/* Seller Proof Points */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-16 mt-16 border-t border-[#3B2418] text-left">
              <div className="p-5 rounded-lg border border-[#3B2418] bg-[#25160E]/50">
                <span className="text-xs font-mono text-[#D8BFA5] uppercase block mb-1">Fee Model</span>
                <div className="text-xl font-serif font-medium text-[#FAF8F4]">90% Net Earnings</div>
                <p className="text-xs text-[#D8BFA5]/80 mt-1 font-light">
                  Simple 10% platform fee. Zero listing charges or hidden costs.
                </p>
              </div>

              <div className="p-5 rounded-lg border border-[#3B2418] bg-[#25160E]/50">
                <span className="text-xs font-mono text-[#D8BFA5] uppercase block mb-1">Asset Security</span>
                <div className="text-xl font-serif font-medium text-[#FAF8F4]">Private Storage</div>
                <p className="text-xs text-[#D8BFA5]/80 mt-1 font-light">
                  Files protected with 15-minute expiring presigned download URLs.
                </p>
              </div>

              <div className="p-5 rounded-lg border border-[#3B2418] bg-[#25160E]/50">
                <span className="text-xs font-mono text-[#D8BFA5] uppercase block mb-1">Banking</span>
                <div className="text-xl font-serif font-medium text-[#FAF8F4]">Automated Settlement</div>
                <p className="text-xs text-[#D8BFA5]/80 mt-1 font-light">
                  Verified bank payouts directly to your Indian bank account.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 10. HOW MARKETPLACE WORKS                                    */}
        {/* ============================================================ */}
        <section id="how-it-works" className="px-4 sm:px-6 lg:px-8 py-16 md:py-24 max-w-7xl mx-auto border-b border-[#E6DBD1]">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D8BFA5] bg-[#F3E9DD] mb-3">
              <Clock className="w-3.5 h-3.5 text-[#6B4632]" />
              <span className="text-[11px] font-mono tracking-widest text-[#3B2418] uppercase font-semibold">
                HOW IT WORKS
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-medium text-[#111111]">
              Simple, transparent commerce.
            </h2>
            <p className="text-sm text-[#6B4632] mt-2 font-light">
              Built for speed, security, and verified digital ownership.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* For Customers */}
            <div className="rounded-2xl border border-[#E6DBD1] bg-[#FFFFFF] p-8 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#E6DBD1]">
                <h3 className="font-serif text-xl font-medium text-[#111111]">
                  For Customers
                </h3>
                <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-[#F3E9DD] text-[#3B2418]">
                  Buyer Experience
                </span>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <span className="w-8 h-8 rounded-full border border-[#D8BFA5] bg-[#FAF8F4] flex items-center justify-center font-mono font-bold text-xs text-[#3B2418] shrink-0">
                    01
                  </span>
                  <div>
                    <h4 className="font-serif font-medium text-base text-[#111111]">Discover</h4>
                    <p className="text-xs text-[#6B4632] font-light mt-0.5 leading-relaxed">
                      Search and explore verified templates, boilerplates, and design systems across multiple categories.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="w-8 h-8 rounded-full border border-[#D8BFA5] bg-[#FAF8F4] flex items-center justify-center font-mono font-bold text-xs text-[#3B2418] shrink-0">
                    02
                  </span>
                  <div>
                    <h4 className="font-serif font-medium text-base text-[#111111]">Choose</h4>
                    <p className="text-xs text-[#6B4632] font-light mt-0.5 leading-relaxed">
                      Review product details, included file formats, licensing rights, version notes, and verified ratings.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="w-8 h-8 rounded-full border border-[#D8BFA5] bg-[#FAF8F4] flex items-center justify-center font-mono font-bold text-xs text-[#3B2418] shrink-0">
                    03
                  </span>
                  <div>
                    <h4 className="font-serif font-medium text-base text-[#111111]">Purchase</h4>
                    <p className="text-xs text-[#6B4632] font-light mt-0.5 leading-relaxed">
                      Pay securely with Razorpay via UPI QR, credit cards, or net banking with instant verification.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="w-8 h-8 rounded-full border border-[#D8BFA5] bg-[#FAF8F4] flex items-center justify-center font-mono font-bold text-xs text-[#3B2418] shrink-0">
                    04
                  </span>
                  <div>
                    <h4 className="font-serif font-medium text-base text-[#111111]">Download</h4>
                    <p className="text-xs text-[#6B4632] font-light mt-0.5 leading-relaxed">
                      Access your personal library anytime to download signed asset packages and tax invoices.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* For Sellers */}
            <div className="rounded-2xl border border-[#E6DBD1] bg-[#FFFFFF] p-8 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#E6DBD1]">
                <h3 className="font-serif text-xl font-medium text-[#111111]">
                  For Sellers
                </h3>
                <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-[#3B2418] text-[#FAF8F4]">
                  Creator Workflow
                </span>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <span className="w-8 h-8 rounded-full border border-[#6B4632] bg-[#3B2418] flex items-center justify-center font-mono font-bold text-xs text-[#FAF8F4] shrink-0">
                    01
                  </span>
                  <div>
                    <h4 className="font-serif font-medium text-base text-[#111111]">Create</h4>
                    <p className="text-xs text-[#6B4632] font-light mt-0.5 leading-relaxed">
                      Register as a creator, setup your store identity, and link your verified payout bank details.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="w-8 h-8 rounded-full border border-[#6B4632] bg-[#3B2418] flex items-center justify-center font-mono font-bold text-xs text-[#FAF8F4] shrink-0">
                    02
                  </span>
                  <div>
                    <h4 className="font-serif font-medium text-base text-[#111111]">Upload</h4>
                    <p className="text-xs text-[#6B4632] font-light mt-0.5 leading-relaxed">
                      Package digital ZIP, PDF, or code files, set your price in INR, and define licensing specifications.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="w-8 h-8 rounded-full border border-[#6B4632] bg-[#3B2418] flex items-center justify-center font-mono font-bold text-xs text-[#FAF8F4] shrink-0">
                    03
                  </span>
                  <div>
                    <h4 className="font-serif font-medium text-base text-[#111111]">Submit</h4>
                    <p className="text-xs text-[#6B4632] font-light mt-0.5 leading-relaxed">
                      Send your draft for admin moderation. Our team verifies safety and metadata before publishing.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="w-8 h-8 rounded-full border border-[#6B4632] bg-[#3B2418] flex items-center justify-center font-mono font-bold text-xs text-[#FAF8F4] shrink-0">
                    04
                  </span>
                  <div>
                    <h4 className="font-serif font-medium text-base text-[#111111]">Sell</h4>
                    <p className="text-xs text-[#6B4632] font-light mt-0.5 leading-relaxed">
                      Reach customers, monitor your earnings ledger in real-time, and request automated payouts.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 11 & 12. CUSTOMER & SELLER BENEFITS SECTIONS                 */}
        {/* ============================================================ */}
        <section id="customer-benefits" className="px-4 sm:px-6 lg:px-8 py-16 md:py-24 max-w-7xl mx-auto border-b border-[#E6DBD1]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D8BFA5] bg-[#F3E9DD] mb-3">
                <Shield className="w-3.5 h-3.5 text-[#B42318]" />
                <span className="text-[11px] font-mono tracking-widest text-[#3B2418] uppercase font-semibold">
                  Buyer Guarantees
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-[#111111]">
                Built for confident purchasing.
              </h2>
              <p className="text-sm text-[#6B4632] mt-3 font-light leading-relaxed">
                Every digital sale is verified and recorded with strict audit records. You always own lifetime access to your digital purchases.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#B42318] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-serif font-medium text-[#111111]">Personal Digital Library</h4>
                    <p className="text-xs text-[#6B4632] font-light mt-0.5">
                      Your digital goods never disappear. Access and download anytime from your account dashboard.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#B42318] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-serif font-medium text-[#111111]">Secure Razorpay Checkout</h4>
                    <p className="text-xs text-[#6B4632] font-light mt-0.5">
                      Pay with UPI, Cards, and Net Banking under PCI-DSS encrypted payment infrastructure.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#B42318] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-serif font-medium text-[#111111]">Automated Tax Invoices</h4>
                    <p className="text-xs text-[#6B4632] font-light mt-0.5">
                      Download official PDF payment receipts directly for expense accounting.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/signup/customer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#FFFFFF] bg-[#111111] hover:bg-[#3B2418] transition-colors"
                >
                  <span>Create Customer Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div id="seller-benefits" className="p-8 rounded-2xl border border-[#D8BFA5] bg-[#F3E9DD]/60">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D8BFA5] bg-[#FAF8F4] mb-3">
                <Store className="w-3.5 h-3.5 text-[#6B4632]" />
                <span className="text-[11px] font-mono tracking-widest text-[#3B2418] uppercase font-semibold">
                  Seller Benefits
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif font-medium text-[#111111]">
                Fair economics for digital creators.
              </h3>
              <p className="text-xs text-[#6B4632] mt-2 font-light leading-relaxed">
                Zero listing fees, zero subscriptions. Only a flat 10% platform fee when you actually make a sale.
              </p>

              <div className="mt-6 space-y-3.5">
                <div className="p-3.5 rounded-lg border border-[#E6DBD1] bg-[#FFFFFF]">
                  <h4 className="text-xs font-mono uppercase tracking-wider font-semibold text-[#111111]">
                    90% Net Earnings
                  </h4>
                  <p className="text-xs text-[#6B4632] mt-0.5 font-light">
                    Keep the vast majority of your revenue. You earned it.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-[#E6DBD1] bg-[#FFFFFF]">
                  <h4 className="text-xs font-mono uppercase tracking-wider font-semibold text-[#111111]">
                    Direct Bank Payouts
                  </h4>
                  <p className="text-xs text-[#6B4632] mt-0.5 font-light">
                    Automated ledger tracking with direct settlements to verified Indian banks.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-[#E6DBD1] bg-[#FFFFFF]">
                  <h4 className="text-xs font-mono uppercase tracking-wider font-semibold text-[#111111]">
                    Protected Asset Downloads
                  </h4>
                  <p className="text-xs text-[#6B4632] mt-0.5 font-light">
                    Signed, expiring URLs protect files from unauthorized link scraping.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  href="/signup/seller"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#3B2418] border border-[#3B2418] bg-[#FFFFFF] hover:bg-[#F3E9DD] transition-colors"
                >
                  <span>Apply to Become a Seller</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 13. TRUST & SECURITY SECTION                                 */}
        {/* ============================================================ */}
        <section id="trust-section" className="px-4 sm:px-6 lg:px-8 py-16 md:py-24 max-w-7xl mx-auto border-b border-[#E6DBD1]">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-serif font-medium text-[#111111]">
              Engineered for trustworthy marketplace commerce.
            </h2>
            <p className="text-xs text-[#6B4632] mt-2 font-light">
              Factual security and architectural integrity built into every interaction.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl border border-[#E6DBD1] bg-[#FFFFFF]">
              <Lock className="w-6 h-6 text-[#3B2418] mb-3" />
              <h3 className="font-serif text-base font-medium text-[#111111]">Secure Payments</h3>
              <p className="text-xs text-[#6B4632] mt-1.5 font-light leading-relaxed">
                Processed via Razorpay with encrypted payment verification and webhook validation.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-[#E6DBD1] bg-[#FFFFFF]">
              <Download className="w-6 h-6 text-[#3B2418] mb-3" />
              <h3 className="font-serif text-base font-medium text-[#111111]">Protected Downloads</h3>
              <p className="text-xs text-[#6B4632] mt-1.5 font-light leading-relaxed">
                Time-limited signed URLs generated strictly on verified buyer entitlements.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-[#E6DBD1] bg-[#FFFFFF]">
              <Shield className="w-6 h-6 text-[#3B2418] mb-3" />
              <h3 className="font-serif text-base font-medium text-[#111111]">Moderated Catalog</h3>
              <p className="text-xs text-[#6B4632] mt-1.5 font-light leading-relaxed">
                All seller profiles and product listings undergo rigorous administrative review.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-[#E6DBD1] bg-[#FFFFFF]">
              <Store className="w-6 h-6 text-[#3B2418] mb-3" />
              <h3 className="font-serif text-base font-medium text-[#111111]">Creator Tools</h3>
              <p className="text-xs text-[#6B4632] mt-1.5 font-light leading-relaxed">
                Real-time gross sales, platform commission calculation, and banking KYC.
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* FAQ SECTION                                                  */}
        {/* ============================================================ */}
        <section className="px-4 sm:px-6 lg:px-8 py-16 md:py-24 max-w-7xl mx-auto border-b border-[#E6DBD1]">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-serif font-medium text-[#111111]">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-[#6B4632] mt-2 font-light">
              Clear answers regarding payments, creator onboarding, and delivery.
            </p>
          </div>

          <FAQAccordion />
        </section>

        {/* ============================================================ */}
        {/* 14. FINAL CALL TO ACTION                                     */}
        {/* ============================================================ */}
        <section className="px-4 sm:px-6 lg:px-8 py-20 md:py-28 max-w-7xl mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <span className="text-[11px] font-mono tracking-widest uppercase text-[#B42318] font-semibold block mb-3">
              YOUR NEXT WORKFLOW AWAITS
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif font-medium text-[#111111] leading-tight mb-6">
              Your next digital product is waiting to be discovered.
            </h2>
            <p className="text-base text-[#6B4632] font-light max-w-xl mx-auto mb-10 leading-relaxed">
              Join thousands of creators and builders sharing production assets, codebases, and templates worldwide.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/discover"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#FFFFFF] bg-[#111111] hover:bg-[#3B2418] transition-colors shadow-sm"
              >
                <span>Explore Products</span>
                <ArrowRight className="w-4 h-4" />
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

      {/* 15. FOOTER */}
      <MarketplaceFooter />
    </SpatialBackground>
  );
}
