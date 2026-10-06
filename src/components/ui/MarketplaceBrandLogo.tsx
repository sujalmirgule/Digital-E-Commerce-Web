"use client";

import React from "react";
import Link from "next/link";

interface BrandLogoProps {
  variant?: "light" | "dark" | "default";
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}

export function MarketplaceBrandLogo({
  variant = "default",
  size = "md",
  showTagline = false,
  className = "",
}: BrandLogoProps) {
  const isDark = variant === "dark";

  const markSizes = {
    sm: "w-7 h-7 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2.5 transition-opacity hover:opacity-90 ${className}`}
      aria-label="Folio Digital Marketplace Homepage"
    >
      {/* Crafted Editorial Geometric Mark */}
      <div
        className={`relative flex items-center justify-center rounded-lg border font-mono font-bold tracking-tighter transition-all duration-200 ${markSizes[size]} ${
          isDark
            ? "border-[#D8BFA5]/30 bg-[#3B2418] text-[#F3E9DD]"
            : "border-[#6B4632]/20 bg-[#3B2418] text-[#FAF8F4] group-hover:bg-[#6B4632]"
        } shadow-sm`}
      >
        <span className="relative z-10 font-serif italic text-base">F</span>
        {/* Subtle decorative warm brown accent corner */}
        <span
          className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-tl-sm bg-[#B42318]"
          aria-hidden="true"
        />
      </div>

      {/* Brand Wordmark */}
      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-serif tracking-tight font-medium ${textSizes[size]} ${
              isDark ? "text-[#FAF8F4]" : "text-[#111111]"
            }`}
          >
            Folio
          </span>
          <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded border border-[#D8BFA5]/40 bg-[#F3E9DD] text-[#6B4632] font-semibold">
            Market
          </span>
        </div>
        {showTagline && (
          <span
            className={`text-[10px] tracking-wider uppercase font-mono mt-0.5 ${
              isDark ? "text-[#D8BFA5]" : "text-[#6B4632]"
            }`}
          >
            Digital Goods & Assets
          </span>
        )}
      </div>
    </Link>
  );
}

export default MarketplaceBrandLogo;
