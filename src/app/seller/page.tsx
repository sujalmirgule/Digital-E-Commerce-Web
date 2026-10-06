"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSellerAuth } from "./SellerAuthContext";
import { SellerOverviewDTO, SellerProductListItemDTO } from "@/lib/services/seller-dashboard";
import {
  TrendingUp,
  Package,
  ShoppingBag,
  Clock,
  ArrowRight,
  ChevronDown,
  MoreHorizontal,
  Plus,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  Receipt,
  Star,
  CheckCircle2,
  Layers,
} from "lucide-react";

export default function SellerOverviewPage() {
  const { user, profile, token, isApproved, fetchWithAuth } = useSellerAuth();
  const [data, setData] = useState<SellerOverviewDTO | null>(null);
  const [recentProducts, setRecentProducts] = useState<SellerProductListItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch overview data
      const [overviewRes, productsRes] = await Promise.all([
        fetchWithAuth("/api/v1/seller/dashboard/overview"),
        fetchWithAuth("/api/v1/seller/products?limit=5"),
      ]);

      const overviewJson = await overviewRes.json();
      const productsJson = await productsRes.json();

      if (overviewRes.ok && overviewJson.data) {
        setData(overviewJson.data);
      } else if (!isApproved) {
        // Unapproved status handled in render
      } else {
        setError(overviewJson.error?.message || "Failed to load seller analytics");
      }

      if (productsRes.ok && productsJson.data?.products) {
        setRecentProducts(productsJson.data.products);
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

  const formatRupee = (paise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(paise / 100);
  };

  // If seller status is PENDING or REJECTED, render appropriate compliance state
  if (user?.sellerStatus === "PENDING") {
    return (
      <div className="py-12 max-w-2xl mx-auto space-y-6">
        <div className="p-8 rounded-3xl bg-velvet-mocha border border-velvet-border shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <Clock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-velvet-cream-soft">
            Seller Application Under Review
          </h1>
          <p className="text-xs sm:text-sm text-velvet-cream-muted max-w-md mx-auto leading-relaxed">
            Your store profile for <span className="text-velvet-cream font-medium">{profile?.storeName || "your studio"}</span> is currently undergoing compliance verification. You will gain full marketplace access once an administrator approves your creator profile.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs">
            <Link
              href="/seller/profile"
              className="px-5 py-2.5 rounded-full bg-velvet-plum border border-velvet-border text-velvet-cream hover:border-velvet-cream/40 transition-colors"
            >
              Inspect Application Details
            </Link>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-full bg-velvet-mocha border border-velvet-border/80 text-velvet-cream-muted hover:text-velvet-cream transition-colors"
            >
              Return to Buyer Hub
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (user?.sellerStatus === "REJECTED") {
    return (
      <div className="py-12 max-w-2xl mx-auto space-y-6">
        <div className="p-8 rounded-3xl bg-velvet-mocha border border-rose-900/40 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-rose-200">
            Seller Profile Not Approved
          </h1>
          <p className="text-xs sm:text-sm text-velvet-cream-muted max-w-md mx-auto leading-relaxed">
            Your seller application did not meet our compliance requirements. Please review marketplace standards or update your application records.
          </p>
          <div className="pt-4 flex items-center justify-center gap-3 text-xs">
            <Link
              href="/seller/profile"
              className="px-5 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-medium transition-colors"
            >
              View Application Records
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const stats = {
    grossRevenue: data?.stats ? formatRupee(data.stats.grossRevenuePaise) : "₹0",
    netEarnings: data?.stats ? formatRupee(data.stats.netEarningsPaise) : "₹0",
    platformFees: data?.stats ? formatRupee(data.stats.platformFeePaise) : "₹0",
    availableBalance: data?.stats ? formatRupee(data.stats.availableBalancePaise) : "₹0",
    pendingBalance: data?.stats ? formatRupee(data.stats.pendingBalancePaise) : "₹0",
    totalSales: data?.stats?.totalSales ?? 0,
    totalProducts: data?.stats?.totalProducts ?? 0,
    publishedProducts: data?.stats?.publishedProducts ?? 0,
    draftProducts: data?.stats?.draftProducts ?? 0,
    pendingModeration: data?.stats?.pendingModeration ?? 0,
    rejectedProducts: data?.stats?.rejectedProducts ?? 0,
    averageRating: data?.stats?.averageRating ?? 0,
    totalReviews: data?.stats?.totalReviews ?? 0,
  };

  const recentSales = data?.recentSales || [];

  return (
    <div className="space-y-8 md:space-y-10">
      {/* 01 — Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-normal text-velvet-cream-soft tracking-tight">
            Seller Studio
          </h1>
          <p className="text-velvet-cream-muted text-xs sm:text-sm mt-1 font-light">
            Creator dashboard for <span className="text-velvet-cream font-medium">{profile?.storeName || "Your Studio"}</span> · Verified creator workspace.
          </p>
        </div>

        {/* Action Button: + Add Product */}
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

      {error && (
        <div className="p-4 rounded-2xl bg-velvet-mocha border border-rose-900/50 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadOverview}
            className="px-3 py-1 rounded-lg bg-velvet-plum hover:bg-velvet-mocha text-velvet-cream border border-velvet-border text-[11px]"
          >
            Retry
          </button>
        </div>
      )}

      {/* 02 — Real Primary Financial Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Gross Revenue */}
        <div className="p-5 rounded-2xl bg-velvet-mocha border border-velvet-border/80 hover:border-velvet-cream/40 transition-all group shadow-lg shadow-black/30">
          <div className="text-2xl sm:text-3xl font-serif font-light text-velvet-cream-soft">
            {stats.grossRevenue}
          </div>
          <div className="text-xs uppercase tracking-wider text-velvet-cream-muted mt-1 font-mono font-medium">
            Gross Revenue
          </div>
          <div className="text-[11px] text-velvet-cream-muted/70 mt-2 font-mono">
            Platform Fees: {stats.platformFees}
          </div>
        </div>

        {/* Metric 2: Net Earnings */}
        <div className="p-5 rounded-2xl bg-velvet-mocha border border-velvet-border/80 hover:border-velvet-cream/40 transition-all group shadow-lg shadow-black/30">
          <div className="text-2xl sm:text-3xl font-serif font-light text-emerald-400">
            {stats.netEarnings}
          </div>
          <div className="text-xs uppercase tracking-wider text-velvet-cream-muted mt-1 font-mono font-medium">
            Net Creator Earnings
          </div>
          <div className="text-[11px] text-velvet-cream-muted/70 mt-2 font-mono">
            Avail: {stats.availableBalance}
          </div>
        </div>

        {/* Metric 3: Total Orders / Sales */}
        <div className="p-5 rounded-2xl bg-velvet-mocha border border-velvet-border/80 hover:border-velvet-cream/40 transition-all group shadow-lg shadow-black/30">
          <div className="text-2xl sm:text-3xl font-serif font-light text-velvet-cream-soft">
            {stats.totalSales}
          </div>
          <div className="text-xs uppercase tracking-wider text-velvet-cream-muted mt-1 font-mono font-medium">
            Total Sales Items
          </div>
          <div className="text-[11px] text-velvet-cream-muted/70 mt-2 font-mono">
            Rating: {stats.averageRating} ★ ({stats.totalReviews} reviews)
          </div>
        </div>

        {/* Metric 4: Inventory Overview */}
        <div className="p-5 rounded-2xl bg-velvet-mocha border border-velvet-border/80 hover:border-velvet-cream/40 transition-all group shadow-lg shadow-black/30">
          <div className="text-2xl sm:text-3xl font-serif font-light text-velvet-cream-soft">
            {stats.totalProducts}
          </div>
          <div className="text-xs uppercase tracking-wider text-velvet-cream-muted mt-1 font-mono font-medium">
            Total Products
          </div>
          <div className="text-[11px] text-velvet-cream-muted/70 mt-2 font-mono">
            {stats.publishedProducts} pub · {stats.pendingModeration} review · {stats.draftProducts} draft
          </div>
        </div>
      </div>

      {/* 03 — Product Lifecycle Breakdown & Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/seller/products?status=PUBLISHED"
          className="p-3.5 rounded-xl bg-velvet-plum/60 border border-velvet-border hover:border-emerald-500/40 transition-colors flex items-center justify-between"
        >
          <div>
            <span className="text-[10px] uppercase font-mono text-velvet-cream-muted block">Published</span>
            <span className="text-base font-serif text-emerald-400">{stats.publishedProducts}</span>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-400/60" />
        </Link>
        <Link
          href="/seller/products?status=PENDING_REVIEW"
          className="p-3.5 rounded-xl bg-velvet-plum/60 border border-velvet-border hover:border-amber-500/40 transition-colors flex items-center justify-between"
        >
          <div>
            <span className="text-[10px] uppercase font-mono text-velvet-cream-muted block">In Review</span>
            <span className="text-base font-serif text-amber-400">{stats.pendingModeration}</span>
          </div>
          <Clock className="w-4 h-4 text-amber-400/60" />
        </Link>
        <Link
          href="/seller/products?status=DRAFT"
          className="p-3.5 rounded-xl bg-velvet-plum/60 border border-velvet-border hover:border-velvet-cream/40 transition-colors flex items-center justify-between"
        >
          <div>
            <span className="text-[10px] uppercase font-mono text-velvet-cream-muted block">Drafts</span>
            <span className="text-base font-serif text-velvet-cream-soft">{stats.draftProducts}</span>
          </div>
          <Package className="w-4 h-4 text-velvet-cream-muted/60" />
        </Link>
        <Link
          href="/seller/products?status=REJECTED"
          className="p-3.5 rounded-xl bg-velvet-plum/60 border border-velvet-border hover:border-rose-500/40 transition-colors flex items-center justify-between"
        >
          <div>
            <span className="text-[10px] uppercase font-mono text-velvet-cream-muted block">Rejected</span>
            <span className="text-base font-serif text-rose-400">{stats.rejectedProducts}</span>
          </div>
          <AlertCircle className="w-4 h-4 text-rose-400/60" />
        </Link>
      </div>

      {/* 04 — Recent Sales & Products Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (7 Cols): Recent Verified Sales */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-velvet-mocha border border-velvet-border/80 flex flex-col justify-between shadow-xl shadow-black/40">
          <div className="flex items-center justify-between pb-4 border-b border-velvet-border/60">
            <div>
              <h2 className="font-serif font-medium text-velvet-cream-soft text-base">
                Recent Sales Orders
              </h2>
              <p className="text-[11px] text-velvet-cream-muted">Real-time ledger updates from buyer checkouts</p>
            </div>
            <Link
              href="/seller/sales"
              className="text-xs text-velvet-rose hover:text-velvet-rose-soft font-mono"
            >
              All Sales →
            </Link>
          </div>

          <div className="py-2 flex-1">
            {recentSales.length === 0 ? (
              <div className="py-12 text-center text-velvet-cream-muted space-y-2">
                <ShoppingBag className="w-10 h-10 text-velvet-cream-muted/40 mx-auto" />
                <p className="text-xs">No sales recorded yet</p>
                <p className="text-[11px] text-velvet-cream-muted/70">
                  Transactions will appear here as soon as buyers purchase your products.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-velvet-border/60">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-medium text-velvet-cream-soft truncate">{sale.productTitle}</p>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-velvet-cream-muted mt-0.5">
                        <span>Order #{sale.orderId.substring(0, 8)}</span>
                        <span>·</span>
                        <span>{new Date(sale.createdAt).toLocaleDateString()}</span>
                        <span>·</span>
                        <span className="uppercase text-emerald-400">{sale.orderStatus}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-medium text-velvet-cream">
                        {formatRupee(sale.sellerEarningsPaise)}
                      </div>
                      <div className="text-[10px] font-mono text-velvet-cream-muted">
                        Gross: {formatRupee(sale.pricePaise)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-velvet-border/50 flex items-center justify-between text-xs">
            <Link
              href="/seller/earnings"
              className="text-velvet-cream-muted hover:text-velvet-cream text-xs flex items-center gap-1 font-mono transition-colors"
            >
              <span>Inspect Full Earnings Ledger</span>
              <span>→</span>
            </Link>
            <span className="text-[10px] font-mono text-emerald-400">Double-entry verified</span>
          </div>
        </div>

        {/* Right Column (5 Cols): Live Inventory Quick View */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-velvet-mocha border border-velvet-border/80 flex flex-col justify-between shadow-xl shadow-black/40">
          <div className="flex items-center justify-between pb-4 border-b border-velvet-border/60">
            <h2 className="font-serif font-medium text-velvet-cream-soft text-base">
              Active Inventory
            </h2>
            <Link href="/seller/products" className="text-xs text-velvet-rose hover:text-velvet-rose-soft font-mono">
              View all ({stats.totalProducts}) →
            </Link>
          </div>

          <div className="py-2 flex-1">
            {recentProducts.length === 0 ? (
              <div className="py-12 text-center text-velvet-cream-muted space-y-2">
                <Package className="w-10 h-10 text-velvet-cream-muted/40 mx-auto" />
                <p className="text-xs">No products created yet</p>
                <Link
                  href="/seller/products/new"
                  className="inline-block px-4 py-1.5 rounded-full bg-velvet-rose text-white text-xs font-medium mt-2"
                >
                  Create Your First Product
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-velvet-border/60">
                {recentProducts.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/seller/products/${p.id}`}
                        className="font-medium text-xs text-velvet-cream-soft hover:text-velvet-rose transition-colors truncate block"
                      >
                        {p.title}
                      </Link>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-velvet-cream-muted mt-0.5">
                        <span>{p.salesCount} sales</span>
                        <span>·</span>
                        <span>{p.filesCount} file(s)</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <div className="text-xs font-mono font-medium text-velvet-cream">
                        {formatRupee(p.pricePaise)}
                      </div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-mono font-medium ${
                          p.status === "PUBLISHED"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : p.status === "PENDING_REVIEW"
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                            : p.status === "REJECTED"
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                            : "bg-velvet-plum text-velvet-cream-muted border border-velvet-border"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-velvet-border/50">
            <Link
              href="/seller/products/new"
              className="w-full py-2 rounded-xl bg-velvet-plum hover:bg-velvet-mocha border border-velvet-border text-xs text-velvet-cream font-medium text-center block transition-colors"
            >
              + Create New Product
            </Link>
          </div>
        </div>
      </div>

      {/* 05 — Full Products Inventory Table */}
      <section className="p-6 rounded-2xl bg-velvet-mocha border border-velvet-border/80 space-y-4 shadow-xl shadow-black/40">
        <div className="flex items-center justify-between pb-3 border-b border-velvet-border/60">
          <div>
            <h2 className="font-serif font-medium text-velvet-cream-soft text-base">
              Recent Inventory Overview
            </h2>
            <p className="text-[11px] text-velvet-cream-muted">
              Live status, sales counts, and fast management links for your assets
            </p>
          </div>
          <Link
            href="/seller/products"
            className="text-xs font-mono text-velvet-cream hover:text-velvet-rose flex items-center gap-1 transition-colors"
          >
            <span>Manage All ({stats.totalProducts})</span>
            <span>→</span>
          </Link>
        </div>

        {recentProducts.length === 0 ? (
          <div className="py-10 text-center text-xs text-velvet-cream-muted">
            No products found in your catalog. Click &quot;Add Product&quot; to create your first listing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-velvet-border/60 text-velvet-cream-muted uppercase text-[10px] tracking-wider font-mono">
                  <th className="py-2.5 font-medium">Product</th>
                  <th className="py-2.5 font-medium">Price</th>
                  <th className="py-2.5 font-medium">Sales</th>
                  <th className="py-2.5 font-medium">Deliverables</th>
                  <th className="py-2.5 font-medium">Status</th>
                  <th className="py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-velvet-border/50 text-velvet-cream-soft">
                {recentProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-velvet-plum/30 transition-colors">
                    <td className="py-3.5 flex items-center gap-3">
                      <div>
                        <div className="font-medium text-velvet-cream-soft">{prod.title}</div>
                        <div className="text-[10px] font-mono text-velvet-cream-muted">v{prod.version} · /{prod.slug}</div>
                      </div>
                    </td>
                    <td className="py-3.5 font-mono text-velvet-cream">{formatRupee(prod.pricePaise)}</td>
                    <td className="py-3.5 font-mono">{prod.salesCount}</td>
                    <td className="py-3.5 font-mono">{prod.filesCount} file(s)</td>
                    <td className="py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                          prod.status === "PUBLISHED"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : prod.status === "PENDING_REVIEW"
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                            : prod.status === "REJECTED"
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                            : "bg-velvet-plum text-velvet-cream-muted border border-velvet-border"
                        }`}
                      >
                        {prod.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/seller/products/${prod.id}`}
                          className="px-3 py-1 rounded-lg bg-velvet-plum border border-velvet-border hover:border-velvet-cream text-velvet-cream text-xs font-medium transition-all"
                        >
                          Manage
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
