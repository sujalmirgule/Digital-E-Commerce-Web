"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSellerAuth } from "./SellerAuthContext";
import { SellerOverviewDTO } from "@/lib/services/seller-dashboard";

export default function SellerOverviewPage() {
  const { token, isApproved, fetchWithAuth } = useSellerAuth();
  const [data, setData] = useState<SellerOverviewDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-800 rounded w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse"></div>
          ))}
        </div>
        <div className="h-64 bg-slate-900 border border-slate-800 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-red-950/30 border border-red-800/50 text-red-200">
        <h2 className="text-lg font-bold text-red-100 flex items-center gap-2">
          <span>⚠️</span> Error Loading Analytics
        </h2>
        <p className="text-sm text-red-300 mt-1">{error}</p>
        <button
          onClick={loadOverview}
          className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs font-semibold"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!isApproved) {
    return (
      <div className="py-16 text-center">
        <div className="text-4xl mb-3">🏪</div>
        <h2 className="text-xl font-bold text-white mb-2">Seller Account Approval Required</h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
          Access to this seller dashboard is granted only to verified, approved marketplace creators.
        </p>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Seller Analytics & Studio</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Store: <strong className="text-emerald-400">{data?.sellerProfile.storeName}</strong> ·{" "}
            Manage digital product catalog, earnings, commissions, and customer orders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/seller/products/new"
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>➕</span> Create New Product
          </Link>
        </div>
      </div>

      {/* Primary KPI Financial Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Gross Revenue</span>
            <span className="text-base">💳</span>
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">
            ₹{((stats?.grossRevenuePaise ?? 0) / 100).toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total sales volume before fees
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Net Earnings</span>
            <span className="text-base">💰</span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-2">
            ₹{((stats?.netEarningsPaise ?? 0) / 100).toFixed(2)}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-1">
            After 10% marketplace commission
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Available Balance</span>
            <span className="text-base">🏦</span>
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">
            ₹{((stats?.availableBalancePaise ?? 0) / 100).toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Cleared & ready for transfer
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Pending Clearance</span>
            <span className="text-base">⏳</span>
          </div>
          <div className="text-2xl font-extrabold text-amber-400 mt-2">
            ₹{((stats?.pendingBalancePaise ?? 0) / 100).toFixed(2)}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-1">
            Settlement in progress
          </div>
        </div>
      </div>

      {/* Secondary Product & Review Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Total Products</div>
          <div className="text-xl font-bold text-white mt-1">{stats?.totalProducts ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {stats?.publishedProducts ?? 0} Published · {stats?.draftProducts ?? 0} Draft
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">In Moderation</div>
          <div className="text-xl font-bold text-amber-400 mt-1">{stats?.pendingModeration ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Awaiting admin approval
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Total Orders Sold</div>
          <div className="text-xl font-bold text-white mt-1">{stats?.totalSales ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Units fulfilled
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Customer Rating</div>
          <div className="text-xl font-bold text-amber-400 mt-1 flex items-center gap-1">
            <span>★</span> {stats?.averageRating ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Across {stats?.totalReviews ?? 0} reviews
          </div>
        </div>
      </div>

      {/* Recent Sales Orders Table */}
      <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="font-bold text-white text-base flex items-center gap-2">
              <span>💰</span> Recent Sales Activity
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live orders placed by buyers for your digital assets.
            </p>
          </div>
          <Link href="/seller/sales" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold">
            View All Sales →
          </Link>
        </div>

        {(!data?.recentSales || data.recentSales.length === 0) ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No sales recorded yet. Publish high-quality products to start generating revenue.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {data.recentSales.map((sale) => (
              <div key={sale.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="space-y-0.5">
                  <div className="font-semibold text-white">{sale.productTitle}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Order: {sale.orderId} · {sale.licenseType} LICENSE
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {new Date(sale.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="text-right space-y-0.5">
                  <div className="font-bold text-emerald-400">
                    +₹{(sale.sellerEarningsPaise / 100).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Gross: ₹{(sale.pricePaise / 100).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
