"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useDashboardAuth } from "./DashboardAuthContext";
import { BuyerOverviewDTO } from "@/lib/services/buyer-dashboard";

export default function BuyerOverviewPage() {
  const { token, fetchWithAuth } = useDashboardAuth();
  const [data, setData] = useState<BuyerOverviewDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithAuth("/api/v1/buyer/dashboard/overview");
      const json = await res.json();

      if (res.ok && json.data) {
        setData(json.data);
      } else {
        setError(json.error?.message || "Failed to load dashboard overview");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [token, fetchWithAuth]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Loading State
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

  // Error State
  if (error) {
    return (
      <div className="p-6 rounded-xl bg-red-950/30 border border-red-800/50 text-red-200">
        <h2 className="text-lg font-bold text-red-100 flex items-center gap-2">
          <span>⚠️</span> Error Loading Overview
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

  // Not signed in state
  if (!token) {
    return (
      <div className="text-center py-16 px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-3xl mb-4">
          🔐
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Sign In to View Your Buyer Dashboard</h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
          Access your digital files, purchase history, order invoices, and personalized ratings in one place.
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
          <h1 className="text-2xl font-bold text-white tracking-tight">Buyer Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Welcome back, <span className="text-slate-200 font-medium">{data?.user.fullName}</span>. Here is your digital library activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/library"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Go to My Library →
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Purchased Items</span>
            <span className="text-base">📚</span>
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">
            {stats?.totalPurchasedProducts ?? 0}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <span>●</span> Active in vault
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Total Orders</span>
            <span className="text-base">📦</span>
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">
            {stats?.totalOrders ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Lifetime orders
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Official Receipts</span>
            <span className="text-base">🧾</span>
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">
            {stats?.totalReceipts ?? 0}
          </div>
          <div className="text-[11px] text-indigo-400 mt-1">
            Tax invoices available
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>My Reviews</span>
            <span className="text-base">⭐</span>
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">
            {stats?.totalReviews ?? 0}
          </div>
          <div className="text-[11px] text-amber-400 mt-1">
            Ratings shared
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 col-span-2 lg:col-span-1">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Downloads</span>
            <span className="text-base">⬇️</span>
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">
            {stats?.totalDownloads ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Files accessed
          </div>
        </div>
      </div>

      {/* Recent Purchases Quick Access */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>✨</span> Recent Purchases & Instant Access
          </h2>
          <Link href="/dashboard/library" className="text-xs text-indigo-400 hover:text-indigo-300">
            View All ({stats?.totalPurchasedProducts ?? 0}) →
          </Link>
        </div>

        {(!data?.recentPurchases || data.recentPurchases.length === 0) ? (
          <div className="p-8 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
            <div className="text-3xl mb-2">🛒</div>
            <h3 className="font-semibold text-sm text-slate-200">No purchases yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Explore our verified digital marketplace catalog to discover high-quality assets, templates, and tools.
            </p>
            <Link
              href="/test/catalog"
              className="inline-flex px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.recentPurchases.map((item) => (
              <div
                key={item.entitlementId}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-4 hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Owned · v{item.product.version}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(item.purchasedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-white mt-2 line-clamp-1">
                    {item.product.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    By {item.product.sellerName}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                  {item.file ? (
                    <a
                      href={`/api/v1/buyer/downloads/${item.file.id}/url`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                    >
                      Download File
                    </a>
                  ) : (
                    <Link
                      href="/dashboard/library"
                      className="flex-1 text-center py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                    >
                      View in Library
                    </Link>
                  )}
                  <Link
                    href={`/dashboard/orders/${item.orderId}`}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                    title="View Order"
                  >
                    📦
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Two Column Section: Recent Orders & Recent Receipts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders Table */}
        <section className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>📦</span> Recent Orders
            </h2>
            <Link href="/dashboard/orders" className="text-xs text-indigo-400 hover:text-indigo-300">
              View All ({stats?.totalOrders ?? 0}) →
            </Link>
          </div>

          {(!data?.recentOrders || data.recentOrders.length === 0) ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No orders recorded yet.
            </div>
          ) : (
            <div className="space-y-2">
              {data.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-white">{order.id}</div>
                    <div className="text-[11px] text-slate-400">
                      {order.firstProductTitle}
                      {order.itemsCount > 1 ? ` +${order.itemsCount - 1} more` : ""}
                    </div>
                  </div>

                  <div className="text-right space-y-0.5">
                    <div className="font-bold text-slate-200">
                      ₹{(order.totalAmountPaise / 100).toFixed(2)}
                    </div>
                    <span
                      className={`inline-block px-1.5 py-0.5 text-[10px] rounded font-medium ${
                        order.status === "PAID"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Receipts */}
        <section className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>🧾</span> Recent Receipts & Tax Invoices
            </h2>
            <Link href="/dashboard/receipts" className="text-xs text-indigo-400 hover:text-indigo-300">
              View All ({stats?.totalReceipts ?? 0}) →
            </Link>
          </div>

          {(!data?.recentReceipts || data.recentReceipts.length === 0) ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No receipts issued yet.
            </div>
          ) : (
            <div className="space-y-2">
              {data.recentReceipts.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-white font-mono">{rec.invoiceNumber}</div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(rec.issuedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-200">
                      ₹{(rec.amountPaidPaise / 100).toFixed(2)}
                    </span>
                    <a
                      href={rec.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-slate-700 hover:bg-indigo-600 text-slate-200 hover:text-white text-[11px] font-medium transition-colors"
                    >
                      PDF
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Account Info Footer Summary */}
      <section className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div>
          <span className="text-slate-300 font-medium">Account Status: </span>
          <span className="text-emerald-400 font-semibold">Active Verified Buyer</span> ·
          <span className="ml-1 text-slate-400">Member since {new Date(data?.user.createdAt || "").toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/profile" className="text-indigo-400 hover:underline">
            Edit Profile Settings
          </Link>
          <span>·</span>
          <Link href="/dashboard/support" className="text-slate-400 hover:underline">
            Help Center
          </Link>
        </div>
      </section>
    </div>
  );
}
