"use client";

import React from "react";
import Link from "next/link";
import { Lock, ShieldCheck, ArrowRight } from "lucide-react";
import { MarketplaceBrandLogo } from "@/components/ui/MarketplaceBrandLogo";

export function MarketplaceFooter() {
  return (
    <footer className="relative z-10 border-t border-[#684332]/40 bg-[#211D1A] text-[#C8AA91] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-[#3B261C]">
          {/* Brand Col */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <MarketplaceBrandLogo variant="dark" size="lg" showTagline={true} />

            <p className="text-[13px] text-[#C8AA91] leading-relaxed max-w-sm font-normal mt-1">
              A curated digital marketplace connecting independent creators, developers, and designers with builders across the globe. Built for high-integrity digital commerce.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#3B261C] text-[#F2E7DB] border border-[#684332]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C46A4A]" />
                <span>Verified Payments</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#3B261C] text-[#F2E7DB] border border-[#684332]">
                <Lock className="w-3.5 h-3.5 text-[#C8AA91]" />
                <span>Signed Expiring Downloads</span>
              </div>
            </div>
          </div>

          {/* Col 1: Discover */}
          <div className="flex flex-col gap-3">
            <h4 className="text-[12px] font-bold tracking-widest uppercase text-[#FAF7F2]">
              Discover
            </h4>
            <ul className="flex flex-col gap-2.5 text-xs">
              <li>
                <Link href="/discover" className="hover:text-[#FAF7F2] transition-colors">
                  Explore Products
                </Link>
              </li>
              <li>
                <Link href="/discover?category=design" className="hover:text-[#FAF7F2] transition-colors">
                  Design Systems & UI
                </Link>
              </li>
              <li>
                <Link href="/discover?category=development" className="hover:text-[#FAF7F2] transition-colors">
                  Developer Templates
                </Link>
              </li>
              <li>
                <Link href="/discover?category=music-audio" className="hover:text-[#FAF7F2] transition-colors">
                  Music & Sound Packs
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: For Customers */}
          <div className="flex flex-col gap-3">
            <h4 className="text-[12px] font-bold tracking-widest uppercase text-[#FAF7F2]">
              For Buyers
            </h4>
            <ul className="flex flex-col gap-2.5 text-xs">
              <li>
                <Link href="/signup/customer" className="hover:text-[#FAF7F2] transition-colors">
                  Create Customer Account
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#FAF7F2] transition-colors">
                  Log In to Account
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#FAF7F2] transition-colors">
                  Buyer Dashboard & Library
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-[#FAF7F2] transition-colors">
                  How Purchasing Works
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: For Sellers */}
          <div className="flex flex-col gap-3">
            <h4 className="text-[12px] font-bold tracking-widest uppercase text-[#FAF7F2]">
              For Sellers
            </h4>
            <ul className="flex flex-col gap-2.5 text-xs">
              <li>
                <Link href="/signup/seller" className="hover:text-[#FAF7F2] text-[#FAF7F2] font-semibold flex items-center gap-1 transition-colors">
                  <span>Start Selling</span>
                  <ArrowRight className="w-3 h-3 text-[#C46A4A]" />
                </Link>
              </li>
              <li>
                <Link href="/seller/application-status" className="hover:text-[#FAF7F2] transition-colors">
                  Seller Application Status
                </Link>
              </li>
              <li>
                <Link href="/seller" className="hover:text-[#FAF7F2] transition-colors">
                  Seller Workspace
                </Link>
              </li>
              <li>
                <Link href="/seller/products/new" className="hover:text-[#FAF7F2] transition-colors">
                  List a Digital Product
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#C8AA91]">
          <p>© {new Date().getFullYear()} Folio Marketplace. Precision digital commerce & creator economy.</p>
          <div className="flex items-center gap-6 text-[12px] font-medium tracking-wide">
            <Link href="/#trust-section" className="hover:text-[#FAF7F2] transition-colors">
              Trust & Security
            </Link>
            <Link href="/#how-it-works" className="hover:text-[#FAF7F2] transition-colors">
              Marketplace Model
            </Link>
            <Link href="/discover" className="hover:text-[#FAF7F2] transition-colors">
              All Products
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default MarketplaceFooter;
