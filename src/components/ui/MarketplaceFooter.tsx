"use client";

import React from "react";
import Link from "next/link";
import { Lock, ArrowUpRight } from "lucide-react";

export function MarketplaceFooter() {
  return (
    <footer className="relative z-10 border-t border-[#3A2930] bg-[#120A12] pt-16 pb-12 text-[#BBAE9F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-[#3A2930]">
          {/* Brand Info */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#211815] border border-[#3A2930]">
                <span className="w-2 h-2 rounded-full bg-[#F43F5E] shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
              </div>
              <span className="text-base font-medium tracking-tight text-[#F7EFE2] font-editorial">
                Marketify
              </span>
            </Link>

            <p className="text-xs text-[#BBAE9F] leading-relaxed max-w-sm font-light">
              Good digital products deserve to be discovered. A curated marketplace connecting independent creators with builders around the world.
            </p>

            <div className="flex items-center gap-3 mt-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] bg-[#86A989]/10 text-[#86A989] border border-[#86A989]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#86A989] animate-pulse" />
                <span>All Systems Operational</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] bg-[#211815] text-[#BBAE9F] border border-[#3A2930]">
                <Lock className="w-3 h-3 text-[#E8D5B5]" />
                <span>256-Bit TLS</span>
              </div>
            </div>
          </div>

          {/* Col 1: Marketplace */}
          <div className="flex flex-col gap-3">
            <h4 className="text-[11px] font-mono font-medium tracking-[0.2em] uppercase text-[#E8D5B5]">
              Marketplace
            </h4>
            <ul className="flex flex-col gap-2.5 text-xs">
              <li>
                <Link href="/products" className="hover:text-[#F7EFE2] transition-colors">
                  Explore Catalog
                </Link>
              </li>
              <li>
                <Link href="/products#categories" className="hover:text-[#F7EFE2] transition-colors">
                  Categories
                </Link>
              </li>
              <li>
                <Link href="/products?sort=sales" className="hover:text-[#F7EFE2] transition-colors">
                  Trending Products
                </Link>
              </li>
              <li>
                <Link href="/products?sort=rating" className="hover:text-[#F7EFE2] transition-colors">
                  Top Rated
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: For Creators */}
          <div className="flex flex-col gap-3">
            <h4 className="text-[11px] font-mono font-medium tracking-[0.2em] uppercase text-[#E8D5B5]">
              Sell
            </h4>
            <ul className="flex flex-col gap-2.5 text-xs">
              <li>
                <Link href="/seller/signup" className="hover:text-[#F7EFE2] transition-colors">
                  Become a Seller
                </Link>
              </li>
              <li>
                <Link href="/seller/products" className="hover:text-[#F7EFE2] transition-colors">
                  Seller Studio
                </Link>
              </li>
              <li>
                <Link href="/seller/products/new" className="hover:text-[#F7EFE2] transition-colors">
                  Upload Product
                </Link>
              </li>
              <li>
                <Link href="/seller/earnings" className="hover:text-[#F7EFE2] transition-colors">
                  Earnings & Settlement
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Buyers & Trust */}
          <div className="flex flex-col gap-3">
            <h4 className="text-[11px] font-mono font-medium tracking-[0.2em] uppercase text-[#E8D5B5]">
              Account
            </h4>
            <ul className="flex flex-col gap-2.5 text-xs">
              <li>
                <Link href="/dashboard" className="hover:text-[#F7EFE2] transition-colors">
                  Buyer Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/library" className="hover:text-[#F7EFE2] transition-colors">
                  Digital Library
                </Link>
              </li>
              <li>
                <Link href="/dashboard/orders" className="hover:text-[#F7EFE2] transition-colors">
                  Order Receipts
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-[#F43F5E] transition-colors flex items-center gap-1">
                  <span>Platform Control</span>
                  <ArrowUpRight className="w-3 h-3 text-[#BBAE9F]" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#BBAE9F]/80">
          <p>© {new Date().getFullYear()} Marketify. Precision ledger mathematics. Expiring signed cloud downloads.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-[#F7EFE2] cursor-pointer">Privacy Policy</span>
            <span className="hover:text-[#F7EFE2] cursor-pointer">Terms of Service</span>
            <span className="hover:text-[#F7EFE2] cursor-pointer">Creator Standards</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
export default MarketplaceFooter;

