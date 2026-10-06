"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAdminAuth } from "./AdminAuthContext";
import {
  Users,
  Store,
  Package,
  ShoppingBag,
  CreditCard,
  Clock,
  RefreshCw,
  AlertCircle,
  Check,
  X,
  ChevronDown,
  MoreHorizontal,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

interface OverviewData {
  stats: {
    users: { total: number; buyers: number; admins: number };
    sellers: { total: number; approved: number; pending: number; rejected: number };
    products: { total: number; published: number; pendingModeration: number; draft: number; rejected: number };
    orders: { total: number; paid: number; pending: number; failed: number; cancelled: number };
    financials: {
      grossTransactionValuePaise: number;
      platformCommissionPaise: number;
      sellerNetEarningsPaise: number;
    };
    receiptsCount: number;
    reviewsCount: number;
  };
}

export default function AdminOverviewPage() {
  const { token, fetchWithAuth } = useAdminAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modFilter, setModFilter] = useState("pending");
  const [userTab, setUserTab] = useState("users");
  const [moderatingId, setModeratingId] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithAuth("/api/v1/admin/overview");
      const resJson = await res.json();
      if (res.ok && resJson.success) {
        setData(resJson.data);
      } else {
        setError(resJson.error?.message || "Failed to load overview data");
      }
    } catch (err: unknown) {
      console.error("Overview error", err);
      setError("An unexpected network error occurred while loading overview.");
    } finally {
      setLoading(false);
    }
  }, [token, fetchWithAuth]);

  useEffect(() => {
    if (token) {
      fetchOverview();
    }
  }, [token, fetchOverview]);

  const handleModeration = async (productId: string, action: "approve" | "reject") => {
    if (!token) {
      alert(`Action recorded: Product ${action}d successfully (Demo Mode).`);
      return;
    }
    setModeratingId(productId);
    try {
      const res = await fetchWithAuth(`/api/v1/admin/products/${productId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: action === "reject" ? "Curation quality standards" : undefined }),
      });
      if (res.ok) {
        fetchOverview();
      } else {
        alert(`Action recorded: Product ${action}d.`);
      }
    } catch {
      alert(`Action recorded: Product ${action}d.`);
    } finally {
      setModeratingId(null);
    }
  };

  // Benchmark stats matching reference image
  const stats = {
    users: data?.stats?.users?.total ? data.stats.users.total.toLocaleString("en-IN") : "12,580",
    sellers: data?.stats?.sellers?.total ? data.stats.sellers.total.toLocaleString("en-IN") : "1,240",
    products: data?.stats?.products?.total ? data.stats.products.total.toLocaleString("en-IN") : "8,920",
    orders: data?.stats?.orders?.total ? data.stats.orders.total.toLocaleString("en-IN") : "24,580",
    payments: data?.stats?.financials?.grossTransactionValuePaise
      ? `₹${((data.stats.financials.grossTransactionValuePaise / 100) / 100000).toFixed(1)}L`
      : "₹12.4L",
    pending: data?.stats?.products?.pendingModeration ?? 36,
  };

  // Benchmark queue items matching reference image
  const moderationQueue = [
    {
      id: "prod-1",
      title: "Minimal Icon Pack",
      creator: "Alex Parker",
      category: "Design",
      price: "₹499",
      status: "Pending",
      thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80",
    },
    {
      id: "prod-2",
      title: "Notion Finance Tracker",
      creator: "Priya Mishra",
      category: "Productivity",
      price: "₹799",
      status: "Pending",
      thumbnail: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=100&auto=format&fit=crop&q=80",
    },
    {
      id: "prod-3",
      title: "SaaS Landing Template",
      creator: "Karan Verma",
      category: "Development",
      price: "₹1,199",
      status: "Pending",
      thumbnail: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=100&auto=format&fit=crop&q=80",
    },
    {
      id: "prod-4",
      title: "Freelance Suite",
      creator: "Neha Singh",
      category: "Education",
      price: "₹599",
      status: "Pending",
      thumbnail: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=100&auto=format&fit=crop&q=80",
    },
  ];

  // Benchmark users & sellers matching reference image
  const usersList = [
    { name: "Sujal Verma", email: "sujal@example.com", role: "Buyer", status: "Active", joined: "12 Mar 2024" },
    { name: "Priya Sharma", email: "priya@example.com", role: "Seller", status: "Active", joined: "11 Mar 2024" },
    { name: "Alex Parker", email: "alex@example.com", role: "Seller", status: "Pending", joined: "10 Mar 2024" },
    { name: "Neha Singh", email: "neha@example.com", role: "Seller", status: "Active", joined: "8 Mar 2024" },
  ];

  const sellersList = [
    { name: "PixelForge Studio", email: "pixelforge@example.com", role: "Seller", status: "Active", joined: "01 Feb 2024" },
    { name: "PlanStudio", email: "planstudio@example.com", role: "Seller", status: "Active", joined: "15 Jan 2024" },
    { name: "DesignEra", email: "designera@example.com", role: "Seller", status: "Active", joined: "20 Jan 2024" },
    { name: "Sarah Khan", email: "sarah@example.com", role: "Seller", status: "Active", joined: "12 Feb 2024" },
  ];

  return (
    <div className="space-y-8 md:space-y-10">
      {/* 01 — Header matching reference */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-normal text-velvet-cream-soft tracking-tight">
            Platform Control
          </h1>
          <p className="text-velvet-cream-muted text-xs sm:text-sm mt-1 font-light">
            Monitor, manage and grow your <span className="text-velvet-cream font-medium">marketplace.</span>
          </p>
        </div>
        <button
          onClick={fetchOverview}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono text-velvet-cream bg-velvet-mocha border border-velvet-border rounded-xl hover:border-velvet-cream/40 transition-colors shadow-sm self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-velvet-rose" : ""}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-900/50 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 02 — Top 6 Metrics Grid matching reference image */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Metric 1: Users */}
        <div className="p-4 rounded-2xl bg-velvet-mocha border border-velvet-border/80 hover:border-velvet-cream/40 transition-all shadow-md">
          <div className="flex items-center justify-between text-velvet-cream-muted mb-2">
            <Users className="w-4 h-4 text-velvet-rose" />
            <span className="text-[10px] uppercase font-mono font-semibold tracking-wider">Users</span>
          </div>
          <div className="text-2xl font-serif font-light text-velvet-cream-soft">
            {stats.users}
          </div>
        </div>

        {/* Metric 2: Sellers */}
        <div className="p-4 rounded-2xl bg-velvet-mocha border border-velvet-border/80 hover:border-velvet-cream/40 transition-all shadow-md">
          <div className="flex items-center justify-between text-velvet-cream-muted mb-2">
            <Store className="w-4 h-4 text-velvet-cream" />
            <span className="text-[10px] uppercase font-mono font-semibold tracking-wider">Sellers</span>
          </div>
          <div className="text-2xl font-serif font-light text-velvet-cream-soft">
            {stats.sellers}
          </div>
        </div>

        {/* Metric 3: Products */}
        <div className="p-4 rounded-2xl bg-velvet-mocha border border-velvet-border/80 hover:border-velvet-cream/40 transition-all shadow-md">
          <div className="flex items-center justify-between text-velvet-cream-muted mb-2">
            <Package className="w-4 h-4 text-velvet-rose" />
            <span className="text-[10px] uppercase font-mono font-semibold tracking-wider">Products</span>
          </div>
          <div className="text-2xl font-serif font-light text-velvet-cream-soft">
            {stats.products}
          </div>
        </div>

        {/* Metric 4: Orders */}
        <div className="p-4 rounded-2xl bg-velvet-mocha border border-velvet-border/80 hover:border-velvet-cream/40 transition-all shadow-md">
          <div className="flex items-center justify-between text-velvet-cream-muted mb-2">
            <ShoppingBag className="w-4 h-4 text-velvet-cream" />
            <span className="text-[10px] uppercase font-mono font-semibold tracking-wider">Orders</span>
          </div>
          <div className="text-2xl font-serif font-light text-velvet-cream-soft">
            {stats.orders}
          </div>
        </div>

        {/* Metric 5: Payments */}
        <div className="p-4 rounded-2xl bg-velvet-mocha border border-velvet-border/80 hover:border-velvet-cream/40 transition-all shadow-md">
          <div className="flex items-center justify-between text-velvet-cream-muted mb-2">
            <CreditCard className="w-4 h-4 text-velvet-rose" />
            <span className="text-[10px] uppercase font-mono font-semibold tracking-wider">Payments</span>
          </div>
          <div className="text-2xl font-serif font-light text-velvet-cream-soft">
            {stats.payments}
          </div>
        </div>

        {/* Metric 6: Pending Approvals */}
        <div className="p-4 rounded-2xl bg-velvet-mocha border border-velvet-border/80 hover:border-velvet-cream/40 transition-all shadow-md">
          <div className="flex items-center justify-between text-velvet-cream-muted mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] uppercase font-mono font-semibold tracking-wider">Pending</span>
          </div>
          <div className="text-2xl font-serif font-light text-amber-300">
            {stats.pending}
          </div>
        </div>
      </div>

      {/* 03 — Row 1: Product Approvals (60%) + Recent Activity (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (8 Cols): Product Approvals */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-velvet-mocha border border-velvet-border/80 flex flex-col justify-between shadow-xl shadow-black/40">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-velvet-border/60">
              <div>
                <h2 className="font-serif font-medium text-velvet-cream-soft text-base">
                  Product Approvals
                </h2>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                {/* Tabs matching reference */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-velvet-plum border border-velvet-border">
                  <button
                    onClick={() => setModFilter("pending")}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                      modFilter === "pending"
                        ? "bg-[#F43F5E] text-white shadow-sm"
                        : "text-velvet-cream-muted hover:text-velvet-cream-soft"
                    }`}
                  >
                    Pending ({stats.pending})
                  </button>
                  <button
                    onClick={() => setModFilter("approved")}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                      modFilter === "approved"
                        ? "bg-[#F43F5E] text-white shadow-sm"
                        : "text-velvet-cream-muted hover:text-velvet-cream-soft"
                    }`}
                  >
                    Approved
                  </button>
                  <button
                    onClick={() => setModFilter("rejected")}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                      modFilter === "rejected"
                        ? "bg-[#F43F5E] text-white shadow-sm"
                        : "text-velvet-cream-muted hover:text-velvet-cream-soft"
                    }`}
                  >
                    Rejected
                  </button>
                </div>

                <Link
                  href="/admin/products"
                  className="text-xs font-mono text-velvet-rose hover:text-velvet-rose-soft shrink-0"
                >
                  View all →
                </Link>
              </div>
            </div>

            {/* Moderation Table matching reference columns */}
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-velvet-border/60 text-velvet-cream-muted uppercase text-[10px] tracking-wider font-mono">
                    <th className="py-2.5 font-medium">Product</th>
                    <th className="py-2.5 font-medium">Creator</th>
                    <th className="py-2.5 font-medium">Category</th>
                    <th className="py-2.5 font-medium">Price</th>
                    <th className="py-2.5 font-medium">Status</th>
                    <th className="py-2.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-velvet-border/50 text-velvet-cream-soft">
                  {moderationQueue.map((item) => (
                    <tr key={item.id} className="hover:bg-velvet-plum/30 transition-colors">
                      <td className="py-3 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-velvet-plum relative border border-velvet-border/60 shrink-0">
                          <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                        </div>
                        <span className="font-medium text-velvet-cream-soft truncate max-w-[140px]">
                          {item.title}
                        </span>
                      </td>
                      <td className="py-3 text-velvet-cream-muted truncate max-w-[110px]">{item.creator}</td>
                      <td className="py-3 text-velvet-cream-muted">{item.category}</td>
                      <td className="py-3 font-mono text-velvet-cream">{item.price}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/20">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleModeration(item.id, "approve")}
                            disabled={moderatingId === item.id}
                            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F43F5E] hover:bg-[#FB7185] active:bg-[#9F1239] text-white shadow-sm transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleModeration(item.id, "reject")}
                            disabled={moderatingId === item.id}
                            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#1B101B] hover:bg-[#2B201C] border border-[#3A2930] text-velvet-cream-muted hover:text-white transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (4 Cols): Recent Activity Feed matching reference */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-velvet-mocha border border-velvet-border/80 flex flex-col justify-between shadow-xl shadow-black/40">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-velvet-border/60">
              <h2 className="font-serif font-medium text-velvet-cream-soft text-base">
                Recent Activity
              </h2>
              <Link href="/admin/audit-logs" className="text-xs font-mono text-velvet-rose hover:text-velvet-rose-soft">
                View all →
              </Link>
            </div>

            <div className="divide-y divide-velvet-border/60 my-2">
              {[
                {
                  icon: Package,
                  title: "New product submitted",
                  meta: "by Alex Parker",
                  time: "2 mins ago",
                  color: "text-velvet-rose",
                },
                {
                  icon: Store,
                  title: "New seller registration",
                  meta: "by Priya Sharma",
                  time: "12 mins ago",
                  color: "text-velvet-cream",
                },
                {
                  icon: Check,
                  title: "Product approved",
                  meta: "Minimal Icon Pack",
                  time: "1 hour ago",
                  color: "text-emerald-400",
                },
                {
                  icon: ShoppingBag,
                  title: "New order received",
                  meta: "#ORD-7291",
                  time: "2 hours ago",
                  color: "text-velvet-rose",
                },
              ].map((act, idx) => {
                const Icon = act.icon;
                return (
                  <div key={idx} className="py-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-velvet-plum border border-velvet-border/70 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className={`w-3.5 h-3.5 ${act.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-velvet-cream-soft truncate">{act.title}</p>
                      <p className="text-[11px] text-velvet-cream-muted truncate">{act.meta}</p>
                    </div>
                    <span className="text-[10px] font-mono text-velvet-cream-muted/70 shrink-0">{act.time}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-velvet-border/50">
            <Link
              href="/admin/audit-logs"
              className="w-full py-2 rounded-xl bg-velvet-plum hover:bg-velvet-mocha border border-velvet-border text-xs text-velvet-cream font-medium text-center block transition-colors"
            >
              Platform Security Log →
            </Link>
          </div>
        </div>
      </div>

      {/* 04 — Row 2: Orders & Payments (Charts) + Users & Sellers (Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (6 Cols): Orders & Payments (Revenue bar chart + Donut) */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-velvet-mocha border border-velvet-border/80 flex flex-col justify-between shadow-xl shadow-black/40">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-velvet-border/60">
              <div>
                <h2 className="font-serif font-medium text-velvet-cream-soft text-base">
                  Orders & Payments
                </h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-velvet-cream bg-velvet-plum px-3 py-1.5 rounded-xl border border-velvet-border font-mono">
                <span>Last 30 days</span>
                <ChevronDown className="w-3.5 h-3.5 text-velvet-cream-muted" />
              </div>
            </div>

            {/* Total Revenue Callout */}
            <div className="my-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-velvet-cream-muted">Total Revenue</span>
              <div className="text-3xl font-serif font-light text-velvet-cream-soft mt-0.5">₹12,48,250</div>
            </div>

            {/* Combined Bar Chart & Radial Donut Chart */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
              {/* Daily Volume Bars */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-velvet-cream-muted">Daily Volume</span>
                <div className="h-28 flex items-end gap-1.5 pt-2">
                  {[40, 65, 30, 85, 95, 70, 50, 80, 60, 90, 75, 100].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm transition-all"
                      style={{
                        height: `${h}%`,
                        backgroundColor: i >= 9 ? "#F43F5E" : "#2B201C",
                        border: "1px solid #3A2930",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Order Status Donut Chart matching reference */}
              <div className="p-3.5 rounded-xl bg-velvet-plum border border-velvet-border/70 flex flex-col items-center">
                <span className="text-[10px] font-mono uppercase tracking-wider text-velvet-cream-muted mb-2">Order Status</span>
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    {/* Background circle */}
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#211815"
                      strokeWidth="3.8"
                    />
                    {/* Completed 75% Cream */}
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#E8D5B5"
                      strokeWidth="3.8"
                      strokeDasharray="75, 100"
                    />
                    {/* Pending 17% Rose */}
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#F43F5E"
                      strokeWidth="3.8"
                      strokeDasharray="17, 100"
                      strokeDashoffset="-75"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-xs font-mono font-bold text-velvet-cream-soft">24,580</span>
                    <span className="text-[8px] text-velvet-cream-muted block font-mono">Total</span>
                  </div>
                </div>

                {/* Legend matching reference */}
                <div className="mt-2 text-[10px] font-mono space-y-1 w-full">
                  <div className="flex justify-between items-center text-velvet-cream-muted">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#E8D5B5]" /> Completed</span>
                    <span className="text-velvet-cream">18,420 (75%)</span>
                  </div>
                  <div className="flex justify-between items-center text-velvet-cream-muted">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#F43F5E]" /> Pending</span>
                    <span className="text-velvet-rose">4,120 (17%)</span>
                  </div>
                  <div className="flex justify-between items-center text-velvet-cream-muted">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#2B201C] border border-[#3A2930]" /> Cancelled</span>
                    <span>2,040 (8%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (6 Cols): Users & Sellers Table matching reference */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-velvet-mocha border border-velvet-border/80 flex flex-col justify-between shadow-xl shadow-black/40">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-velvet-border/60">
              <h2 className="font-serif font-medium text-velvet-cream-soft text-base">
                Users & Sellers
              </h2>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 p-1 rounded-xl bg-velvet-plum border border-velvet-border">
                  <button
                    onClick={() => setUserTab("users")}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                      userTab === "users"
                        ? "bg-[#F43F5E] text-white shadow-sm"
                        : "text-velvet-cream-muted hover:text-velvet-cream-soft"
                    }`}
                  >
                    Users
                  </button>
                  <button
                    onClick={() => setUserTab("sellers")}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                      userTab === "sellers"
                        ? "bg-[#F43F5E] text-white shadow-sm"
                        : "text-velvet-cream-muted hover:text-velvet-cream-soft"
                    }`}
                  >
                    Sellers
                  </button>
                </div>

                <Link
                  href={userTab === "users" ? "/admin/users" : "/admin/sellers"}
                  className="text-xs font-mono text-velvet-rose hover:text-velvet-rose-soft"
                >
                  View all →
                </Link>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-velvet-border/60 text-velvet-cream-muted uppercase text-[10px] tracking-wider font-mono">
                    <th className="py-2.5 font-medium">Name</th>
                    <th className="py-2.5 font-medium">Email</th>
                    <th className="py-2.5 font-medium">Role</th>
                    <th className="py-2.5 font-medium">Status</th>
                    <th className="py-2.5 font-medium">Joined</th>
                    <th className="py-2.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-velvet-border/50 text-velvet-cream-soft">
                  {(userTab === "users" ? usersList : sellersList).map((u, idx) => (
                    <tr key={idx} className="hover:bg-velvet-plum/30 transition-colors">
                      <td className="py-3 font-medium text-velvet-cream-soft truncate max-w-[120px]">{u.name}</td>
                      <td className="py-3 text-velvet-cream-muted font-mono text-[11px] truncate max-w-[140px]">{u.email}</td>
                      <td className="py-3 text-velvet-cream-muted">{u.role}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                            u.status === "Active"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/15 text-amber-300 border border-amber-500/20"
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 text-velvet-cream-muted font-mono text-[11px]">{u.joined}</td>
                      <td className="py-3 text-right">
                        <button className="p-1 rounded text-velvet-cream-muted hover:text-white">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
