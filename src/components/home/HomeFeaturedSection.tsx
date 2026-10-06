"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { ProductCard, ProductCardData } from "@/components/ui/ProductCard";

interface HomeFeaturedSectionProps {
  initialProducts: ProductCardData[];
}

const FILTER_TABS = [
  { label: "All Items", value: "all" },
  { label: "Design", value: "design" },
  { label: "Development", value: "development" },
  { label: "Templates", value: "templates" },
  { label: "Music & Audio", value: "music-audio" },
  { label: "Photography", value: "photography" },
  { label: "Education", value: "education" },
  { label: "3D", value: "3d" },
  { label: "AI", value: "ai" },
  { label: "Business", value: "business" },
];

export function HomeFeaturedSection({ initialProducts }: HomeFeaturedSectionProps) {
  const [activeTab, setActiveTab] = useState("all");

  const filteredProducts = useMemo(() => {
    if (activeTab === "all") return initialProducts.slice(0, 12);
    return initialProducts
      .filter((p) => {
        const catSlug = p.category?.slug?.toLowerCase() || "";
        const catName = p.category?.name?.toLowerCase() || "";
        return catSlug === activeTab || catName.includes(activeTab);
      })
      .slice(0, 12);
  }, [initialProducts, activeTab]);

  return (
    <section className="py-20 sm:py-24 bg-[#FFFFFF] border-b border-[#E6DBD1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#F2E7DB] text-[#3B261C] mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#C46A4A]" />
              <span>Staff Picks & Popular Releases</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-sans font-extrabold text-[#151311] tracking-tight">
              Curated Digital Products
            </h2>
            <p className="text-base sm:text-lg text-[#684332] mt-2 font-normal max-w-2xl">
              Inspect verified source code, design systems, sound packs, and handbooks with lifetime commercial usage.
            </p>
          </div>

          <Link
            href="/discover"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#3B261C] hover:text-[#A94432] group transition-colors self-start md:self-auto"
          >
            <span>Explore All Products</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {FILTER_TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-[13px] font-bold whitespace-nowrap transition-all duration-200 border ${
                  isActive
                    ? "bg-[#3B261C] text-[#FAF7F2] border-[#3B261C] shadow-sm"
                    : "bg-[#FAF7F2] text-[#3B261C] border-[#C8AA91]/50 hover:bg-[#F2E7DB] hover:border-[#3B261C]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Product Cards Grid: 4 Cols Desktop, 2-3 Tablet, 1 Mobile */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl border border-dashed border-[#C8AA91] bg-[#FAF7F2]">
            <p className="text-sm font-bold text-[#3B261C]">
              No products found in this category yet.
            </p>
            <button
              onClick={() => setActiveTab("all")}
              className="mt-3 text-xs font-bold text-[#A94432] hover:underline"
            >
              Reset to all categories
            </button>
          </div>
        )}

        {/* View All Bottom CTA */}
        <div className="mt-14 text-center">
          <Link
            href="/discover"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-extrabold text-[#FAF7F2] bg-[#3B261C] hover:bg-[#684332] active:bg-[#211D1A] transition-all shadow-md shadow-[#3B261C]/20"
          >
            <span>Browse Full Catalog (60+ Digital Assets)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default HomeFeaturedSection;
