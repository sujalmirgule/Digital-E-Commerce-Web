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
        className={`relative flex items-center justify-center rounded-xl border font-sans font-extrabold tracking-tighter transition-all duration-200 ${markSizes[size]} ${
          isDark
            ? "border-[#C8AA91]/40 bg-[#FAF7F2] text-[#3B261C]"
            : "border-[#684332]/30 bg-[#3B261C] text-[#FAF7F2] group-hover:bg-[#684332]"
        } shadow-sm`}
      >
        <span className="relative z-10 font-serif italic text-base">F</span>
        {/* Subtle decorative terracotta accent corner */}
        <span
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-tl-sm bg-[#C46A4A]"
          aria-hidden="true"
        />
      </div>

      {/* Brand Wordmark */}
      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-serif tracking-tight font-bold ${textSizes[size]} ${
              isDark ? "text-[#FAF7F2]" : "text-[#151311]"
            }`}
          >
            Folio
          </span>
          <span className="text-[10px] uppercase font-sans tracking-widest px-1.5 py-0.5 rounded border border-[#C8AA91]/60 bg-[#F2E7DB] text-[#3B261C] font-bold">
            Market
          </span>
        </div>
        {showTagline && (
          <span
            className={`text-[10px] tracking-wider uppercase font-sans font-semibold mt-0.5 ${
              isDark ? "text-[#C8AA91]" : "text-[#8A6048]"
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
