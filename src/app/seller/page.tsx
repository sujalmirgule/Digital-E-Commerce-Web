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
  Plus,
  AlertCircle,
  Receipt,
  Star,
  CheckCircle2,
  DollarSign,
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

  // If seller status is PENDING or REJECTED
  if (user?.sellerStatus === "PENDING") {
    return (
      <div className="py-12 max-w-2xl mx-auto space-y-6">
        <div className="p-8 rounded-3xl bg-[#FFFFFF] border border-[#C8AA91] shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#F2E7DB] border border-[#C8AA91] flex items-center justify-center text-[#C46A4A] mx-auto">
            <Clock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-sans font-extrabold text-[#151311]">
            Creator Application Under Review
          </h1>
          <p className="text-sm text-[#684332] max-w-md mx-auto leading-relaxed">
            Your store profile for <strong className="text-[#3B261C]">{profile?.storeName || "your studio"}</strong> is currently undergoing verification. You will be able to publish digital goods once approved.
          </p>
          <div className="pt-4">
            <Link
              href="/seller/profile"
              className="px-6 py-2.5 rounded-xl bg-[#3B261C] text-[#FAF7F2] text-xs font-bold uppercase hover:bg-[#684332] transition-colors"
            >
              Inspect Application Details
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
    totalSales: data?.stats?.totalSales ?? 0,
    totalProducts: data?.stats?.totalProducts ?? 0,
    publishedProducts: data?.stats?.publishedProducts ?? 0,
    pendingModeration: data?.stats?.pendingModeration ?? 0,
    draftProducts: data?.stats?.draftProducts ?? 0,
    rejectedProducts: data?.stats?.rejectedProducts ?? 0,
    averageRating: data?.stats?.averageRating ?? 0,
    totalReviews: data?.stats?.totalReviews ?? 0,
  };

  const recentSales = data?.recentSales || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-sans font-extrabold text-[#151311] tracking-tight">
            Creator Studio Overview
          </h1>
          <p className="text-[#684332] text-xs sm:text-sm mt-1">
            Store workspace for <strong className="text-[#3B261C]">{profile?.storeName || "Your Studio"}</strong> · Verified creator telemetry.
          </p>
        </div>

        <Link
          href="/seller/products/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3B261C] hover:bg-[#684332] active:bg-[#211D1A] text-[#FAF7F2] text-xs font-extrabold uppercase tracking-wider shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-[#C46A4A]" />
          <span>New Product</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#A94432] text-[#A94432] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadOverview}
            className="px-3 py-1 rounded-lg bg-[#FAF7F2] border border-[#A94432] text-[11px] font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Primary 6 Metric Cards Required by Prompt */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Products */}
        <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#C8AA91]/60 shadow-[0_2px_8px_rgba(59,38,28,0.04)]">
          <div className="text-2xl sm:text-3xl font-sans font-extrabold text-[#151311]">
            {stats.totalProducts}
          </div>
          <div className="text-[11px] uppercase tracking-wider text-[#8A6048] mt-1 font-bold">
            Total Products
          </div>
        </div>

        {/* Published */}
        <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#C8AA91]/60 shadow-[0_2px_8px_rgba(59,38,28,0.04)]">
          <div className="text-2xl sm:text-3xl font-sans font-extrabold text-[#3B7A57]">
            {stats.publishedProducts}
          </div>
          <div className="text-[11px] uppercase tracking-wider text-[#8A6048] mt-1 font-bold">
            Published
          </div>
        </div>

        {/* Pending Review */}
        <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#C8AA91]/60 shadow-[0_2px_8px_rgba(59,38,28,0.04)]">
          <div className="text-2xl sm:text-3xl font-sans font-extrabold text-[#C46A4A]">
            {stats.pendingModeration}
          </div>
          <div className="text-[11px] uppercase tracking-wider text-[#8A6048] mt-1 font-bold">
            In Review
          </div>
        </div>

        {/* Total Sales */}
        <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#C8AA91]/60 shadow-[0_2px_8px_rgba(59,38,28,0.04)]">
          <div className="text-2xl sm:text-3xl font-sans font-extrabold text-[#151311]">
            {stats.totalSales}
          </div>
          <div className="text-[11px] uppercase tracking-wider text-[#8A6048] mt-1 font-bold">
            Total Sales
          </div>
        </div>

        {/* Gross Revenue */}
        <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#C8AA91]/60 shadow-[0_2px_8px_rgba(59,38,28,0.04)]">
          <div className="text-2xl sm:text-3xl font-sans font-extrabold text-[#151311]">
            {stats.grossRevenue}
          </div>
          <div className="text-[11px] uppercase tracking-wider text-[#8A6048] mt-1 font-bold">
            Gross Revenue
          </div>
        </div>

        {/* Net Earnings */}
        <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#C8AA91]/60 shadow-[0_2px_8px_rgba(59,38,28,0.04)]">
          <div className="text-2xl sm:text-3xl font-sans font-extrabold text-[#3B7A57]">
            {stats.netEarnings}
          </div>
          <div className="text-[11px] uppercase tracking-wider text-[#8A6048] mt-1 font-bold">
            Net Earnings (90%)
          </div>
        </div>
      </div>

      {/* Recent Sales & Inventory Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Recent Sales (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-[#FFFFFF] border border-[#C8AA91]/60 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-[#E6DBD1] mb-4">
            <div>
              <h2 className="font-sans font-bold text-base text-[#151311]">Recent Sales Orders</h2>
              <p className="text-xs text-[#8A6048]">Authoritative ledger records from customer checkouts</p>
            </div>
            <Link
              href="/seller/sales"
              className="text-xs font-bold text-[#A94432] hover:underline"
            >
              All Sales →
            </Link>
          </div>

          {recentSales.length === 0 ? (
            <div className="py-12 text-center text-[#8A6048] space-y-2">
              <ShoppingBag className="w-10 h-10 text-[#C8AA91] mx-auto" />
              <p className="text-xs font-bold text-[#151311]">No transactions recorded yet</p>
              <p className="text-xs">Sales will appear here when buyers purchase your products.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E6DBD1]">
              {recentSales.map((sale) => (
                <div key={sale.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-[#151311] truncate">{sale.productTitle}</p>
                    <div className="flex items-center gap-2 text-[11px] text-[#8A6048] mt-0.5">
                      <span>Order #{sale.orderId.substring(0, 8)}</span>
                      <span>·</span>
                      <span>{new Date(sale.createdAt).toLocaleDateString()}</span>
                      <span>·</span>
                      <span className="uppercase text-[#3B7A57] font-bold">{sale.orderStatus}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-[#151311]">
                      {formatRupee(sale.sellerEarningsPaise)}
                    </div>
                    <div className="text-[10px] text-[#8A6048]">
                      Gross: {formatRupee(sale.pricePaise)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Inventory (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-[#FFFFFF] border border-[#C8AA91]/60 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-[#E6DBD1] mb-4">
            <div>
              <h2 className="font-sans font-bold text-base text-[#151311]">Your Products</h2>
              <p className="text-xs text-[#8A6048]">Active inventory snapshot</p>
            </div>
            <Link
              href="/seller/products"
              className="text-xs font-bold text-[#A94432] hover:underline"
            >
              Manage All →
            </Link>
          </div>

          {recentProducts.length === 0 ? (
            <div className="py-12 text-center text-[#8A6048] space-y-2">
              <Package className="w-10 h-10 text-[#C8AA91] mx-auto" />
              <p className="text-xs font-bold text-[#151311]">No products created</p>
              <Link
                href="/seller/products/new"
                className="inline-block mt-2 text-xs font-bold text-[#A94432] hover:underline"
              >
                + Add your first product
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#E6DBD1]">
              {recentProducts.map((prod) => (
                <div key={prod.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <Link
                      href={`/seller/products/${prod.id}/edit`}
                      className="font-bold text-[#151311] hover:text-[#3B261C] hover:underline truncate block"
                    >
                      {prod.title}
                    </Link>
                    <div className="flex items-center gap-2 text-[11px] text-[#8A6048] mt-0.5">
                      <span className="font-bold text-[#3B261C]">
                        {formatRupee(prod.pricePaise)}
                      </span>
                      <span>·</span>
                      <span className={`font-bold ${
                        prod.status === "PUBLISHED"
                          ? "text-[#3B7A57]"
                          : prod.status === "PENDING_REVIEW"
                          ? "text-[#C46A4A]"
                          : "text-[#8A6048]"
                      }`}>
                        {prod.status}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/seller/products/${prod.id}/edit`}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#3B261C] bg-[#FAF7F2] border border-[#C8AA91]/60 hover:bg-[#F2E7DB]"
                  >
                    Edit
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
