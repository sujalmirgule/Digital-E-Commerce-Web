"use client";

import React from "react";
import Link from "next/link";
import { Star, ArrowRight, Play, Sparkles, Code, Palette, Box } from "lucide-react";

export function HeroProductCollage() {
  return (
    <div className="relative w-full max-w-2xl mx-auto lg:max-w-none perspective-1000 py-6 select-none">
      {/* Background Soft Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#C8AA91]/25 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Main Collage Canvas */}
      <div className="relative min-h-[460px] sm:min-h-[520px] flex items-center justify-center">

        {/* 1. CENTRAL HERO CARD: SaaS & Design Starter */}
        <div className="relative z-30 w-[290px] sm:w-[350px] rounded-2xl border border-[#C8AA91] bg-[#FFFFFF] shadow-[0_20px_50px_rgba(59,38,28,0.18)] hover:-translate-y-2 hover:shadow-[0_28px_60px_rgba(59,38,28,0.22)] transition-all duration-300 overflow-hidden">
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#F2E7DB] border-b border-[#C8AA91]/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/products/product-10.svg"
              alt="Next.js 14 Production SaaS Starter"
              className="w-full h-full object-cover"
              loading="eager"
            />
            <div className="absolute top-3 left-3 flex gap-1.5">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-[#3B261C] text-[#FAF7F2]">
                DEVELOPMENT
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-[#A94432] text-[#FFFFFF]">
                BESTSELLER
              </span>
            </div>
          </div>
          <div className="p-4 sm:p-5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-[#8A6048]">
              <span className="font-semibold text-[#3B261C]">by Apex Code Labs</span>
              <div className="flex items-center gap-1 font-bold text-[#151311]">
                <Star className="w-3.5 h-3.5 fill-[#C46A4A] text-[#C46A4A]" />
                <span>4.98</span>
                <span className="text-[#8A6048] font-normal">(240)</span>
              </div>
            </div>
            <h4 className="font-sans text-[17px] sm:text-lg font-bold text-[#151311] line-clamp-1">
              Next.js 14 Production SaaS Starter
            </h4>
            <div className="pt-2 flex items-center justify-between border-t border-[#E6DBD1]">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-extrabold text-[#151311]">₹3,999</span>
                <span className="text-xs text-[#8A6048] line-through">₹4,999</span>
              </div>
              <span className="text-[11px] font-bold text-[#A94432] uppercase tracking-wider">
                Full-Stack Kit →
              </span>
            </div>
          </div>
        </div>

        {/* 2. TOP-LEFT OVERLAPPING CARD: Music & Lo-Fi Beats (-6deg tilt) */}
        <div className="absolute -top-2 left-0 sm:left-4 z-20 w-[190px] sm:w-[230px] rounded-2xl border border-[#C8AA91]/70 bg-[#FFFFFF] shadow-[0_16px_36px_rgba(59,38,28,0.12)] -rotate-6 hover:rotate-0 hover:-translate-y-2 hover:z-40 transition-all duration-300 overflow-hidden hidden sm:block">
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#3B261C]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/products/product-25.svg"
              alt="Indie Chill Lo-Fi Sample Pack"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-[#FAF7F2] text-[#3B261C]">
              AUDIO & SAMPLES
            </div>
          </div>
          <div className="p-3">
            <span className="text-[10px] text-[#8A6048] font-medium block">by Nordic Audio</span>
            <h5 className="font-sans text-xs font-bold text-[#151311] truncate mt-0.5">
              Indie Chill Lo-Fi Pack
            </h5>
            <div className="flex items-center justify-between mt-1 text-xs">
              <span className="font-extrabold text-[#151311]">₹999</span>
              <span className="text-[10px] text-[#C46A4A] font-bold">180+ WAV Loops</span>
            </div>
          </div>
        </div>

        {/* 3. TOP-RIGHT OVERLAPPING CARD: E-Book & Handbook (5deg tilt) */}
        <div className="absolute top-2 right-0 sm:right-4 z-20 w-[190px] sm:w-[230px] rounded-2xl border border-[#C8AA91]/70 bg-[#FFFFFF] shadow-[0_16px_36px_rgba(59,38,28,0.12)] rotate-6 hover:rotate-0 hover:-translate-y-2 hover:z-40 transition-all duration-300 overflow-hidden hidden sm:block">
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#FAF7F2]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/products/product-35.svg"
              alt="Full-Stack System Design Handbook"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-[#3B261C] text-[#FAF7F2]">
              E-BOOK & GUIDE
            </div>
          </div>
          <div className="p-3">
            <span className="text-[10px] text-[#8A6048] font-medium block">by Paper & Ink Press</span>
            <h5 className="font-sans text-xs font-bold text-[#151311] truncate mt-0.5">
              System Design Handbook
            </h5>
            <div className="flex items-center justify-between mt-1 text-xs">
              <span className="font-extrabold text-[#151311]">₹1,499</span>
              <span className="text-[10px] text-[#3B7A57] font-bold">PDF + ePub</span>
            </div>
          </div>
        </div>

        {/* 4. BOTTOM-LEFT OVERLAPPING CARD: 3D Assets (-3deg tilt) */}
        <div className="absolute -bottom-4 left-2 sm:left-8 z-20 w-[180px] sm:w-[220px] rounded-2xl border border-[#C8AA91]/70 bg-[#FFFFFF] shadow-[0_16px_36px_rgba(59,38,28,0.12)] -rotate-3 hover:rotate-0 hover:-translate-y-2 hover:z-40 transition-all duration-300 overflow-hidden hidden sm:block">
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#211D1A]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/products/product-40.svg"
              alt="3D Clay Tech Icon Collection"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-[#A94432] text-[#FFFFFF]">
              3D ASSETS
            </div>
          </div>
          <div className="p-3">
            <span className="text-[10px] text-[#8A6048] font-medium block">by Voxel 3D Studio</span>
            <h5 className="font-sans text-xs font-bold text-[#151311] truncate mt-0.5">
              Clay 3D Icon Pack
            </h5>
            <div className="flex items-center justify-between mt-1 text-xs">
              <span className="font-extrabold text-[#151311]">₹1,299</span>
              <span className="text-[10px] text-[#8A6048] font-medium">Blender + FBX</span>
            </div>
          </div>
        </div>

        {/* 5. BOTTOM-RIGHT OVERLAPPING CARD: Photography Film Presets (4deg tilt) */}
        <div className="absolute -bottom-2 right-2 sm:right-8 z-20 w-[180px] sm:w-[220px] rounded-2xl border border-[#C8AA91]/70 bg-[#FFFFFF] shadow-[0_16px_36px_rgba(59,38,28,0.12)] rotate-4 hover:rotate-0 hover:-translate-y-2 hover:z-40 transition-all duration-300 overflow-hidden hidden sm:block">
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#F2E7DB]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/products/product-30.svg"
              alt="Cinematic 35mm Film Presets"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-[#3B261C] text-[#FAF7F2]">
              LIGHTROOM
            </div>
          </div>
          <div className="p-3">
            <span className="text-[10px] text-[#8A6048] font-medium block">by Luminary Presets</span>
            <h5 className="font-sans text-xs font-bold text-[#151311] truncate mt-0.5">
              35mm Film Color Profiles
            </h5>
            <div className="flex items-center justify-between mt-1 text-xs">
              <span className="font-extrabold text-[#151311]">₹799</span>
              <span className="text-[10px] text-[#C46A4A] font-bold">12 Presets</span>
            </div>
          </div>
        </div>

        {/* FLOATING FLOATING TAG BADGES */}
        <div className="absolute top-1/2 -left-2 sm:-left-6 z-40 bg-[#3B261C] text-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#684332] shadow-lg text-[11px] font-extrabold flex items-center gap-1.5 -translate-y-16 hidden md:flex animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-[#C46A4A]" />
          <span>Figma UI Kits</span>
        </div>

        <div className="absolute bottom-1/3 -right-2 sm:-right-6 z-40 bg-[#FAF7F2] text-[#3B261C] px-3.5 py-1.5 rounded-xl border border-[#C8AA91] shadow-lg text-[11px] font-extrabold flex items-center gap-1.5 hidden md:flex">
          <Code className="w-3.5 h-3.5 text-[#A94432]" />
          <span>React Boilerplates</span>
        </div>

      </div>
    </div>
  );
}

export default HeroProductCollage;
