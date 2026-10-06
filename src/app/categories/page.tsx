"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Layers,
  ArrowRight,
  Code,
  Palette,
  LayoutTemplate,
  Briefcase,
  GraduationCap,
  Camera,
  Sparkles,
  Search,
} from "lucide-react";
import { SpatialBackground } from "@/components/ui/SpatialBackground";
import { MarketplaceNavbar } from "@/components/ui/MarketplaceNavbar";
import { MarketplaceFooter } from "@/components/ui/MarketplaceFooter";
import { MARKETPLACE_CATEGORIES } from "@/lib/categories";

export default function CategoriesPage() {
  const [search, setSearch] = useState("");

  const filteredCategories = MARKETPLACE_CATEGORIES.filter((cat) => {
    const q = search.toLowerCase();
    return (
      cat.name.toLowerCase().includes(q) ||
      cat.description.toLowerCase().includes(q) ||
      cat.subCategories.some((s) => s.name.toLowerCase().includes(q))
    );
  });

  return (
    <SpatialBackground>
      <MarketplaceNavbar />

      <main className="flex-1 w-full pt-16 sm:pt-20">
        <section className="px-4 sm:px-6 lg:px-8 py-12 md:py-16 max-w-7xl mx-auto">
          {/* Header */}
          <div className="pb-8 mb-10 border-b border-[#E6DBD1]">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D8BFA5] bg-[#F3E9DD] mb-3">
                  <Layers className="w-3.5 h-3.5 text-[#6B4632]" />
                  <span className="text-[11px] font-mono tracking-widest text-[#3B2418] uppercase font-semibold">
                    Directory & Classification
                  </span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-serif font-medium text-[#111111] tracking-tight">
                  Marketplace Categories
                </h1>
                <p className="text-sm text-[#6B4632] mt-2 font-light max-w-xl">
                  Explore curated digital goods, tools, and creator assets organized by craft, framework, and discipline.
                </p>
              </div>

              {/* Filter search */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-[#6B4632]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter categories & subcategories..."
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-md bg-[#FFFFFF] border border-[#E6DBD1] text-[#111111] placeholder-[#A98165] focus:outline-none focus:border-[#3B2418] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCategories.map((cat) => (
              <div
                key={cat.id}
                className="rounded-xl border border-[#E6DBD1] bg-[#FFFFFF] p-6 hover:border-[#3B2418] transition-all duration-200 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E6DBD1]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-lg border border-[#D8BFA5] bg-[#F3E9DD] flex items-center justify-center text-[#3B2418]">
                        {cat.slug === "design" && <Palette className="w-4 h-4" />}
                        {cat.slug === "development" && <Code className="w-4 h-4" />}
                        {cat.slug === "templates" && <LayoutTemplate className="w-4 h-4" />}
                        {cat.slug === "business" && <Briefcase className="w-4 h-4" />}
                        {cat.slug === "education" && <GraduationCap className="w-4 h-4" />}
                        {cat.slug === "creative" && <Camera className="w-4 h-4" />}
                        {cat.slug === "ai" && <Sparkles className="w-4 h-4" />}
                      </span>
                      <h2 className="font-serif text-xl font-medium text-[#111111]">
                        <Link href={`/discover?category=${cat.slug}`} className="hover:text-[#6B4632]">
                          {cat.name}
                        </Link>
                      </h2>
                    </div>
                    <span className="text-[11px] font-mono text-[#A98165]">
                      {cat.subCategories.length} Subtypes
                    </span>
                  </div>

                  <p className="text-xs text-[#6B4632] font-light mb-6 leading-relaxed">
                    {cat.description}
                  </p>

                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#A98165] block font-semibold">
                      Subcategories
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.subCategories.map((sub) => (
                        <Link
                          key={sub.slug}
                          href={`/discover?category=${cat.slug}&sub=${sub.slug}`}
                          className="text-xs px-2.5 py-1 rounded bg-[#FAF8F4] border border-[#E6DBD1] text-[#3B2418] hover:border-[#3B2418] hover:text-[#111111] transition-colors"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-[#E6DBD1] flex items-center justify-between">
                  <Link
                    href={`/discover?category=${cat.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider font-semibold text-[#111111] hover:text-[#B42318] transition-colors"
                  >
                    <span>Browse All in {cat.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <MarketplaceFooter />
    </SpatialBackground>
  );
}
