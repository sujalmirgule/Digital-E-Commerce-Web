"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Shield,
  Lock,
  Download,
  CheckCircle2,
  Layers,
  ShoppingBag,
  Store,
  DollarSign,
  FileCheck,
  Star,
  Zap,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import { SpatialBackground } from "@/components/ui/SpatialBackground";
import { MarketplaceNavbar } from "@/components/ui/MarketplaceNavbar";
import { MarketplaceFooter } from "@/components/ui/MarketplaceFooter";
import { ProductCarousel } from "@/components/ui/ProductCarousel";
import { ProductCardData } from "@/components/ui/ProductCard";
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

        if (prodRes?.data?.products) {
          setProducts(prodRes.data.products);
        }
        if (catRes?.data?.categories) {
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

  // Staggered word animation trigger on mount
  useEffect(() => {
    const wordElements = document.querySelectorAll<HTMLElement>(".word-animate");
    wordElements.forEach((word) => {
      const delay = parseInt(word.getAttribute("data-delay") || "0", 10);
      setTimeout(() => {
        if (word) word.style.animation = "word-appear 0.8s ease-out forwards";
      }, delay);
    });
  }, []);

  return (
    <SpatialBackground>
      <MarketplaceNavbar />

      <main className="flex-1 w-full pt-20">
        {/* ============================================================ */}
        {/* SECTION 02: HERO                                             */}
        {/* ============================================================ */}
        <section className="relative min-h-[85vh] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center max-w-5xl mx-auto">
          {/* Subtle Corner Brackets */}
          <div className="corner-element-animate -top-4 -left-4 sm:top-2 sm:left-2" style={{ animationDelay: "1.2s" }}>
            <div className="absolute top-0 left-0 w-2 h-2 bg-orange-500/40 rounded-full" />
          </div>
          <div className="corner-element-animate -top-4 -right-4 sm:top-2 sm:right-2" style={{ animationDelay: "1.4s" }}>
            <div className="absolute top-0 right-0 w-2 h-2 bg-orange-500/40 rounded-full" />
          </div>

          {/* Eyebrow Label */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-orange-500/20 bg-orange-500/5 mb-8 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-[11px] font-mono tracking-[0.25em] text-orange-400 uppercase font-medium">
              Digital Product Marketplace
            </span>
          </div>

          {/* Main Headline with Word Animation */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-light tracking-tight text-slate-100 leading-[1.1] mb-6 text-decoration-animate">
            <div className="mb-2 sm:mb-4">
              <span className="word-animate" data-delay="100">Discover.</span>
              <span className="word-animate" data-delay="300">Create.</span>
              <span className="word-animate" data-delay="500">Sell.</span>
            </div>
            <div className="text-xl sm:text-3xl lg:text-4xl font-extralight text-slate-300 tracking-wide mt-2">
              <span className="word-animate" data-delay="700">Digital</span>
              <span className="word-animate" data-delay="850">assets</span>
              <span className="word-animate" data-delay="1000">built</span>
              <span className="word-animate" data-delay="1150">for</span>
              <span className="word-animate" data-delay="1300">builders.</span>
            </div>
          </h1>

          {/* Supporting Statement */}
          <p className="text-sm sm:text-base text-slate-400 font-light max-w-2xl leading-relaxed mb-10">
            One unified marketplace to discover verified creator tools, code templates, UI kits,
            and audio assets — backed by cryptographic payment settlement and 15-minute expiring signed downloads.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link
              href="/products"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl text-sm font-mono font-medium text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-[0_0_25px_rgba(249,115,22,0.35)] transition-all duration-200"
            >
              <span>Explore Products</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/seller"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl text-sm font-mono text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all duration-200"
            >
              <Store className="w-4 h-4 text-orange-400" />
              <span>Become a Seller</span>
            </Link>
          </div>

          {/* Feature Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16 pt-10 border-t border-slate-800/40 w-full text-left">
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">Admin Moderated</span>
                <span className="text-[10px] font-mono text-slate-400">Quality Verified</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">15-Min Signed URLs</span>
                <span className="text-[10px] font-mono text-slate-400">Private Storage</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <DollarSign className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">90% Seller Payout</span>
                <span className="text-[10px] font-mono text-slate-400">Integer Paise Math</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">Instant Library</span>
                <span className="text-[10px] font-mono text-slate-400">Permanent Access</span>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 03: MARKETPLACE PREVIEW (CAROUSEL)                   */}
        {/* ============================================================ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-800/60">
          <ProductCarousel
            products={products}
            subtitle="Curated Catalog"
            title="Featured Digital Products"
          />
        </section>

        {/* ============================================================ */}
        {/* SECTION 04: WHAT IS THIS PLATFORM? (EDITORIAL 3-PILLAR)      */}
        {/* ============================================================ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-800/60">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-medium tracking-[0.2em] text-orange-400 uppercase">
              Architecture Overview
            </span>
            <h2 className="text-3xl sm:text-4xl font-light text-slate-100 mt-2 tracking-tight">
              Everything digital, in one marketplace.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-3 font-light leading-relaxed">
              Designed from ground up with mathematical ledger integrity, private storage isolation,
              and seamless multi-vendor commerce.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* For Buyers */}
            <div className="p-8 rounded-2xl border border-slate-800/80 bg-slate-900/30 backdrop-blur-sm hover:border-orange-500/40 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-6 group-hover:scale-105 transition-transform">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-medium text-slate-100 mb-3">For Buyers</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-light mb-6">
                  Discover verified digital tools, purchase through 256-bit encrypted Razorpay
                  gateways, and gain lifetime atomic entitlements in your customer library.
                </p>
              </div>
              <ul className="flex flex-col gap-2.5 text-xs text-slate-300 font-mono pt-4 border-t border-slate-800/60">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />
                  <span>Instant 15-min signed download URLs</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />
                  <span>Immutable PDF purchase receipts</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />
                  <span>Verified purchase customer reviews</span>
                </li>
              </ul>
            </div>

            {/* For Sellers */}
            <div className="p-8 rounded-2xl border border-slate-800/80 bg-slate-900/30 backdrop-blur-sm hover:border-orange-500/40 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-6 group-hover:scale-105 transition-transform">
                  <Store className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-medium text-slate-100 mb-3">For Sellers</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-light mb-6">
                  Turn your code repositories, design kits, and templates into recurring income.
                  Upload private files directly and track sales transparently.
                </p>
              </div>
              <ul className="flex flex-col gap-2.5 text-xs text-slate-300 font-mono pt-4 border-t border-slate-800/60">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />
                  <span>90% net earnings direct settlement</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />
                  <span>Private S3/R2 direct asset hosting</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />
                  <span>Custom creator storefront profile</span>
                </li>
              </ul>
            </div>

            {/* For the Marketplace */}
            <div className="p-8 rounded-2xl border border-slate-800/80 bg-slate-900/30 backdrop-blur-sm hover:border-orange-500/40 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-6 group-hover:scale-105 transition-transform">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-medium text-slate-100 mb-3">Platform Integrity</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-light mb-6">
                  A moderated ecosystem ensuring safety for both parties with cryptographic HMAC
                  verification and integer paise balance reconciliation.
                </p>
              </div>
              <ul className="flex flex-col gap-2.5 text-xs text-slate-300 font-mono pt-4 border-t border-slate-800/60">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />
                  <span>Zero floating-point financial math</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />
                  <span>Strict admin moderation pipeline</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />
                  <span>Complete audit trail and ledger</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 05: HOW IT WORKS (TRANSACTION JOURNEY)               */}
        {/* ============================================================ */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-800/60">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-medium tracking-[0.2em] text-orange-400 uppercase">
              End-To-End Lifecycle
            </span>
            <h2 className="text-3xl sm:text-4xl font-light text-slate-100 mt-2 tracking-tight">
              How The Marketplace Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-3 font-light leading-relaxed">
              A transparent, 4-step transaction loop from discovery to verified download.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-xl border border-slate-800/80 bg-slate-900/40 relative">
              <span className="text-2xl font-mono font-bold text-orange-500/80 mb-4 block">01</span>
              <h4 className="text-sm font-semibold text-slate-200 mb-2">DISCOVER</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                Browse curated categories, inspect file specifications, verified ratings, and authoritative prices.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-xl border border-slate-800/80 bg-slate-900/40 relative">
              <span className="text-2xl font-mono font-bold text-orange-500/80 mb-4 block">02</span>
              <h4 className="text-sm font-semibold text-slate-200 mb-2">CHOOSE</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                Review the asset details, licensing rights, version notes, and seller track record before purchase.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-xl border border-slate-800/80 bg-slate-900/40 relative">
              <span className="text-2xl font-mono font-bold text-orange-500/80 mb-4 block">03</span>
              <h4 className="text-sm font-semibold text-slate-200 mb-2">PURCHASE</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                Complete payment securely through Razorpay with HMAC signature verification and integer paise settlement.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-xl border border-slate-800/80 bg-slate-900/40 relative">
              <span className="text-2xl font-mono font-bold text-orange-500/80 mb-4 block">04</span>
              <h4 className="text-sm font-semibold text-slate-200 mb-2">ACCESS</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                Receive instant active Entitlement in your library, an immutable PDF receipt, and secure 15-min signed download links.
              </p>
            </div>
          </div>

          {/* Visual Architecture Flow Diagram */}
          <div className="mt-12 p-6 sm:p-8 rounded-2xl border border-slate-800/80 bg-slate-950/60 text-center">
            <span className="text-[11px] font-mono tracking-widest text-slate-400 uppercase block mb-6">
              Platform Transaction Flow
            </span>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-mono">
              <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                Seller
              </span>
              <span className="text-orange-500">→</span>
              <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                Private Upload
              </span>
              <span className="text-orange-500">→</span>
              <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                Admin Approval
              </span>
              <span className="text-orange-500">→</span>
              <span className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/40 text-orange-400">
                Published Catalog
              </span>
              <span className="text-orange-500">→</span>
              <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                Buyer Checkout
              </span>
              <span className="text-orange-500">→</span>
              <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                Razorpay Capture
              </span>
              <span className="text-orange-500">→</span>
              <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-400">
                Signed Download
              </span>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 06: SELLER JOURNEY                                   */}
        {/* ============================================================ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-800/60">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-mono font-medium tracking-[0.2em] text-orange-400 uppercase">
                Creator Monetization
              </span>
              <h2 className="text-3xl sm:text-4xl font-light text-slate-100 mt-2 tracking-tight mb-4">
                Have something valuable to share?
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed font-light mb-6">
                Turn your digital codebases, design templates, and software tools into a sustainable business.
                The marketplace takes care of private file hosting, payment processing, fraud screening, and automatic delivery.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded bg-orange-500/10 text-orange-400 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">90% Payout Rate</h4>
                    <p className="text-[11px] text-slate-400 font-light">
                      Transparent 10% platform commission with zero hidden maintenance fees.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1 rounded bg-orange-500/10 text-orange-400 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">Presigned Cloud Uploads</h4>
                    <p className="text-[11px] text-slate-400 font-light">
                      Direct encrypted multipart uploads up to 500MB without server timeouts.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1 rounded bg-orange-500/10 text-orange-400 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">Real-Time Storefront Analytics</h4>
                    <p className="text-[11px] text-slate-400 font-light">
                      Track sales volume, product moderation queues, and net settlement in real time.
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href="/seller"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-mono font-medium text-white bg-orange-600 hover:bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all"
              >
                <span>Start Selling Today</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Creator Journey Card Showcase */}
            <div className="p-8 rounded-2xl border border-slate-800/80 bg-slate-900/30 backdrop-blur-sm relative">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest block mb-4">
                Creator Path
              </span>
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-mono text-slate-300">
                      1
                    </span>
                    <span className="text-xs text-slate-300">Creator Onboarding & KYC</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Approved
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-mono text-slate-300">
                      2
                    </span>
                    <span className="text-xs text-slate-300">Upload Product Package</span>
                  </div>
                  <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                    Presigned
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-mono text-slate-300">
                      3
                    </span>
                    <span className="text-xs text-slate-300">Admin Content Moderation</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                    Verified
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-orange-500/40 bg-orange-500/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-[10px] font-mono text-white font-bold">
                      4
                    </span>
                    <span className="text-xs font-semibold text-orange-400">
                      Published & Earning 90%
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-orange-400 font-bold">Active</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 08: PRODUCT CATEGORIES                               */}
        {/* ============================================================ */}
        <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-800/60">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-mono font-medium tracking-[0.2em] text-orange-400 uppercase">
                Explore Domains
              </span>
              <h2 className="text-3xl sm:text-4xl font-light text-slate-100 mt-2 tracking-tight">
                Curated Product Categories
              </h2>
            </div>
            <Link
              href="/products"
              className="text-xs font-mono text-orange-400 hover:text-orange-300 flex items-center gap-1.5"
            >
              <span>View all categories</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {(categories.length > 0 ? categories : [
              { id: "c1", name: "Developer Tools", slug: "developer-tools", productCount: 24 },
              { id: "c2", name: "UI & Component Kits", slug: "ui-component-kits", productCount: 18 },
              { id: "c3", name: "Backend Starters", slug: "backend-starters", productCount: 12 },
              { id: "c4", name: "Design Systems", slug: "design-systems", productCount: 15 },
              { id: "c5", name: "E-Books & Guides", slug: "ebooks-guides", productCount: 9 },
              { id: "c6", name: "Audio & Sound FX", slug: "audio-sound-fx", productCount: 14 },
              { id: "c7", name: "Icons & Graphics", slug: "icons-graphics", productCount: 21 },
              { id: "c8", name: "Templates & Boilerplates", slug: "templates-boilerplates", productCount: 16 },
            ]).map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="group p-5 rounded-xl border border-slate-800/80 bg-slate-900/30 hover:bg-slate-900/70 hover:border-orange-500/40 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-orange-400 mb-3 group-hover:scale-110 transition-transform">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200 group-hover:text-orange-400 transition-colors">
                    {cat.name}
                  </h3>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/40 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>{cat.productCount ? `${cat.productCount} assets` : "Explore"}</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 10: TRUST & PLATFORM BENEFITS                        */}
        {/* ============================================================ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-800/60">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-medium tracking-[0.2em] text-orange-400 uppercase">
              Reliability & Safety
            </span>
            <h2 className="text-3xl sm:text-4xl font-light text-slate-100 mt-2 tracking-tight">
              Why Creators & Buyers Trust Aura
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-3 font-light leading-relaxed">
              Every transaction, download, and review is bound by cryptographic and architectural guarantees.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/30">
              <Lock className="w-6 h-6 text-orange-400 mb-4" />
              <h4 className="text-sm font-semibold text-slate-200 mb-2">256-Bit TLS Payments</h4>
              <p className="text-xs text-slate-400 font-light leading-relaxed">
                Processed via Razorpay with cryptographic HMAC signature verification on every webhook.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/30">
              <Shield className="w-6 h-6 text-orange-400 mb-4" />
              <h4 className="text-sm font-semibold text-slate-200 mb-2">15-Minute Signed URLs</h4>
              <p className="text-xs text-slate-400 font-light leading-relaxed">
                Private cloud storage keys never leak publicly. Expiring URLs protect intellectual property.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/30">
              <DollarSign className="w-6 h-6 text-orange-400 mb-4" />
              <h4 className="text-sm font-semibold text-slate-200 mb-2">Integer Paise Accuracy</h4>
              <p className="text-xs text-slate-400 font-light leading-relaxed">
                Platform fee and seller split strictly equal the gross amount in integer paise. No floating point rounding bugs.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/30">
              <Star className="w-6 h-6 text-orange-400 mb-4" />
              <h4 className="text-sm font-semibold text-slate-200 mb-2">Verified Reviews Only</h4>
              <p className="text-xs text-slate-400 font-light leading-relaxed">
                Only users with an active verified Entitlement can submit reviews. Zero fabricated reviews.
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 11: TESTIMONIALS SLIDER                              */}
        {/* ============================================================ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-800/60">
          <TestimonialSlider />
        </section>

        {/* ============================================================ */}
        {/* SECTION 12: QUALITATIVE HIGHLIGHTS / LIVE METRICS            */}
        {/* ============================================================ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-800/60">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-3xl sm:text-4xl font-mono font-bold text-orange-400 block mb-1">
                90%
              </span>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Seller Revenue Share
              </span>
            </div>

            <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-3xl sm:text-4xl font-mono font-bold text-slate-200 block mb-1">
                15 Min
              </span>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Expiring Download URLs
              </span>
            </div>

            <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-3xl sm:text-4xl font-mono font-bold text-slate-200 block mb-1">
                100%
              </span>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                HMAC Payment Verified
              </span>
            </div>

            <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-3xl sm:text-4xl font-mono font-bold text-emerald-400 block mb-1">
                Zero
              </span>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Float Rounding Inaccuracies
              </span>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 13: FAQ ACCORDION                                    */}
        {/* ============================================================ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-800/60">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-medium tracking-[0.2em] text-orange-400 uppercase">
              Frequently Asked Questions
            </span>
            <h2 className="text-3xl sm:text-4xl font-light text-slate-100 mt-2 tracking-tight">
              Got Questions? We’ve Got Answers.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-3 font-light leading-relaxed">
              Clear, factual answers regarding marketplace operations, payments, and downloads.
            </p>
          </div>

          <FAQAccordion />
        </section>

        {/* ============================================================ */}
        {/* SECTION 14: FINAL CALL TO ACTION                             */}
        {/* ============================================================ */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 my-12 text-center relative">
          <div className="p-10 sm:p-16 rounded-3xl border border-orange-500/30 bg-gradient-to-b from-orange-500/10 via-slate-900/60 to-slate-950/90 backdrop-blur-xl relative overflow-hidden shadow-2xl">
            {/* Ambient Corner Accents */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-orange-500/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl pointer-events-none" />

            <span className="text-xs font-mono font-medium tracking-[0.25em] text-orange-400 uppercase block mb-4">
              Get Started In Seconds
            </span>
            <h2 className="text-3xl sm:text-5xl font-light tracking-tight text-slate-100 mb-6 max-w-2xl mx-auto leading-tight">
              Your next digital product is already waiting.
            </h2>
            <p className="text-sm sm:text-base text-slate-400 font-light max-w-xl mx-auto mb-10 leading-relaxed">
              Join thousands of creators and engineers discovering, purchasing, and publishing high-impact digital assets.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/products"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-mono font-medium text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-[0_0_30px_rgba(249,115,22,0.4)] transition-all"
              >
                <span>Explore Marketplace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/seller"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-mono text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all"
              >
                <Store className="w-4 h-4 text-orange-400" />
                <span>Start Selling</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================ */}
      {/* SECTION 15: FOOTER                                           */}
      {/* ============================================================ */}
      <MarketplaceFooter />
    </SpatialBackground>
  );
}
