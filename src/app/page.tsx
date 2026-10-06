import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Lock,
  Layers,
  Palette,
  Code,
  LayoutTemplate,
  Music,
  Camera,
  Film,
  Box,
  GraduationCap,
  Briefcase,
  TrendingUp,
  PenTool,
  CheckSquare,
  Type,
  Smile,
  BookOpen,
  DollarSign,
  Zap,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SpatialBackground } from "@/components/ui/SpatialBackground";
import { MarketplaceNavbar } from "@/components/ui/MarketplaceNavbar";
import { MarketplaceFooter } from "@/components/ui/MarketplaceFooter";
import { HeroProductCollage } from "@/components/ui/HeroProductCollage";
import { HomeFeaturedSection } from "@/components/home/HomeFeaturedSection";
import { ProductCardData } from "@/components/ui/ProductCard";
import { MARKETPLACE_CATEGORIES } from "@/lib/categories";

export const dynamic = "force-dynamic";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Palette,
  Code,
  LayoutTemplate,
  Music,
  Camera,
  Film,
  Box,
  GraduationCap,
  Briefcase,
  TrendingUp,
  PenTool,
  CheckSquare,
  Sparkles,
  Type,
  Smile,
  BookOpen,
};

export default async function HomePage() {
  // Direct Server Query: Zero client fetch waterfalls!
  let products: ProductCardData[] = [];
  try {
    const rawProducts = await prisma.product.findMany({
      where: {
        status: "PUBLISHED",
        seller: { status: "APPROVED" },
      },
      include: {
        category: {
          select: { name: true, slug: true },
        },
        seller: {
          select: { storeName: true, storeSlug: true },
        },
        media: {
          where: { type: "THUMBNAIL" },
          select: { url: true },
          take: 1,
        },
      },
      orderBy: [{ isFeatured: "desc" }, { salesCount: "desc" }],
      take: 60,
    });

    products = rawProducts.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      shortDescription: p.shortDescription,
      productType: p.productType,
      pricePaise: p.pricePaise,
      discountPricePaise: p.discountPricePaise,
      isFree: p.isFree,
      ratingAvg: Number(p.ratingAvg),
      reviewsCount: p.reviewsCount,
      salesCount: p.salesCount,
      tags: p.tags,
      thumbnailUrl: p.media[0]?.url || `/products/product-1.svg`,
      seller: {
        storeName: p.seller.storeName,
        storeSlug: p.seller.storeSlug,
      },
      category: {
        name: p.category.name,
        slug: p.category.slug,
      },
      badge: p.isFeatured ? "Featured" : undefined,
    }));
  } catch (err) {
    console.error("Failed to fetch initial products on server:", err);
  }

  return (
    <SpatialBackground>
      <MarketplaceNavbar />

      <main className="flex-1 w-full pt-[73px]">
        {/* ============================================================== */}
        {/* SECTION A: HERO (Cream #F2E7DB)                                 */}
        {/* ============================================================== */}
        <section className="relative overflow-hidden bg-[#F2E7DB] border-b border-[#C8AA91]/60 py-16 sm:py-24 lg:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              
              {/* LEFT: Editorial Typography Hero */}
              <div className="lg:col-span-6 flex flex-col items-start space-y-6">
                {/* Eyebrow */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest bg-[#FAF7F2] text-[#3B261C] border border-[#C8AA91]/70 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#A94432]" />
                  <span>Digital Marketplace</span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-6xl xl:text-[70px] font-sans font-extrabold text-[#151311] tracking-tight leading-[1.08]">
                  Discover digital products made to help you{" "}
                  <span className="text-[#3B261C] underline decoration-[#C46A4A] decoration-wavy decoration-2">
                    create
                  </span>
                  ,{" "}
                  <span className="text-[#684332]">
                    build
                  </span>{" "}
                  and{" "}
                  <span className="text-[#A94432]">
                    grow
                  </span>
                  .
                </h1>

                {/* Supporting Editorial Paragraph */}
                <p className="text-base sm:text-lg text-[#684332] leading-relaxed font-normal max-w-xl">
                  A curated marketplace for independent software engineers, designers, musicians, and authors. Inspect verified source files, instant delivery, and transparent creator earnings.
                </p>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link
                    href="/discover"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-extrabold text-[#FAF7F2] bg-[#3B261C] hover:bg-[#684332] active:bg-[#211D1A] transition-all shadow-lg shadow-[#3B261C]/25"
                  >
                    <span>Explore Products</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/signup/seller"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-extrabold text-[#3B261C] bg-[#FAF7F2] hover:bg-[#FFFFFF] border-2 border-[#3B261C] transition-all shadow-xs"
                  >
                    <span>Start Selling</span>
                  </Link>
                </div>

                {/* Trust Badges */}
                <div className="flex flex-wrap items-center gap-6 pt-4 text-xs font-bold text-[#8A6048]">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#A94432]" />
                    <span>60+ Verified Digital Assets</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-[#A94432]" />
                    <span>Instant Secure Vault Access</span>
                  </div>
                </div>
              </div>

              {/* RIGHT: Multi-Category Hero Product Collage */}
              <div className="lg:col-span-6 w-full">
                <HeroProductCollage />
              </div>

            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* SECTION B: CATEGORIES (Warm Off-White #FAF7F2)                  */}
        {/* ============================================================== */}
        <section className="py-20 sm:py-24 bg-[#FAF7F2] border-b border-[#C8AA91]/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#8A6048] block mb-2">
                Browse The Catalog
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-sans font-extrabold text-[#151311] tracking-tight">
                Explore by category
              </h2>
              <p className="text-base sm:text-lg text-[#684332] mt-3 font-normal">
                Everything you need to ship projects, learn architectures, and accelerate your creative workflow.
              </p>
            </div>

            {/* 16 Category Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {MARKETPLACE_CATEGORIES.map((cat) => {
                const IconComponent = CATEGORY_ICONS[cat.iconName] || Palette;
                return (
                  <Link
                    key={cat.id}
                    href={`/discover?category=${cat.slug}`}
                    className="group relative flex flex-col p-5 sm:p-6 rounded-2xl border border-[#C8AA91]/50 bg-[#FFFFFF] hover:border-[#3B261C] hover:bg-[#F2E7DB]/40 hover:-translate-y-1 transition-all duration-300 shadow-[0_2px_10px_rgba(59,38,28,0.04)] hover:shadow-[0_12px_28px_rgba(59,38,28,0.1)]"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#F2E7DB] text-[#3B261C] group-hover:bg-[#3B261C] group-hover:text-[#FAF7F2] flex items-center justify-center transition-all mb-4 border border-[#C8AA91]/40">
                      <IconComponent className="w-6 h-6 transition-transform group-hover:scale-110" />
                    </div>
                    <h3 className="font-sans text-lg font-bold text-[#151311] group-hover:text-[#3B261C] transition-colors flex items-center justify-between">
                      <span>{cat.name}</span>
                      <ArrowRight className="w-4 h-4 text-[#C46A4A] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h3>
                    <p className="text-xs sm:text-[13px] text-[#8A6048] mt-1.5 line-clamp-2 leading-relaxed font-normal">
                      {cat.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* SECTION C: FEATURED DIGITAL GOODS (White #FFFFFF)              */}
        {/* ============================================================== */}
        <HomeFeaturedSection initialProducts={products} />

        {/* ============================================================== */}
        {/* SECTION D: CREATOR / SELLER SPOTLIGHT (Deep Brown #3B261C)      */}
        {/* ============================================================== */}
        <section id="seller-spotlight" className="py-20 sm:py-28 bg-[#3B261C] text-[#FAF7F2] border-b border-[#211D1A]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-16">
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#C46A4A] block mb-2">
                Built for Independent Creators
              </span>
              <h2 className="text-3xl sm:text-5xl font-sans font-extrabold text-[#FAF7F2] tracking-tight leading-tight">
                Monetize your craft. Keep 90% of everything you make.
              </h2>
              <p className="text-base sm:text-lg text-[#F2E7DB]/80 mt-4 font-normal leading-relaxed">
                Whether you build Figma design systems, React starters, or electronic sample packs, Folio provides the infrastructure to run your digital store without platform lock-in.
              </p>
            </div>

            {/* 3 Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-14">
              <div className="p-8 rounded-2xl bg-[#211D1A]/80 border border-[#684332] flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#684332] text-[#F2E7DB] flex items-center justify-center mb-6">
                    <DollarSign className="w-6 h-6 text-[#C46A4A]" />
                  </div>
                  <h3 className="font-sans text-xl font-bold text-[#FAF7F2] mb-2">
                    Transparent 90% Payout
                  </h3>
                  <p className="text-sm text-[#C8AA91] leading-relaxed">
                    Simple flat 10% platform fee. No monthly subscriptions, no listing costs, and automatic ledger reconciliation.
                  </p>
                </div>
              </div>

              <div className="p-8 rounded-2xl bg-[#211D1A]/80 border border-[#684332] flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#684332] text-[#F2E7DB] flex items-center justify-center mb-6">
                    <Zap className="w-6 h-6 text-[#C46A4A]" />
                  </div>
                  <h3 className="font-sans text-xl font-bold text-[#FAF7F2] mb-2">
                    Instant Automated Delivery
                  </h3>
                  <p className="text-sm text-[#C8AA91] leading-relaxed">
                    Customers receive cryptographically signed download tokens immediately upon payment. Zero manual fulfillment.
                  </p>
                </div>
              </div>

              <div className="p-8 rounded-2xl bg-[#211D1A]/80 border border-[#684332] flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#684332] text-[#F2E7DB] flex items-center justify-center mb-6">
                    <TrendingUp className="w-6 h-6 text-[#C46A4A]" />
                  </div>
                  <h3 className="font-sans text-xl font-bold text-[#FAF7F2] mb-2">
                    Creator Command Center
                  </h3>
                  <p className="text-sm text-[#C8AA91] leading-relaxed">
                    Track gross volume, review ratings, conversion funnels, and order histories directly inside your dedicated seller portal.
                  </p>
                </div>
              </div>
            </div>

            {/* Creator CTA */}
            <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-[#684332] to-[#3B261C] border border-[#8A6048] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
              <div>
                <h3 className="text-2xl sm:text-3xl font-sans font-extrabold text-[#FAF7F2]">
                  Start selling on Folio today
                </h3>
                <p className="text-sm text-[#F2E7DB]/90 mt-1">
                  Submit your application in 2 minutes. Approved creators can publish immediately.
                </p>
              </div>
              <Link
                href="/signup/seller"
                className="px-8 py-4 rounded-xl text-sm font-extrabold text-[#3B261C] bg-[#FAF7F2] hover:bg-[#FFFFFF] transition-all shrink-0 shadow-lg"
              >
                Open Creator Store →
              </Link>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* SECTION E: HOW IT WORKS (Warm Off-White #FAF7F2)               */}
        {/* ============================================================== */}
        <section id="how-it-works" className="py-20 sm:py-24 bg-[#FAF7F2] border-b border-[#C8AA91]/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#8A6048] block mb-2">
                Simplicity by Design
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-sans font-extrabold text-[#151311] tracking-tight">
                How purchasing works
              </h2>
              <p className="text-base sm:text-lg text-[#684332] mt-3 font-normal">
                Three friction-free steps to acquiring licensed digital assets for your work.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-2xl border border-[#C8AA91]/60 bg-[#FFFFFF] shadow-sm flex flex-col gap-4">
                <span className="text-3xl font-sans font-extrabold text-[#A94432]">01</span>
                <h3 className="font-sans text-xl font-bold text-[#151311]">
                  Discover & Verify
                </h3>
                <p className="text-sm text-[#684332] leading-relaxed font-normal">
                  Explore full file specifications, version histories, live demos, and verified customer reviews before purchasing.
                </p>
              </div>

              <div className="p-8 rounded-2xl border border-[#C8AA91]/60 bg-[#FFFFFF] shadow-sm flex flex-col gap-4">
                <span className="text-3xl font-sans font-extrabold text-[#A94432]">02</span>
                <h3 className="font-sans text-xl font-bold text-[#151311]">
                  Direct Checkout
                </h3>
                <p className="text-sm text-[#684332] leading-relaxed font-normal">
                  Checkout in seconds with transparent pricing in Indian Rupees (₹) paise accuracy. No recurring surprises.
                </p>
              </div>

              <div className="p-8 rounded-2xl border border-[#C8AA91]/60 bg-[#FFFFFF] shadow-sm flex flex-col gap-4">
                <span className="text-3xl font-sans font-extrabold text-[#A94432]">03</span>
                <h3 className="font-sans text-xl font-bold text-[#151311]">
                  Instant Vault Access
                </h3>
                <p className="text-sm text-[#684332] leading-relaxed font-normal">
                  Downloads are added permanently to your personal library with cryptographically signed, secure token downloads.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* SECTION F: FINAL EDITORIAL BANNER                              */}
        {/* ============================================================== */}
        <section className="py-20 sm:py-24 bg-[#F2E7DB] border-b border-[#C8AA91]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-5xl font-sans font-extrabold text-[#151311] tracking-tight leading-tight">
              Ready to accelerate your next project or monetize your craft?
            </h2>
            <p className="text-base sm:text-lg text-[#684332] mt-4 max-w-2xl mx-auto font-normal">
              Join thousands of makers discovering and publishing digital goods on Folio.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
              <Link
                href="/discover"
                className="px-8 py-4 rounded-xl text-base font-extrabold text-[#FAF7F2] bg-[#3B261C] hover:bg-[#684332] transition-all shadow-lg shadow-[#3B261C]/20"
              >
                Browse Marketplace Catalog
              </Link>
              <Link
                href="/signup/seller"
                className="px-8 py-4 rounded-xl text-base font-extrabold text-[#3B261C] bg-[#FFFFFF] border-2 border-[#3B261C] hover:bg-[#FAF7F2] transition-all"
              >
                Become a Seller
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketplaceFooter />
    </SpatialBackground>
  );
}
