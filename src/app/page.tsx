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
  ShoppingBag,
  Store,
  DollarSign,
  Star,
  Sparkles,
  TrendingUp,
  Package,
  Clock,
  Compass,
} from "lucide-react";
import { SpatialBackground } from "@/components/ui/SpatialBackground";
import { MarketplaceNavbar } from "@/components/ui/MarketplaceNavbar";
import { MarketplaceFooter } from "@/components/ui/MarketplaceFooter";
import { ProductCarousel } from "@/components/ui/ProductCarousel";
import { ProductCard, ProductCardData } from "@/components/ui/ProductCard";
import { TestimonialSlider } from "@/components/ui/TestimonialSlider";
import { FAQAccordion } from "@/components/ui/FAQAccordion";

export default function HomePage() {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string; productCount?: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real marketplace products & categories
  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch("/api/v1/products?limit=12").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/v1/categories").then((r) => (r.ok ? r.json() : null)),
        ]);

        if (prodRes?.data?.products && prodRes.data.products.length > 0) {
          setProducts(prodRes.data.products);
        } else {
          // Fallback curated showcase items matching the reference image if backend is empty
          setProducts([
            {
              id: "p1",
              title: "SaaS Dashboard UI Kit",
              slug: "saas-dashboard-ui-kit",
              shortDescription: "Clean, responsive Figma & React components for modern SaaS products.",
              pricePaise: 179900,
              ratingAvg: 4.8,
              reviewsCount: 320,
              seller: { storeName: "PixelForge" },
              category: { name: "UI KIT" },
              thumbnailUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
            },
            {
              id: "p2",
              title: "Notion Life Planner",
              slug: "notion-life-planner",
              shortDescription: "All-in-one Notion workspace for personal goals, finances and habits.",
              pricePaise: 39900,
              ratingAvg: 4.9,
              reviewsCount: 1200,
              seller: { storeName: "PlanStudio" },
              category: { name: "TEMPLATE" },
              thumbnailUrl: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=800&q=80",
            },
            {
              id: "p3",
              title: "The Freelance Guide",
              slug: "the-freelance-guide",
              shortDescription: "Contracts, client outreach scripts and pricing strategies for independent creators.",
              pricePaise: 49900,
              ratingAvg: 4.7,
              reviewsCount: 890,
              seller: { storeName: "Sarah Khan" },
              category: { name: "EBOOK" },
              thumbnailUrl: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80",
            },
            {
              id: "p4",
              title: "Resume Template Pack",
              slug: "resume-template-pack",
              shortDescription: "ATS-friendly, minimalist resumes tailored for engineers and product designers.",
              pricePaise: 69900,
              ratingAvg: 4.8,
              reviewsCount: 640,
              seller: { storeName: "DesignEra" },
              category: { name: "TEMPLATE" },
              thumbnailUrl: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=800&q=80",
            },
          ]);
        }

        if (catRes?.data?.categories && catRes.data.categories.length > 0) {
          setCategories(catRes.data.categories);
        }
      } catch (e) {
        console.error("Error loading marketplace data", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <SpatialBackground>
      <MarketplaceNavbar />

      <main className="flex-1 w-full pt-20">
        {/* ============================================================ */}
        {/* SECTION 01: HERO (EXACT REFERENCE COMPOSITION)               */}
        {/* ============================================================ */}
        <section className="relative min-h-[85vh] flex items-center px-4 sm:px-6 lg:px-8 py-16 md:py-24 max-w-7xl mx-auto overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center w-full">
            {/* Left Content (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#3A2930] bg-[#211815]/80 mb-6 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E] animate-pulse" />
                <span className="text-[11px] font-mono tracking-[0.25em] text-[#E8D5B5] uppercase font-medium">
                  The Digital Marketplace
                </span>
              </div>

              {/* Large Editorial Headline */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-light tracking-tight text-[#F7EFE2] font-editorial leading-[1.08] mb-6">
                Good digital products <br />
                <span className="italic text-[#E8D5B5]">deserve to be discovered.</span>
              </h1>

              {/* Supporting Copy */}
              <p className="text-sm sm:text-base text-[#BBAE9F] font-light max-w-xl leading-relaxed mb-8">
                Discover thoughtfully made digital products, or turn your own work into something people can use.
                Curated boilerplates, UI systems, planners, and creator guides.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 mb-14 w-full sm:w-auto">
                <Link
                  href="/products"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-xs font-medium text-white bg-[#F43F5E] hover:bg-[#FB7185] active:bg-[#9F1239] shadow-[0_0_25px_rgba(244,63,94,0.4)] transition-all duration-200"
                >
                  <span>Explore Marketplace</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/seller"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-xs font-medium text-[#F7EFE2] hover:text-white bg-[#211815] hover:bg-[#2B201C] border border-[#3A2930] hover:border-[#E8D5B5]/50 transition-all duration-200"
                >
                  <Store className="w-4 h-4 text-[#E8D5B5]" />
                  <span>Become a Seller</span>
                </Link>
              </div>

              {/* Stats Row (Exact match to reference bottom-left) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t border-[#3A2930]/80 w-full">
                <div>
                  <div className="text-2xl sm:text-3xl font-light font-editorial text-[#F7EFE2]">10K+</div>
                  <div className="text-[11px] text-[#BBAE9F] uppercase tracking-wider font-mono mt-0.5">Digital Products</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-light font-editorial text-[#F7EFE2]">5K+</div>
                  <div className="text-[11px] text-[#BBAE9F] uppercase tracking-wider font-mono mt-0.5">Creators</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-light font-editorial text-[#F7EFE2]">50K+</div>
                  <div className="text-[11px] text-[#BBAE9F] uppercase tracking-wider font-mono mt-0.5">Happy Customers</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-light font-editorial text-[#F7EFE2] flex items-center gap-1">
                    4.9 <Star className="w-4 h-4 fill-[#F43F5E] text-[#F43F5E] inline" />
                  </div>
                  <div className="text-[11px] text-[#BBAE9F] uppercase tracking-wider font-mono mt-0.5">Average Rating</div>
                </div>
              </div>
            </div>

            {/* Right Hero Visual Showcase (5 Cols - Editorial Mockup) */}
            <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
              {/* Decorative Background Glow and Script */}
              <div className="absolute -top-10 -right-10 w-72 h-72 bg-[#F43F5E]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-[#E8D5B5]/5 rounded-full blur-3xl pointer-events-none" />

              {/* Script Typography in Background */}
              <div className="absolute -right-4 top-1/2 -translate-y-1/2 select-none pointer-events-none text-right z-0">
                <span className="font-editorial italic text-5xl sm:text-6xl text-[#E8D5B5]/10 leading-tight block">
                  Create.
                </span>
                <span className="font-editorial italic text-5xl sm:text-6xl text-[#F43F5E]/15 leading-tight block">
                  Sell.
                </span>
                <span className="font-editorial italic text-5xl sm:text-6xl text-[#E8D5B5]/10 leading-tight block">
                  Grow.
                </span>
              </div>

              {/* The Elevated Product Card Showcase (Matching Reference Image) */}
              <div className="relative z-10 w-full max-w-sm rounded-3xl border border-[#3A2930] bg-[#211815] p-5 shadow-2xl shadow-black/80 hover:border-[#E8D5B5]/60 transition-all duration-500">
                {/* Product Preview Image with Bestseller Badge */}
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#1B101B] border border-[#3A2930] mb-5">
                  <img
                    src="https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=800&q=80"
                    alt="Notion Productivity Kit"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-[#F43F5E] text-white shadow-md">
                      Bestseller
                    </span>
                  </div>
                </div>

                {/* Card Information */}
                <div className="space-y-1 mb-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#E8D5B5]">
                    Productivity Template
                  </span>
                  <h3 className="text-lg font-medium text-[#F7EFE2] font-editorial">
                    Notion Productivity Kit
                  </h3>
                  <p className="text-xs text-[#BBAE9F] font-light">
                    Organize, Plan, Achieve. Everything in one system.
                  </p>
                </div>

                {/* Card Footer: Price & Rose Action Button */}
                <div className="pt-4 border-t border-[#3A2930] flex items-center justify-between">
                  <div>
                    <span className="text-xl font-semibold text-[#F7EFE2]">₹1,499</span>
                    <span className="text-[11px] text-[#BBAE9F] block">Instant Digital Access</span>
                  </div>

                  <Link
                    href="/products"
                    className="w-10 h-10 rounded-full bg-[#F43F5E] hover:bg-[#FB7185] active:bg-[#9F1239] text-white flex items-center justify-center shadow-lg shadow-[#F43F5E]/30 transition-transform hover:scale-105"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 02: CONTINUOUS HORIZONTAL TICKER                     */}
        {/* ============================================================ */}
        <section className="w-full border-y border-[#3A2930] bg-[#1B101B]/90 overflow-hidden py-3.5">
          <div className="animate-ticker flex items-center gap-8 text-[11px] font-mono tracking-[0.25em] text-[#E8D5B5] uppercase whitespace-nowrap">
            <span>DIGITAL PRODUCTS</span>
            <span className="text-[#F43F5E]">✦</span>
            <span>TEMPLATES</span>
            <span className="text-[#F43F5E]">✦</span>
            <span>CREATOR TOOLS</span>
            <span className="text-[#F43F5E]">✦</span>
            <span>RESOURCES</span>
            <span className="text-[#F43F5E]">✦</span>
            <span>UI KITS</span>
            <span className="text-[#F43F5E]">✦</span>
            <span>EBOOKS</span>
            <span className="text-[#F43F5E]">✦</span>
            <span>AND MORE</span>
            <span className="text-[#F43F5E]">✦</span>
            {/* Repeated for smooth loop */}
            <span>DIGITAL PRODUCTS</span>
            <span className="text-[#F43F5E]">✦</span>
            <span>TEMPLATES</span>
            <span className="text-[#F43F5E]">✦</span>
            <span>CREATOR TOOLS</span>
            <span className="text-[#F43F5E]">✦</span>
            <span>RESOURCES</span>
            <span className="text-[#F43F5E]">✦</span>
            <span>UI KITS</span>
            <span className="text-[#F43F5E]">✦</span>
            <span>EBOOKS</span>
            <span className="text-[#F43F5E]">✦</span>
            <span>AND MORE</span>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 03: "WORTH DISCOVERING." (HORIZONTAL SHOWCASE)       */}
        {/* ============================================================ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <h2 className="text-3xl sm:text-5xl font-light font-editorial text-[#F7EFE2] tracking-tight">
                Worth discovering.
              </h2>
              <p className="text-xs sm:text-sm text-[#BBAE9F] mt-2 font-light">
                A curated collection of digital products made by independent creators.
              </p>
            </div>
            <Link
              href="/products"
              className="text-xs font-mono text-[#E8D5B5] hover:text-[#F43F5E] flex items-center gap-1.5 transition-colors"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 04: "EXPLORE CATEGORIES" (TYPOGRAPHIC EDITORIAL)    */}
        {/* ============================================================ */}
        <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-[#3A2930]">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl sm:text-4xl font-light font-editorial text-[#F7EFE2] tracking-tight">
                Explore Categories
              </h2>
            </div>
            {/* Circular Arrow Nav Buttons matching reference image */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="w-9 h-9 rounded-full border border-[#3A2930] bg-[#211815] hover:border-[#E8D5B5]/50 hover:bg-[#2B201C] flex items-center justify-center text-[#BBAE9F] hover:text-[#F7EFE2] transition-colors"
                aria-label="Previous categories"
              >
                ←
              </button>
              <button
                type="button"
                className="w-9 h-9 rounded-full border border-[#3A2930] bg-[#211815] hover:border-[#E8D5B5]/50 hover:bg-[#2B201C] flex items-center justify-center text-[#BBAE9F] hover:text-[#F7EFE2] transition-colors"
                aria-label="Next categories"
              >
                →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { num: "01", name: "Design", desc: "UI kits, icons, graphics", slug: "design" },
              { num: "02", name: "Development", desc: "Code, SaaS, boilerplates", slug: "development" },
              { num: "03", name: "Productivity", desc: "Templates, planners", slug: "productivity" },
              { num: "04", name: "Business", desc: "Guides, resources", slug: "business" },
              { num: "05", name: "Education", desc: "Courses, eBooks", slug: "education" },
              { num: "06", name: "Creative", desc: "Fonts, media, presets", slug: "creative" },
            ].map((cat) => (
              <Link
                key={cat.num}
                href={`/products?category=${cat.slug}`}
                className="group p-6 rounded-2xl border border-[#3A2930] bg-[#211815] hover:border-[#E8D5B5]/60 hover:bg-[#2B201C] transition-all duration-300 flex items-center justify-between"
              >
                <div className="flex items-start gap-4">
                  <span className="text-xs font-mono text-[#F43F5E] font-medium pt-1">
                    {cat.num}
                  </span>
                  <div>
                    <h3 className="text-lg font-medium text-[#F7EFE2] group-hover:text-[#E8D5B5] font-editorial transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-[#BBAE9F] mt-1 font-light">
                      {cat.desc}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#BBAE9F] group-hover:text-[#F43F5E] group-hover:translate-x-1 transition-all shrink-0" />
              </Link>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 05: "FROM IDEA TO ACCESS." (HOW IT WORKS TIMELINE)   */}
        {/* ============================================================ */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-[#3A2930]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-4">
            {/* Left Header matching reference */}
            <div className="lg:col-span-4">
              <span className="text-[11px] font-mono tracking-[0.25em] text-[#F43F5E] uppercase block mb-2 font-medium">
                FOR THE BUYER
              </span>
              <h2 className="text-3xl sm:text-4xl font-light font-editorial text-[#F7EFE2] tracking-tight">
                From idea to access.
              </h2>
              <p className="text-xs sm:text-sm text-[#BBAE9F] mt-2 font-light">
                How it works.
              </p>
            </div>

            {/* Right Stepper matching reference with horizontal track */}
            <div className="lg:col-span-8 relative">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
                {[
                  {
                    step: "01",
                    title: "Discover",
                    desc: "Find a product that solves your problem.",
                  },
                  {
                    step: "02",
                    title: "Choose",
                    desc: "Explore the product, creator and details.",
                  },
                  {
                    step: "03",
                    title: "Purchase",
                    desc: "Complete your payment securely.",
                  },
                  {
                    step: "04",
                    title: "Access",
                    desc: "Your digital product becomes available.",
                  },
                ].map((s) => (
                  <div
                    key={s.step}
                    className="p-5 rounded-2xl border border-[#3A2930] bg-[#211815] relative group hover:border-[#E8D5B5]/50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-xs font-mono font-bold text-[#F43F5E] block mb-2">
                        {s.step}
                      </span>
                      <h3 className="text-base font-medium text-[#F7EFE2] font-editorial mb-1.5">
                        {s.title}
                      </h3>
                      <p className="text-xs text-[#BBAE9F] font-light leading-relaxed">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 06: FOR CREATORS (STUDIO SHOWCASE)                    */}
        {/* ============================================================ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-[#3A2930]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column (5 Cols) */}
            <div className="lg:col-span-5">
              <span className="text-[11px] font-mono tracking-[0.25em] text-[#F43F5E] uppercase block mb-2">
                For Creators
              </span>
              <h2 className="text-3xl sm:text-5xl font-light font-editorial text-[#F7EFE2] leading-tight mb-4">
                Make something <br />
                <span className="italic text-[#E8D5B5]">worth sharing.</span>
              </h2>
              <p className="text-xs sm:text-sm text-[#BBAE9F] leading-relaxed font-light mb-6">
                Turn your skills, ideas and resources into digital products and reach a global audience.
                Retain 90% net earnings with automated ledger reconciliations.
              </p>

              {/* Workflow Checklist */}
              <div className="grid grid-cols-2 gap-3 mb-8 text-xs font-mono text-[#F7EFE2]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E]" />
                  <span>Create digital assets</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E]" />
                  <span>Upload private zip</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E]" />
                  <span>Submit for approval</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E]" />
                  <span>Get approved</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E]" />
                  <span>Sell publicly</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E]" />
                  <span>Earn 90% split</span>
                </div>
              </div>

              <Link
                href="/seller"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-xs font-medium text-white bg-[#F43F5E] hover:bg-[#FB7185] active:bg-[#9F1239] shadow-lg shadow-[#F43F5E]/30 transition-all"
              >
                <span>Start Selling</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Right Column (7 Cols - Real Studio Dashboard Mockup) */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-[#3A2930] bg-[#211815] p-6 sm:p-8 shadow-2xl shadow-black/80">
                {/* Header */}
                <div className="flex items-center justify-between pb-6 border-b border-[#3A2930]">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest uppercase text-[#BBAE9F]">
                      Creator Platform
                    </span>
                    <h3 className="text-xl font-medium text-[#F7EFE2] font-editorial mt-0.5">
                      Your Studio
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-[#86A989]/10 text-[#86A989] border border-[#86A989]/30">
                    Active Storefront
                  </span>
                </div>

                {/* 4 Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
                  <div className="p-3.5 rounded-xl bg-[#1B101B] border border-[#3A2930]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#BBAE9F] block">Revenue</span>
                    <span className="text-lg font-semibold text-[#F7EFE2] mt-1 block">₹48,250</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#1B101B] border border-[#3A2930]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#BBAE9F] block">Orders</span>
                    <span className="text-lg font-semibold text-[#F7EFE2] mt-1 block">128</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#1B101B] border border-[#3A2930]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#BBAE9F] block">Products</span>
                    <span className="text-lg font-semibold text-[#F7EFE2] mt-1 block">12</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#1B101B] border border-[#3A2930]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#BBAE9F] block">Pending</span>
                    <span className="text-lg font-semibold text-[#E8D5B5] mt-1 block">2</span>
                  </div>
                </div>

                {/* Revenue Curve Preview (Rose SVG Chart) */}
                <div className="p-4 rounded-2xl bg-[#1B101B] border border-[#3A2930]">
                  <div className="flex items-center justify-between text-xs text-[#BBAE9F] mb-3">
                    <span>Revenue Trend (Last 30 Days)</span>
                    <span className="text-[#F43F5E] font-mono font-medium">+24.8% growth</span>
                  </div>
                  <div className="h-28 w-full relative">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 400 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="studioChartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0 80 Q 50 65 100 70 T 200 40 T 300 25 T 400 15 L 400 100 L 0 100 Z"
                        fill="url(#studioChartGrad)"
                      />
                      <path
                        d="M 0 80 Q 50 65 100 70 T 200 40 T 300 25 T 400 15"
                        fill="none"
                        stroke="#F43F5E"
                        strokeWidth="2.5"
                      />
                      <circle cx="300" cy="25" r="4" fill="#F43F5E" stroke="#1B101B" strokeWidth="2" />
                      <circle cx="400" cy="15" r="4" fill="#FB7185" stroke="#1B101B" strokeWidth="2" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 07: EDITORIAL TESTIMONIALS SLIDER                    */}
        {/* ============================================================ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-[#3A2930]">
          <TestimonialSlider />
        </section>

        {/* ============================================================ */}
        {/* SECTION 08: PLATFORM TRUST BAR                               */}
        {/* ============================================================ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-t border-[#3A2930]">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-[11px] font-mono tracking-[0.2em] text-[#BBAE9F] uppercase text-center">
            <span>SECURE PAYMENTS</span>
            <span className="text-[#F43F5E]">✦</span>
            <span>DIGITAL ACCESS</span>
            <span className="text-[#F43F5E]">✦</span>
            <span>CURATED PRODUCTS</span>
            <span className="text-[#F43F5E]">✦</span>
            <span>CREATOR MARKETPLACE</span>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 09: FAQ ACCORDION                                    */}
        {/* ============================================================ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-[#3A2930]">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] font-mono tracking-[0.25em] text-[#E8D5B5] uppercase block mb-2">
              Common Inquiries
            </span>
            <h2 className="text-3xl sm:text-4xl font-light font-editorial text-[#F7EFE2] tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-[#BBAE9F] mt-2 font-light">
              Clear, transparent answers regarding platform commerce, security, and digital downloads.
            </p>
          </div>

          <FAQAccordion />
        </section>

        {/* ============================================================ */}
        {/* SECTION 10: FINAL CALL TO ACTION                             */}
        {/* ============================================================ */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 my-10 text-center">
          <div className="p-10 sm:p-16 rounded-3xl border border-[#3A2930] bg-[#211815] relative overflow-hidden shadow-2xl shadow-black/80">
            {/* Ambient Corner Accents */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#F43F5E]/5 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#E8D5B5]/5 blur-3xl pointer-events-none" />

            <span className="text-[11px] font-mono font-medium tracking-[0.25em] text-[#E8D5B5] uppercase block mb-3">
              Velvet Market
            </span>
            <h2 className="text-3xl sm:text-5xl font-light font-editorial tracking-tight text-[#F7EFE2] mb-4 max-w-xl mx-auto leading-tight">
              Find something <br />
              <span className="italic text-[#E8D5B5]">worth keeping.</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#BBAE9F] font-light max-w-md mx-auto mb-8 leading-relaxed">
              Explore digital products made to be useful, inspiring and worth your time.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/products"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-xs font-medium text-white bg-[#F43F5E] hover:bg-[#FB7185] active:bg-[#9F1239] shadow-lg shadow-[#F43F5E]/30 transition-all"
              >
                <span>Explore Marketplace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/seller"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-xs font-medium text-[#F7EFE2] hover:text-white bg-[#1B101B] hover:bg-[#2B201C] border border-[#3A2930] hover:border-[#E8D5B5]/50 transition-all"
              >
                <Store className="w-4 h-4 text-[#E8D5B5]" />
                <span>Start Selling</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketplaceFooter />
    </SpatialBackground>
  );
}

