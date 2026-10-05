"use client";

import React from "react";
import Link from "next/link";
import { Shield, Sparkles, ArrowUpRight, Lock, CheckCircle2 } from "lucide-react";

export function MarketplaceFooter() {
  return (
    <footer className="relative z-10 border-t border-slate-800/80 bg-[#06080d]/90 backdrop-blur-md pt-16 pb-12 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-slate-800/60">
          {/* Brand Info */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-900 border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
              </div>
              <span className="text-sm font-semibold tracking-wider text-slate-100 uppercase font-mono">
                Aura<span className="text-orange-500">.</span>Digital
              </span>
            </Link>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm font-light">
              A curated multi-vendor marketplace engineered for discovering, purchasing, and
              delivering digital creator assets with cryptographic payment verification and
              time-limited signed storage.
            </p>

            <div className="flex items-center gap-4 mt-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>All Systems Operational</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono bg-slate-800/60 text-slate-400 border border-slate-700/60">
                <Lock className="w-3 h-3 text-orange-400" />
                <span>256-Bit TLS</span>
              </div>
            </div>
          </div>

          {/* Col 1: Marketplace */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-mono font-medium tracking-widest uppercase text-slate-200">
              Marketplace
            </h4>
            <ul className="flex flex-col gap-2 text-xs">
              <li>
                <Link href="/products" className="hover:text-orange-400 transition-colors">
                  Explore Catalog
                </Link>
              </li>
              <li>
                <Link href="/products#categories" className="hover:text-orange-400 transition-colors">
                  Categories
                </Link>
              </li>
              <li>
                <Link href="/products?sort=sales" className="hover:text-orange-400 transition-colors">
                  Trending Products
                </Link>
              </li>
              <li>
                <Link href="/products?sort=rating" className="hover:text-orange-400 transition-colors">
                  Top Rated
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: For Creators */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-mono font-medium tracking-widest uppercase text-slate-200">
              Creators
            </h4>
            <ul className="flex flex-col gap-2 text-xs">
              <li>
                <Link href="/seller" className="hover:text-orange-400 transition-colors">
                  Become a Seller
                </Link>
              </li>
              <li>
                <Link href="/seller/products" className="hover:text-orange-400 transition-colors">
                  Manage Products
                </Link>
              </li>
              <li>
                <Link href="/seller/earnings" className="hover:text-orange-400 transition-colors">
                  Seller Earnings (90%)
                </Link>
              </li>
              <li>
                <Link href="/seller/profile" className="hover:text-orange-400 transition-colors">
                  Store Profile
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Buyers & Trust */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-mono font-medium tracking-widest uppercase text-slate-200">
              Buyer Portal
            </h4>
            <ul className="flex flex-col gap-2 text-xs">
              <li>
                <Link href="/dashboard/library" className="hover:text-orange-400 transition-colors">
                  Digital Library
                </Link>
              </li>
              <li>
                <Link href="/dashboard/orders" className="hover:text-orange-400 transition-colors">
                  Order Receipts
                </Link>
              </li>
              <li>
                <Link href="/dashboard/downloads" className="hover:text-orange-400 transition-colors">
                  Secure Downloads
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-orange-400 transition-colors flex items-center gap-1">
                  <span>Admin Hub</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-500" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-400">
          <p>© {new Date().getFullYear()} Aura Digital Marketplace. Integer paise ledger. 15-min signed URLs.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-300 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-300 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-300 cursor-pointer">Security Standards</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
export default MarketplaceFooter;
