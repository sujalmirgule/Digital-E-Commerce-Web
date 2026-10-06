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
  ArrowRight,
  TrendingUp,
  FileText,
  Download,
  ShieldCheck,
  Activity,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";

interface OverviewData {
  stats: {
    users: { total: number; buyers: number; admins: number };
    sellers: { total: number; approved: number; pending: number; rejected: number };
    products: { total: number; published: number; pendingModeration: number; draft: number; rejected: number };
    orders: { total: number; paid: number; pending: number; failed: number; cancelled: number };
    payments?: { total: number; captured: number; pending: number; failed: number };
    downloads?: { total: number };
    downloadsCount?: number;
    financials: {
      grossTransactionValuePaise: number;
      platformCommissionPaise: number;
      sellerNetEarningsPaise: number;
    };
    receiptsCount: number;
    reviewsCount: number;
  };
  recentOrders: Array<{
    id: string;
    buyerName: string;
    buyerEmail: string;
    totalAmountPaise: number;
    status: string;
    createdAt: string;
    paidAt: string | null;
  }>;
  recentAuditLogs: Array<{
    id: string;
    action: string;
    targetEntity: string;
    targetId: string;
    adminName: string;
    createdAt: string;
  }>;
  pendingModerationQueue?: Array<{
    id: string;
    title: string;
    category: string;
    creator: string;
    pricePaise: number;
    thumbnail: string;
    createdAt: string;
  }>;
  pendingSellersQueue?: Array<{
    id: string;
    storeName: string;
    name: string;
    email: string;
    createdAt: string;
  }>;
  systemHealth?: {
    status: string;
    database: string;
    latencyMs: number;
    uptimeSeconds: number;
  };
}

export default function AdminOverviewPage() {
  const { token, fetchWithAuth } = useAdminAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    if (!token) return;
    setModeratingId(productId);
    try {
      const res = await fetchWithAuth(`/api/v1/admin/products/${productId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: action === "reject" ? "Curation quality standards" : undefined,
        }),
      });
      if (res.ok) {
        fetchOverview();
      } else {
        const d = await res.json();
        alert(d.error?.message || `Failed to ${action} product`);
      }
    } catch {
      alert(`Network error while attempting to ${action} product`);
    } finally {
      setModeratingId(null);
    }
  };

  const formatRupee = (paise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(paise / 100);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const s = data?.stats;

  return (
    <div className="space-y-8">
      {/* 01 — Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3B261C]/20 dark:border-stone-800">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#151311] dark:text-[#FAF7F2] tracking-tight">
            Marketplace Control Center
          </h1>
          <p className="text-[#8A6048] dark:text-[#C8AA91] text-xs sm:text-sm mt-1">
            Authoritative executive metrics aggregated live from PostgreSQL.
          </p>
        </div>
        <button
          onClick={fetchOverview}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#3B261C] dark:text-[#FAF7F2] bg-white dark:bg-[#211D1A] border border-[#C8AA91]/60 dark:border-stone-700 rounded-xl hover:border-[#3B261C] transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#A94432]" : ""}`} />
          <span>Refresh Live Metrics</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-900/50 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 02 — High-Level Operational Metrics (6 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Link
          href="/admin/users"
          className="p-4 rounded-2xl bg-white dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 hover:border-[#3B261C] transition shadow-sm group"
        >
          <div className="flex items-center justify-between text-[#8A6048] mb-2">
            <Users className="w-4 h-4 text-[#A94432]" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Users</span>
          </div>
          <div className="text-2xl font-serif font-bold text-[#151311] dark:text-[#FAF7F2]">
            {s?.users?.total?.toLocaleString("en-IN") || "0"}
          </div>
          <div className="text-[11px] text-[#8A6048] mt-1">
            {s?.users?.buyers || 0} buyers • {s?.users?.admins || 0} admins
          </div>
        </Link>

        <Link
          href="/admin/sellers"
          className="p-4 rounded-2xl bg-white dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 hover:border-[#3B261C] transition shadow-sm group"
        >
          <div className="flex items-center justify-between text-[#8A6048] mb-2">
            <Store className="w-4 h-4 text-[#A94432]" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Sellers</span>
          </div>
          <div className="text-2xl font-serif font-bold text-[#151311] dark:text-[#FAF7F2]">
            {s?.sellers?.total?.toLocaleString("en-IN") || "0"}
          </div>
          <div className="text-[11px] text-[#8A6048] mt-1">
            {s?.sellers?.approved || 0} approved •{" "}
            <span className="text-[#A94432] font-semibold">{s?.sellers?.pending || 0} pending</span>
          </div>
        </Link>

        <Link
          href="/admin/products"
          className="p-4 rounded-2xl bg-white dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 hover:border-[#3B261C] transition shadow-sm group"
        >
          <div className="flex items-center justify-between text-[#8A6048] mb-2">
            <Package className="w-4 h-4 text-[#A94432]" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Products</span>
          </div>
          <div className="text-2xl font-serif font-bold text-[#151311] dark:text-[#FAF7F2]">
            {s?.products?.total?.toLocaleString("en-IN") || "0"}
          </div>
          <div className="text-[11px] text-[#8A6048] mt-1">
            {s?.products?.published || 0} live •{" "}
            <span className="text-[#A94432] font-semibold">{s?.products?.pendingModeration || 0} review</span>
          </div>
        </Link>

        <Link
          href="/admin/orders"
          className="p-4 rounded-2xl bg-white dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 hover:border-[#3B261C] transition shadow-sm group"
        >
          <div className="flex items-center justify-between text-[#8A6048] mb-2">
            <ShoppingBag className="w-4 h-4 text-[#A94432]" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Orders</span>
          </div>
          <div className="text-2xl font-serif font-bold text-[#151311] dark:text-[#FAF7F2]">
            {s?.orders?.total?.toLocaleString("en-IN") || "0"}
          </div>
          <div className="text-[11px] text-[#8A6048] mt-1">
            <span className="text-emerald-600 font-semibold">{s?.orders?.paid || 0} paid</span> • {s?.orders?.failed || 0} failed
          </div>
        </Link>

        <Link
          href="/admin/payments"
          className="p-4 rounded-2xl bg-white dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 hover:border-[#3B261C] transition shadow-sm group"
        >
          <div className="flex items-center justify-between text-[#8A6048] mb-2">
            <CreditCard className="w-4 h-4 text-[#A94432]" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Payments</span>
          </div>
          <div className="text-2xl font-serif font-bold text-[#151311] dark:text-[#FAF7F2]">
            {s?.payments?.total ? s.payments.total.toLocaleString("en-IN") : s?.orders?.paid?.toLocaleString("en-IN") || "0"}
          </div>
          <div className="text-[11px] text-[#8A6048] mt-1">
            <span className="text-emerald-600 font-semibold">{s?.payments?.captured || s?.orders?.paid || 0} captured</span>
          </div>
        </Link>

        <Link
          href="/admin/receipts"
          className="p-4 rounded-2xl bg-white dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 hover:border-[#3B261C] transition shadow-sm group"
        >
          <div className="flex items-center justify-between text-[#8A6048] mb-2">
            <FileText className="w-4 h-4 text-[#A94432]" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Receipts</span>
          </div>
          <div className="text-2xl font-serif font-bold text-[#151311] dark:text-[#FAF7F2]">
            {s?.receiptsCount?.toLocaleString("en-IN") || "0"}
          </div>
          <div className="text-[11px] text-[#8A6048] mt-1">
            {s?.downloadsCount || s?.downloads?.total || 0} downloads
          </div>
        </Link>
      </div>

      {/* 03 — Financial Settlement Matrix (Authoritative integer paise aggregation) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#3B261C] text-[#FAF7F2] shadow-md space-y-2">
          <div className="flex items-center justify-between text-[#C8AA91]">
            <span className="text-xs uppercase font-bold tracking-wider">Gross Sales Volume</span>
            <TrendingUp className="w-4 h-4 text-[#C46A4A]" />
          </div>
          <div className="text-3xl font-serif font-bold tracking-tight">
            {formatRupee(s?.financials?.grossTransactionValuePaise || 0)}
          </div>
          <p className="text-[11px] text-[#C8AA91]">
            Total captured e-commerce checkout GMV in Indian Rupees.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-stone-50 dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#8A6048]">
            <span className="text-xs uppercase font-bold tracking-wider">Platform Commissions</span>
            <ShieldCheck className="w-4 h-4 text-[#A94432]" />
          </div>
          <div className="text-3xl font-serif font-bold text-[#151311] dark:text-[#FAF7F2] tracking-tight">
            {formatRupee(s?.financials?.platformCommissionPaise || 0)}
          </div>
          <p className="text-[11px] text-[#8A6048]">
            Platform transaction service fee retained across paid deliverables.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-stone-50 dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#8A6048]">
            <span className="text-xs uppercase font-bold tracking-wider">Net Creator Earnings</span>
            <Store className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-serif font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatRupee(s?.financials?.sellerNetEarningsPaise || 0)}
          </div>
          <p className="text-[11px] text-[#8A6048]">
            Authoritative net earnings credited to merchant balances.
          </p>
        </div>
      </div>

      {/* 04 — Operational Action Queues (Pending Products & Pending Sellers) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Product Moderation */}
        <div className="bg-white dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
            <div>
              <h3 className="font-serif font-bold text-base text-[#151311] dark:text-[#FAF7F2]">
                Products Awaiting Moderation
              </h3>
              <p className="text-[11px] text-[#8A6048]">
                {s?.products?.pendingModeration || 0} product(s) pending curation
              </p>
            </div>
            <Link
              href="/admin/products"
              className="text-xs font-semibold text-[#A94432] hover:underline inline-flex items-center gap-1"
            >
              View Register <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {data?.pendingModerationQueue && data.pendingModerationQueue.length > 0 ? (
            <div className="space-y-2.5">
              {data.pendingModerationQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-stone-50 dark:bg-stone-900/60 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-10 h-10 object-cover rounded-lg border border-stone-200 dark:border-stone-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-[#151311] dark:text-[#FAF7F2] truncate">{item.title}</div>
                      <div className="text-[10px] text-[#8A6048]">
                        by {item.creator} • {item.category} • {formatRupee(item.pricePaise)}
                      </div>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleModeration(item.id, "approve")}
                      disabled={moderatingId === item.id}
                      className="px-2.5 py-1 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleModeration(item.id, "reject")}
                      disabled={moderatingId === item.id}
                      className="px-2.5 py-1 text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-[#8A6048] text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              All submitted products have been moderated. Queue is clear!
            </div>
          )}
        </div>

        {/* Pending Seller Applications */}
        <div className="bg-white dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
            <div>
              <h3 className="font-serif font-bold text-base text-[#151311] dark:text-[#FAF7F2]">
                Pending Seller Onboarding
              </h3>
              <p className="text-[11px] text-[#8A6048]">
                {s?.sellers?.pending || 0} application(s) awaiting KYC approval
              </p>
            </div>
            <Link
              href="/admin/sellers"
              className="text-xs font-semibold text-[#A94432] hover:underline inline-flex items-center gap-1"
            >
              View Sellers <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {data?.pendingSellersQueue && data.pendingSellersQueue.length > 0 ? (
            <div className="space-y-2.5">
              {data.pendingSellersQueue.map((seller) => (
                <div
                  key={seller.id}
                  className="p-3 bg-stone-50 dark:bg-stone-900/60 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-[#151311] dark:text-[#FAF7F2] truncate">{seller.storeName}</div>
                    <div className="text-[10px] text-[#8A6048]">
                      Applicant: {seller.name} • {seller.email}
                    </div>
                  </div>
                  <Link
                    href={`/admin/sellers`}
                    className="px-2.5 py-1 text-[10px] font-semibold bg-[#3B261C] hover:bg-[#684332] text-[#FAF7F2] rounded-lg transition"
                  >
                    Review KYC
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-[#8A6048] text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              All merchant KYC applications have been reviewed. Queue is clear!
            </div>
          )}
        </div>
      </div>

      {/* 05 — Recent Orders & Real Audit Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
            <h3 className="font-serif font-bold text-base text-[#151311] dark:text-[#FAF7F2]">
              Recent Orders
            </h3>
            <Link
              href="/admin/orders"
              className="text-xs font-semibold text-[#A94432] hover:underline inline-flex items-center gap-1"
            >
              All Orders <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
            {data?.recentOrders && data.recentOrders.length > 0 ? (
              data.recentOrders.map((order) => (
                <div key={order.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <Link
                      href={`/admin/orders?search=${order.id}`}
                      className="font-mono font-semibold text-[#A94432] hover:underline"
                    >
                      #{order.id.slice(-8).toUpperCase()}
                    </Link>
                    <div className="text-[11px] text-[#8A6048]">
                      {order.buyerName} • {formatDate(order.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-[#151311] dark:text-[#FAF7F2]">
                      {formatRupee(order.totalAmountPaise)}
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        order.status === "PAID"
                          ? "bg-emerald-500/15 text-emerald-600"
                          : "bg-amber-500/15 text-amber-600"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-[#8A6048]">No recent orders</div>
            )}
          </div>
        </div>

        {/* Real Audit Activity Feed */}
        <div className="bg-white dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
            <h3 className="font-serif font-bold text-base text-[#151311] dark:text-[#FAF7F2]">
              Platform Audit Trail
            </h3>
            <Link
              href="/admin/audit-logs"
              className="text-xs font-semibold text-[#A94432] hover:underline inline-flex items-center gap-1"
            >
              All Logs <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
            {data?.recentAuditLogs && data.recentAuditLogs.length > 0 ? (
              data.recentAuditLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold font-mono text-[11px] text-[#151311] dark:text-[#FAF7F2]">
                      {log.action}
                    </span>
                    <div className="text-[11px] text-[#8A6048]">
                      by {log.adminName} on {log.targetEntity} #{log.targetId.slice(-6)}
                    </div>
                  </div>
                  <div className="text-right font-mono text-[10px] text-[#8A6048]">
                    {formatDate(log.createdAt)}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-[#8A6048]">No audit log entries recorded</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
