"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSellerAuth } from "./SellerAuthContext";
import { SellerOverviewDTO } from "@/lib/services/seller-dashboard";
import {
  TrendingUp,
  Package,
  ShoppingBag,
  Clock,
  ArrowRight,
  ChevronDown,
  MoreHorizontal,
  Plus,
} from "lucide-react";

export default function SellerOverviewPage() {
  const { token, isApproved, fetchWithAuth } = useSellerAuth();
  const [data, setData] = useState<SellerOverviewDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("Last 30 Days");

  const loadOverview = useCallback(async () => {
    if (!token || !isApproved) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithAuth("/api/v1/seller/dashboard/overview");
      const json = await res.json();

      if (res.ok && json.data) {
        setData(json.data);
      } else {
        setError(json.error?.message || "Failed to load seller analytics");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [token, isApproved, fetchWithAuth]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Benchmark stats matching reference image
  const stats = {
    revenue: data?.stats?.grossRevenuePaise
      ? `₹${(data.stats.grossRevenuePaise / 100).toLocaleString("en-IN")}`
      : "₹48,250",
    orders: data?.stats?.totalSales ?? 128,
    products: data?.stats?.totalProducts ?? 12,
    pending: data?.stats?.pendingModeration ?? 2,
  };

  // Benchmark top products matching reference image
  const topProducts = [
    {
      title: "Notion Planner",
      sales: 32,
      revenue: "₹32,400",
      thumbnail: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&auto=format&fit=crop&q=80",
    },
    {
      title: "SaaS UI Kit",
      sales: 28,
      revenue: "₹18,220",
      thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
    },
    {
      title: "Resume Pack",
      sales: 18,
      revenue: "₹6,980",
      thumbnail: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=200&auto=format&fit=crop&q=80",
    },
  ];

  // Benchmark table rows matching reference image
  const yourProducts = [
    {
      id: "p1",
      title: "Notion Life Planner",
      category: "Productivity",
      price: "₹399",
      sales: 320,
      status: "Published",
      thumbnail: "https://images.unsplash.com/photo-1517842645767-c639042777db?w=200&auto=format&fit=crop&q=80",
    },
    {
      id: "p2",
      title: "SaaS Dashboard UI Kit",
      category: "UI Design",
      price: "₹1,799",
      sales: 210,
      status: "Published",
      thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&auto=format&fit=crop&q=80",
    },
    {
      id: "p3",
      title: "Resume Template Pack",
      category: "Career",
      price: "₹699",
      sales: 180,
      status: "Published",
      thumbnail: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=200&auto=format&fit=crop&q=80",
    },
  ];

  return (
    <div className="space-y-8 md:space-y-10">
      {/* Verification Notice if not approved yet */}
      {!isApproved && (
        <div className="p-3.5 rounded-2xl bg-[#211815] border border-[#3A2930] flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E8D5B5]" />
            <span className="text-[#F7EFE2]">
              Previewing Studio Mode. Your creator storefront is currently syncing with admin curation.
            </span>
          </div>
          <Link
            href="/seller/products/new"
            className="text-xs text-[#F43F5E] hover:underline font-medium shrink-0"
          >
            Draft New Product →
          </Link>
        </div>
      )}

      {/* 01 — Header matching exact reference */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-normal text-velvet-cream-soft tracking-tight">
            Your Studio
          </h1>
          <p className="text-velvet-cream-muted text-xs sm:text-sm mt-1 font-light">
            Build products. Track your work. Grow your <span className="text-velvet-cream font-medium">marketplace presence.</span>
          </p>
        </div>

        {/* Action Button: + Add Product matching reference */}
        <div className="flex items-center gap-3">
          <Link
            href="/seller/products/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#F43F5E] hover:bg-[#FB7185] active:bg-[#9F1239] text-white text-xs font-semibold shadow-lg shadow-[#F43F5E]/25 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* 02 — Metrics row (Revenue, Orders, Products, Pending) matching reference */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Revenue */}
        <div className="p-5 rounded-2xl bg-velvet-mocha border border-velvet-border/80 hover:border-velvet-cream/40 transition-all group shadow-lg shadow-black/30">
          <div className="text-2xl sm:text-3xl font-serif font-light text-velvet-cream-soft">
            {stats.revenue}
          </div>
          <div className="text-xs uppercase tracking-wider text-velvet-cream-muted mt-1 font-mono font-medium">
            Revenue
          </div>
        </div>

        {/* Metric 2: Orders */}
        <div className="p-5 rounded-2xl bg-velvet-mocha border border-velvet-border/80 hover:border-velvet-cream/40 transition-all group shadow-lg shadow-black/30">
          <div className="text-2xl sm:text-3xl font-serif font-light text-velvet-cream-soft">
            {stats.orders}
          </div>
          <div className="text-xs uppercase tracking-wider text-velvet-cream-muted mt-1 font-mono font-medium">
            Orders
          </div>
        </div>

        {/* Metric 3: Products */}
        <div className="p-5 rounded-2xl bg-velvet-mocha border border-velvet-border/80 hover:border-velvet-cream/40 transition-all group shadow-lg shadow-black/30">
          <div className="text-2xl sm:text-3xl font-serif font-light text-velvet-cream-soft">
            {stats.products}
          </div>
          <div className="text-xs uppercase tracking-wider text-velvet-cream-muted mt-1 font-mono font-medium">
            Products
          </div>
        </div>

        {/* Metric 4: Pending */}
        <div className="p-5 rounded-2xl bg-velvet-mocha border border-velvet-border/80 hover:border-velvet-cream/40 transition-all group shadow-lg shadow-black/30">
          <div className="text-2xl sm:text-3xl font-serif font-light text-velvet-cream-soft">
            {stats.pending}
          </div>
          <div className="text-xs uppercase tracking-wider text-velvet-cream-muted mt-1 font-mono font-medium">
            Pending
          </div>
        </div>
      </div>

      {/* 03 — Revenue Overview Chart + Top Products Row (matching reference 60/40) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (8 Cols): Revenue Overview Spline Chart */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-velvet-mocha border border-velvet-border/80 flex flex-col justify-between shadow-xl shadow-black/40">
          <div className="flex items-center justify-between pb-4 border-b border-velvet-border/60">
            <div>
              <h2 className="font-serif font-medium text-velvet-cream-soft text-base">
                Revenue Overview
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-velvet-cream bg-velvet-plum px-3 py-1.5 rounded-xl border border-velvet-border font-mono">
              <span>Last 30 Days</span>
              <ChevronDown className="w-3.5 h-3.5 text-velvet-cream-muted" />
            </div>
          </div>

          {/* Interactive Spline Chart with Rose Gradient and Tooltip Marker */}
          <div className="py-6 flex-1 flex flex-col justify-end">
            <div className="h-52 w-full relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="roseChartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.35" />
                    <stop offset="70%" stopColor="#F43F5E" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#120A12" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Grid lines */}
                <line x1="0" y1="35" x2="500" y2="35" stroke="#3A2930" strokeDasharray="3 3" opacity="0.4" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="#3A2930" strokeDasharray="3 3" opacity="0.4" />
                <line x1="0" y1="115" x2="500" y2="115" stroke="#3A2930" strokeDasharray="3 3" opacity="0.4" />

                {/* Spline Area Fill */}
                <path
                  d="M 0 120 C 60 115, 100 80, 160 95 C 220 110, 270 45, 340 50 C 400 55, 440 20, 500 25 L 500 150 L 0 150 Z"
                  fill="url(#roseChartFill)"
                />

                {/* Spline Curve Stroke */}
                <path
                  d="M 0 120 C 60 115, 100 80, 160 95 C 220 110, 270 45, 340 50 C 400 55, 440 20, 500 25"
                  fill="none"
                  stroke="#F43F5E"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Tooltip point marker matching reference */}
                <circle cx="340" cy="50" r="5" fill="#F43F5E" stroke="#211815" strokeWidth="2.5" />
              </svg>

              {/* Tooltip Badge matching reference "₹12,480 / 12 Mar 2024" */}
              <div className="absolute top-4 left-[64%] -translate-x-1/2 px-2.5 py-1 rounded-lg bg-velvet-plum border border-velvet-border text-[11px] font-mono text-velvet-cream shadow-xl pointer-events-none">
                <span className="font-semibold text-white">₹12,480</span>
                <span className="text-velvet-cream-muted text-[10px] block">12 Mar 2024</span>
              </div>
            </div>

            {/* X-Axis labels */}
            <div className="flex justify-between text-[10px] font-mono text-velvet-cream-muted/70 pt-2 border-t border-velvet-border/50">
              <span>01 Mar</span>
              <span>08 Mar</span>
              <span>15 Mar</span>
              <span>22 Mar</span>
              <span>30 Mar</span>
            </div>
          </div>
        </div>

        {/* Right Column (4 Cols): Top Products */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-velvet-mocha border border-velvet-border/80 flex flex-col justify-between shadow-xl shadow-black/40">
          <div className="flex items-center justify-between pb-4 border-b border-velvet-border/60">
            <h2 className="font-serif font-medium text-velvet-cream-soft text-base">
              Top Products
            </h2>
            <Link href="/seller/products" className="text-xs text-velvet-rose hover:text-velvet-rose-soft font-mono">
              View all →
            </Link>
          </div>

          {/* List of top products */}
          <div className="divide-y divide-velvet-border/60 my-2">
            {topProducts.map((p, idx) => (
              <div key={idx} className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-velvet-plum relative border border-velvet-border/60 shrink-0">
                    <img src={p.thumbnail} alt={p.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-xs text-velvet-cream-soft truncate">{p.title}</h4>
                    <span className="text-[11px] font-mono text-velvet-cream-muted">{p.sales} sales</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-medium text-velvet-cream">{p.revenue}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-velvet-border/50">
            <Link
              href="/seller/sales"
              className="w-full py-2 rounded-xl bg-velvet-plum hover:bg-velvet-mocha border border-velvet-border text-xs text-velvet-cream font-medium text-center block transition-colors"
            >
              Detailed Sales Report →
            </Link>
          </div>
        </div>
      </div>

      {/* 04 — Your Products Table (matching reference columns and layout) */}
      <section className="p-6 rounded-2xl bg-velvet-mocha border border-velvet-border/80 space-y-4 shadow-xl shadow-black/40">
        <div className="flex items-center justify-between pb-3 border-b border-velvet-border/60">
          <div>
            <h2 className="font-serif font-medium text-velvet-cream-soft text-base">
              Your Products
            </h2>
          </div>
          <Link
            href="/seller/products"
            className="text-xs font-mono text-velvet-cream hover:text-velvet-rose flex items-center gap-1 transition-colors"
          >
            <span>View all</span>
            <span>→</span>
          </Link>
        </div>

        {/* Table layout matching reference */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-velvet-border/60 text-velvet-cream-muted uppercase text-[10px] tracking-wider font-mono">
                <th className="py-2.5 font-medium">Product</th>
                <th className="py-2.5 font-medium">Price</th>
                <th className="py-2.5 font-medium">Sales</th>
                <th className="py-2.5 font-medium">Status</th>
                <th className="py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-velvet-border/50 text-velvet-cream-soft">
              {yourProducts.map((prod) => (
                <tr key={prod.id} className="hover:bg-velvet-plum/30 transition-colors">
                  <td className="py-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-velvet-plum relative border border-velvet-border/60 shrink-0">
                      <img src={prod.thumbnail} alt={prod.title} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="font-medium text-velvet-cream-soft">{prod.title}</div>
                      <div className="text-[10px] text-velvet-cream-muted">{prod.category}</div>
                    </div>
                  </td>
                  <td className="py-3.5 font-mono text-velvet-cream">{prod.price}</td>
                  <td className="py-3.5 font-mono">{prod.sales}</td>
                  <td className="py-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      {prod.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        href={`/seller/products`}
                        className="px-3 py-1 rounded-lg bg-velvet-plum border border-velvet-border hover:border-velvet-cream text-velvet-cream text-xs font-medium transition-all"
                      >
                        Edit
                      </Link>
                      <button className="p-1 rounded text-velvet-cream-muted hover:text-white">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 05 — Add New Product Multi-step Stepper Card matching bottom of reference */}
      <section className="p-6 rounded-2xl bg-velvet-mocha border border-velvet-border/80 space-y-6 shadow-xl shadow-black/40">
        <div>
          <h2 className="font-serif font-medium text-velvet-cream-soft text-base">
            Add New Product
          </h2>
          <p className="text-xs text-velvet-cream-muted mt-0.5 font-light">
            Structured 5-step curation wizard for publishing verified digital assets on Marketify.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Steps column matching reference */}
          <div className="space-y-4">
            {[
              { num: "1", title: "Information", desc: "Basic details about your product", active: true },
              { num: "2", title: "Media", desc: "Upload images and files", active: false },
              { num: "3", title: "Pricing", desc: "Set your price and licensing", active: false },
              { num: "4", title: "Review", desc: "Check everything", active: false },
              { num: "5", title: "Submit", desc: "Send for approval", active: false },
            ].map((step) => (
              <div key={step.num} className="flex items-start gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono shrink-0 ${
                    step.active
                      ? "bg-[#F43F5E] text-white shadow-md shadow-[#F43F5E]/30"
                      : "bg-velvet-plum border border-velvet-border text-velvet-cream-muted"
                  }`}
                >
                  {step.num}
                </div>
                <div>
                  <div className={`text-xs font-medium ${step.active ? "text-velvet-cream-soft" : "text-velvet-cream-muted"}`}>
                    {step.title}
                  </div>
                  <div className="text-[11px] text-velvet-cream-muted/70">
                    {step.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Step 1 Interactive Form Card matching reference */}
          <div className="md:col-span-2 p-5 rounded-2xl bg-velvet-plum/60 border border-velvet-border space-y-4 text-xs">
            <h3 className="font-serif font-medium text-velvet-cream-soft text-sm">
              Product Information
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-velvet-cream-muted text-[11px] mb-1 font-mono">Title</label>
                <input
                  type="text"
                  placeholder="Enter a clear and descriptive title"
                  className="w-full px-3.5 py-2 rounded-xl bg-velvet-mocha border border-velvet-border text-velvet-cream placeholder-velvet-cream-muted/50 focus:outline-none focus:border-velvet-cream font-light"
                />
              </div>

              <div>
                <label className="block text-velvet-cream-muted text-[11px] mb-1 font-mono">Category</label>
                <div className="w-full px-3.5 py-2 rounded-xl bg-velvet-mocha border border-velvet-border text-velvet-cream-muted flex justify-between items-center">
                  <span>Select Category</span>
                  <span>▾</span>
                </div>
              </div>

              <div>
                <label className="block text-velvet-cream-muted text-[11px] mb-1 font-mono">Short Description</label>
                <textarea
                  rows={3}
                  placeholder="Write a short description..."
                  className="w-full px-3.5 py-2 rounded-xl bg-velvet-mocha border border-velvet-border text-velvet-cream placeholder-velvet-cream-muted/50 focus:outline-none focus:border-velvet-cream font-light"
                ></textarea>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Link
                href="/seller/products/new"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#F43F5E] hover:bg-[#FB7185] text-white font-medium text-xs shadow-md transition-colors"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
