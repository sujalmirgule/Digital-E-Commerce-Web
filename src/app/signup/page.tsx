"use client";

import React from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Store,
  ArrowRight,
  Download,
  BookOpen,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SpatialBackground } from "@/components/ui/SpatialBackground";
import { MarketplaceNavbar } from "@/components/ui/MarketplaceNavbar";
import { MarketplaceFooter } from "@/components/ui/MarketplaceFooter";

export default function SignupSelectionPage() {
  return (
    <SpatialBackground>
      <MarketplaceNavbar />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="w-full max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D8BFA5] bg-[#F3E9DD] mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#B42318]" />
              <span className="text-[11px] font-mono tracking-widest text-[#3B2418] uppercase font-semibold">
                Get Started with Folio
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif font-medium text-[#111111] tracking-tight">
              How would you like to use the marketplace?
            </h1>
            <p className="text-sm text-[#6B4632] mt-3 font-light max-w-lg mx-auto">
              Choose your path to join our community. Both accounts are part of the same unified digital commerce platform.
            </p>
          </div>

          {/* Two-Choice Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* CHOICE 1: BUY AS A CUSTOMER */}
            <div className="group rounded-2xl border-2 border-[#E6DBD1] hover:border-[#3B2418] bg-[#FFFFFF] p-8 sm:p-10 transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-md">
              <div>
                <div className="w-12 h-12 rounded-xl border border-[#D8BFA5] bg-[#F3E9DD] flex items-center justify-center text-[#3B2418] mb-6 group-hover:bg-[#3B2418] group-hover:text-[#FFFFFF] transition-colors">
                  <ShoppingBag className="w-6 h-6" />
                </div>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#B42318] font-bold">
                    For Individuals & Teams
                  </span>
                </div>

                <h2 className="text-2xl font-serif font-medium text-[#111111] mb-3">
                  Buy as a Customer
                </h2>

                <p className="text-xs text-[#6B4632] font-light leading-relaxed mb-6">
                  Access premium developer kits, design resources, and digital templates to accelerate your projects.
                </p>

                {/* Feature Checklist */}
                <ul className="space-y-3 pt-4 border-t border-[#E6DBD1] text-xs text-[#3B2418]">
                  <li className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B42318]" />
                    <span>Discover verified digital products</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B42318]" />
                    <span>Buy products with instant Razorpay checkout</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B42318]" />
                    <span>Access your personal digital library</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B42318]" />
                    <span>Download purchases and tax invoices anytime</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-[#E6DBD1]">
                <Link
                  href="/signup/customer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#FFFFFF] bg-[#111111] hover:bg-[#3B2418] transition-colors shadow-sm"
                >
                  <span>Create Customer Account</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* CHOICE 2: SELL DIGITAL PRODUCTS */}
            <div className="group rounded-2xl border-2 border-[#D8BFA5] hover:border-[#111111] bg-[#FAF8F4] p-8 sm:p-10 transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-md">
              <div>
                <div className="w-12 h-12 rounded-xl border border-[#3B2418] bg-[#3B2418] flex items-center justify-center text-[#FAF8F4] mb-6">
                  <Store className="w-6 h-6" />
                </div>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#3B2418] font-bold">
                    For Creators & Publishers
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E6DBD1] text-[#3B2418] font-semibold">
                    Admin Moderated
                  </span>
                </div>

                <h2 className="text-2xl font-serif font-medium text-[#111111] mb-3">
                  Sell Digital Products
                </h2>

                <p className="text-xs text-[#6B4632] font-light leading-relaxed mb-6">
                  Turn your code, designs, and templates into products. Build a storefront and monetize your work.
                </p>

                {/* Feature Checklist */}
                <ul className="space-y-3 pt-4 border-t border-[#D8BFA5] text-xs text-[#3B2418]">
                  <li className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
                    <span>Create and package digital products</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
                    <span>Reach an engaged community of builders</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
                    <span>Manage sales with itemized ledger calculations</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
                    <span>Track 90% net earnings with direct bank payouts</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-[#D8BFA5]">
                <Link
                  href="/signup/seller"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#FAF8F4] bg-[#3B2418] hover:bg-[#111111] transition-colors shadow-sm"
                >
                  <span>Become a Seller</span>
                  <ArrowRight className="w-4 h-4 text-[#D8BFA5]" />
                </Link>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-10 text-center">
            <p className="text-xs text-[#6B4632] font-light">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-[#111111] hover:text-[#B42318] font-medium underline underline-offset-2 transition-colors"
              >
                Sign in here →
              </Link>
            </p>
          </div>
        </div>
      </main>

      <MarketplaceFooter />
    </SpatialBackground>
  );
}
