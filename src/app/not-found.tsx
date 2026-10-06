"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { MarketplaceNavbar } from "@/components/ui/MarketplaceNavbar";
import { MarketplaceFooter } from "@/components/ui/MarketplaceFooter";
import { SpatialBackground } from "@/components/ui/SpatialBackground";

export default function NotFound() {
  return (
    <SpatialBackground>
      <MarketplaceNavbar />
      <main className="min-h-[75vh] flex items-center justify-center px-4 py-24">
        <div className="max-w-md w-full p-8 rounded-3xl border border-[#3A2930] bg-[#211815] text-center shadow-2xl shadow-black/80">
          <div className="w-14 h-14 rounded-2xl bg-[#1B101B] border border-[#3A2930] flex items-center justify-center text-[#F43F5E] mx-auto mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-mono tracking-[0.25em] text-[#E8D5B5] uppercase font-medium block mb-2">
            404 — Not Found
          </span>
          <h1 className="text-2xl font-serif text-[#F7EFE2] font-normal mb-2">
            Resource Unavailable
          </h1>
          <p className="text-xs text-[#BBAE9F] font-light mb-6 leading-relaxed">
            The page or digital asset you are seeking has been moved or does not exist in our catalog.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-medium text-white bg-[#F43F5E] hover:bg-[#FB7185] active:bg-[#9F1239] transition-all shadow-md shadow-[#F43F5E]/30"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Marketplace</span>
          </Link>
        </div>
      </main>
      <MarketplaceFooter />
    </SpatialBackground>
  );
}
