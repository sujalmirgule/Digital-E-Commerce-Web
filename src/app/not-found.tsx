"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { MarketplaceNavbar } from "@/components/ui/MarketplaceNavbar";
import { MarketplaceFooter } from "@/components/ui/MarketplaceFooter";
import { SpatialBackground } from "@/components/ui/SpatialBackground";

export default function NotFound() {
  return (
    <SpatialBackground>
      <MarketplaceNavbar />
      <main className="min-h-[75vh] flex items-center justify-center px-4 py-24">
        <div className="max-w-md w-full p-8 sm:p-10 rounded-2xl border border-[#E6DBD1] bg-[#FFFFFF] text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-[#F3E9DD] border border-[#D8BFA5] flex items-center justify-center text-[#3B2418] mx-auto mb-4">
            <Compass className="w-6 h-6 text-[#6B4632]" />
          </div>
          <span className="text-[10px] font-mono tracking-widest text-[#B42318] uppercase font-bold block mb-2">
            404 — NOT FOUND
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif text-[#111111] font-medium mb-2">
            Page Not Found
          </h1>
          <p className="text-xs text-[#6B4632] font-light mb-6 leading-relaxed">
            The page or digital asset you are seeking has been moved or does not exist in our catalog.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#FFFFFF] bg-[#111111] hover:bg-[#3B2418] transition-colors shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return Home</span>
            </Link>
            <Link
              href="/discover"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md text-xs font-mono uppercase tracking-wider font-medium text-[#6B4632] hover:text-[#111111] border border-[#E6DBD1] hover:bg-[#FAF8F4] transition-colors"
            >
              <span>Explore Catalog</span>
            </Link>
          </div>
        </div>
      </main>
      <MarketplaceFooter />
    </SpatialBackground>
  );
}
