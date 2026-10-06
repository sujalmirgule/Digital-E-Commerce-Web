"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useDashboardAuth } from "./DashboardAuthContext";
import { BuyerOverviewDTO } from "@/lib/services/buyer-dashboard";
import {
  CreditCard,
  FolderCheck,
  Download,
  Receipt,
  Star,
  Package,
  ArrowRight,
  AlertCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";

export default function BuyerOverviewPage() {
  const { token, fetchWithAuth, user } = useDashboardAuth();
  const [data, setData] = useState<BuyerOverviewDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  const handleDownloadFile = async (fileId: string) => {
    try {
      setDownloadingId(fileId);
      const res = await fetchWithAuth(`/api/v1/buyer/downloads/${fileId}/url`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.data?.downloadUrl) {
        window.open(json.data.downloadUrl, "_blank");
      } else {
        const direct = `/api/v1/buyer/downloads/${fileId}/url`;
        const fallback = token ? `${direct}?token=${encodeURIComponent(token)}` : direct;
        window.open(fallback, "_blank");
      }
    } catch {
      const direct = `/api/v1/buyer/downloads/${fileId}/url`;
      const fallback = token ? `${direct}?token=${encodeURIComponent(token)}` : direct;
      window.open(fallback, "_blank");
    } finally {
      setDownloadingId(null);
    }
  };

  const displayName = user?.fullName?.split(" ")[0] || data?.user?.fullName?.split(" ")[0] || "User";
  const purchasedCount = data?.stats?.totalPurchasedProducts ?? 0;
  const ordersCount = data?.stats?.totalOrders ?? 0;
  const downloadsCount = data?.stats?.totalDownloads ?? 0;
  const receiptsCount = data?.stats?.totalReceipts ?? 0;
  const reviewsCount = data?.stats?.totalReviews ?? 0;

  const recentPurchases = data?.recentPurchases || [];
  const recentOrders = data?.recentOrders || [];

  return (
    <div className="space-y-8 md:space-y-10">
      {/* 01 — Top Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-normal text-[#F7EFE2] tracking-tight">
            Good day, <span className="font-serif italic text-[#E8D5B5]">{displayName}.</span>
          </h1>
          <p className="text-[#BBAE9F] text-xs sm:text-sm mt-1.5 font-light">
            Your verified digital vault and buyer account at a glance.
          </p>
        </div>

        {/* Quick Action Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/dashboard/library"
            className="px-4 py-2 rounded-xl bg-[#211815] border border-[#3A2930] hover:border-[#E8D5B5] text-[#E8D5B5] text-xs font-medium transition-colors"
          >
            My Vault
          </Link>
          <Link
            href="/products"
            className="px-4 py-2 rounded-xl bg-[#F43F5E] hover:bg-[#F43F5E]/90 text-white text-xs font-medium transition-colors shadow-sm"
          >
            Explore Catalog →
          </Link>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-[#211815] border border-[#3A2930] rounded-2xl p-5"></div>
            ))}
          </div>
          <div className="h-64 bg-[#211815] border border-[#3A2930] rounded-2xl"></div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-5 rounded-2xl bg-[#211815] border border-rose-900/50 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadOverview}
            className="px-3.5 py-1.5 rounded-lg bg-[#F43F5E] text-white text-xs font-medium hover:bg-[#F43F5E]/90"
          >
            Retry
          </button>
        </div>
      )}

      {/* 02 — Real Stat Metric Cards */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {/* Metric 1: Library Items */}
          <Link
            href="/dashboard/library"
            className="p-5 rounded-2xl bg-[#211815] border border-[#3A2930] hover:border-[#E8D5B5]/40 transition-all flex items-center justify-between group shadow-lg shadow-black/30"
          >
            <div>
              <div className="text-3xl lg:text-4xl font-serif font-light text-[#F7EFE2]">
                {String(purchasedCount).padStart(2, "0")}
              </div>
              <div className="text-xs uppercase tracking-wider text-[#BBAE9F] mt-1 font-medium font-mono">
                Library Items
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#120A12] border border-[#3A2930] flex items-center justify-center text-[#F43F5E] group-hover:scale-105 transition-all">
              <FolderCheck className="w-5 h-5" />
            </div>
          </Link>

          {/* Metric 2: Total Orders */}
          <Link
            href="/dashboard/orders"
            className="p-5 rounded-2xl bg-[#211815] border border-[#3A2930] hover:border-[#E8D5B5]/40 transition-all flex items-center justify-between group shadow-lg shadow-black/30"
          >
            <div>
              <div className="text-3xl lg:text-4xl font-serif font-light text-[#F7EFE2]">
                {String(ordersCount).padStart(2, "0")}
              </div>
              <div className="text-xs uppercase tracking-wider text-[#BBAE9F] mt-1 font-medium font-mono">
                Purchases
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#120A12] border border-[#3A2930] flex items-center justify-center text-[#E8D5B5] group-hover:scale-105 transition-all">
              <CreditCard className="w-5 h-5" />
            </div>
          </Link>

          {/* Metric 3: Downloads */}
          <Link
            href="/dashboard/downloads"
            className="p-5 rounded-2xl bg-[#211815] border border-[#3A2930] hover:border-[#E8D5B5]/40 transition-all flex items-center justify-between group shadow-lg shadow-black/30"
          >
            <div>
              <div className="text-3xl lg:text-4xl font-serif font-light text-[#F7EFE2]">
                {String(downloadsCount).padStart(2, "0")}
              </div>
              <div className="text-xs uppercase tracking-wider text-[#BBAE9F] mt-1 font-medium font-mono">
                Downloads
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#120A12] border border-[#3A2930] flex items-center justify-center text-[#F43F5E] group-hover:scale-105 transition-all">
              <Download className="w-5 h-5" />
            </div>
          </Link>

          {/* Metric 4: Tax Receipts */}
          <Link
            href="/dashboard/receipts"
            className="p-5 rounded-2xl bg-[#211815] border border-[#3A2930] hover:border-[#E8D5B5]/40 transition-all flex items-center justify-between group shadow-lg shadow-black/30"
          >
            <div>
              <div className="text-3xl lg:text-4xl font-serif font-light text-[#F7EFE2]">
                {String(receiptsCount).padStart(2, "0")}
              </div>
              <div className="text-xs uppercase tracking-wider text-[#BBAE9F] mt-1 font-medium font-mono">
                Receipts
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#120A12] border border-[#3A2930] flex items-center justify-center text-[#E8D5B5] group-hover:scale-105 transition-all">
              <Receipt className="w-5 h-5" />
            </div>
          </Link>
        </div>
      )}

      {/* 03 — Recent Purchases Section */}
      {!loading && !error && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-medium text-[#F7EFE2] tracking-tight">
              Recent Vault Additions
            </h2>
            <Link
              href="/dashboard/library"
              className="text-xs text-[#F43F5E] hover:text-[#F43F5E]/80 transition-colors font-medium flex items-center gap-1 font-mono"
            >
              <span>View Library ({purchasedCount})</span>
              <span>→</span>
            </Link>
          </div>

          {recentPurchases.length === 0 ? (
            <div className="py-14 text-center bg-[#211815]/40 border border-[#3A2930] rounded-3xl p-8 max-w-xl mx-auto">
              <div className="w-12 h-12 rounded-full bg-[#120A12] border border-[#3A2930] flex items-center justify-center text-xl mx-auto mb-3">
                <Package className="w-5 h-5 text-[#BBAE9F]" />
              </div>
              <h3 className="font-serif text-base text-[#F7EFE2]">No purchases yet</h3>
              <p className="text-xs text-[#BBAE9F] max-w-sm mx-auto mt-1 mb-6">
                You haven&apos;t acquired any digital products yet. Visit the curated catalog to discover templates, UI kits, and software.
              </p>
              <Link
                href="/products"
                className="inline-flex px-5 py-2.5 rounded-full bg-[#F43F5E] hover:bg-[#F43F5E]/90 text-white text-xs font-semibold shadow-md transition-colors"
              >
                Browse Catalog →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {recentPurchases.slice(0, 4).map((item) => (
                <div
                  key={item.entitlementId}
                  className="group p-3.5 rounded-2xl bg-[#211815] border border-[#3A2930] hover:border-[#E8D5B5]/40 transition-all flex flex-col justify-between shadow-md"
                >
                  <div>
                    {item.product.thumbnailUrl && (
                      <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#120A12] border border-[#3A2930] relative mb-3">
                        <img
                          src={item.product.thumbnailUrl}
                          alt={item.product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <h4 className="font-medium text-xs text-[#F7EFE2] truncate">
                      {item.product.title}
                    </h4>
                    <p className="text-[11px] text-[#BBAE9F] mt-0.5 truncate font-mono">
                      {new Date(item.purchasedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#3A2930] flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-medium font-mono">
                      Active
                    </span>
                    {item.file ? (
                      <button
                        onClick={() => handleDownloadFile(item.file!.id)}
                        disabled={downloadingId === item.file.id}
                        className="text-[11px] text-[#F43F5E] hover:text-[#F43F5E]/80 font-medium flex items-center gap-1"
                      >
                        {downloadingId === item.file.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <span>Download</span>
                        )}
                      </button>
                    ) : (
                      <Link
                        href={`/dashboard/orders/${item.orderId}`}
                        className="text-[11px] text-[#E8D5B5] hover:underline"
                      >
                        Order
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 04 — Recent Orders Section */}
      {!loading && !error && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-medium text-[#F7EFE2] tracking-tight">
              Recent Transactions
            </h2>
            <Link
              href="/dashboard/orders"
              className="text-xs text-[#F43F5E] hover:text-[#F43F5E]/80 transition-colors font-medium flex items-center gap-1 font-mono"
            >
              <span>View All ({ordersCount})</span>
              <span>→</span>
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="py-10 text-center bg-[#211815]/30 border border-[#3A2930] rounded-2xl p-6">
              <p className="text-xs text-[#BBAE9F]">No recent transactions found.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#3A2930] bg-[#211815] border border-[#3A2930] rounded-2xl overflow-hidden shadow-sm">
              {recentOrders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#211815]/80 transition-colors text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-[#F7EFE2]">
                        {order.id}
                      </span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                        {order.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#BBAE9F]">
                      {order.firstProductTitle}
                      {order.itemsCount > 1 ? ` +${order.itemsCount - 1} more` : ""} ·{" "}
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-medium text-[#F7EFE2] font-mono">
                      ₹{(order.totalAmountPaise / 100).toFixed(2)}
                    </span>
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="px-3 py-1.5 rounded-xl bg-[#120A12] border border-[#3A2930] hover:border-[#E8D5B5] text-[#E8D5B5] text-xs font-medium transition-colors flex items-center gap-1"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3 text-[#BBAE9F]" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
