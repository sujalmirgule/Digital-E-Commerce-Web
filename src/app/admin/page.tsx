"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminAuth } from "./AdminAuthContext";
import {
  TrendingUp,
  CreditCard,
  Users,
  Store,
  Package,
  ShoppingBag,
  FileText,
  Star,
  Activity,
  History,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
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
    adminEmail: string;
    createdAt: string;
  }>;
  systemHealth: {
    status: "HEALTHY" | "DEGRADED";
    database: "CONNECTED" | "ERROR";
    latencyMs: number;
    nodeVersion: string;
    uptimeSeconds: number;
    timestamp: string;
  };
}

export default function AdminOverviewPage() {
  const { token } = useAdminAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/v1/admin/overview", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const resJson = await res.json();
      if (!res.ok || !resJson.success) {
        throw new Error(resJson.error?.message || "Failed to load platform overview");
      }
      setData(resJson.data);
    } catch (err: any) {
      setError(err.message || "An error occurred loading overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOverview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const formatRupee = (paise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(paise / 100);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && !data) {
    return (
      <div className="py-24 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-rose-500" />
        <p className="text-sm font-medium">Aggregating platform metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Platform Control Overview</h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative marketplace health, double-entry financial settlement, and operational metrics.
          </p>
        </div>
        <button
          onClick={fetchOverview}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition shadow-sm self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Metrics
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Required Alert Banners (if pending items exist) */}
      {data && (data.stats.sellers.pending > 0 || data.stats.products.pendingModeration > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.stats.sellers.pending > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    {data.stats.sellers.pending} Seller Applications Pending
                  </h4>
                  <p className="text-xs text-slate-400">Review KYC & approve seller onboarding</p>
                </div>
              </div>
              <Link
                href="/admin/sellers?status=PENDING"
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold rounded-lg transition"
              >
                Review →
              </Link>
            </div>
          )}

          {data.stats.products.pendingModeration > 0 && (
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    {data.stats.products.pendingModeration} Products in Moderation Queue
                  </h4>
                  <p className="text-xs text-slate-400">Inspect digital files and specifications</p>
                </div>
              </div>
              <Link
                href="/admin/products?status=PENDING_REVIEW"
                className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold rounded-lg transition"
              >
                Moderate →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Row 1: Financial Aggregate KPI Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Gross Transaction Value */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden shadow-lg shadow-black/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Gross Transaction Value
              </span>
              <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-white">
              {formatRupee(data.stats.financials.grossTransactionValuePaise)}
            </div>
            <div className="mt-1 text-xs text-slate-400 flex items-center gap-1">
              <span>Paid volume across</span>
              <span className="text-slate-300 font-semibold">{data.stats.orders.paid} orders</span>
            </div>
          </div>

          {/* Platform Revenue (Commission) */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden shadow-lg shadow-black/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Platform Commission
              </span>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-emerald-400">
              {formatRupee(data.stats.financials.platformCommissionPaise)}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              10% marketplace fee retained
            </div>
          </div>

          {/* Seller Net Earnings */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden shadow-lg shadow-black/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Seller Net Earnings
              </span>
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                <Store className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-indigo-300">
              {formatRupee(data.stats.financials.sellerNetEarningsPaise)}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Payable to creators
            </div>
          </div>

          {/* System Health */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden shadow-lg shadow-black/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                System Status
              </span>
              <div className="p-2 bg-teal-500/10 text-teal-400 rounded-xl">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-teal-400 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-teal-400 animate-pulse" />
              {data.systemHealth.status}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              DB Latency: <span className="text-slate-300 font-mono">{data.systemHealth.latencyMs}ms</span>
            </div>
          </div>
        </div>
      )}

      {/* Row 2: Entity Counter Grid */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            href="/admin/users"
            className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-xl transition group"
          >
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total Users</span>
              <Users className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-colors" />
            </div>
            <div className="mt-2 text-xl font-bold text-white">{data.stats.users.total}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {data.stats.users.buyers} buyers • {data.stats.users.admins} admins
            </div>
          </Link>

          <Link
            href="/admin/sellers"
            className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-xl transition group"
          >
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Sellers</span>
              <Store className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </div>
            <div className="mt-2 text-xl font-bold text-white">{data.stats.sellers.total}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {data.stats.sellers.approved} approved • {data.stats.sellers.pending} pending
            </div>
          </Link>

          <Link
            href="/admin/products"
            className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-xl transition group"
          >
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Products</span>
              <Package className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
            </div>
            <div className="mt-2 text-xl font-bold text-white">{data.stats.products.total}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {data.stats.products.published} published • {data.stats.products.pendingModeration} queue
            </div>
          </Link>

          <Link
            href="/admin/orders"
            className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-xl transition group"
          >
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Orders Placed</span>
              <ShoppingBag className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </div>
            <div className="mt-2 text-xl font-bold text-white">{data.stats.orders.total}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {data.stats.orders.paid} paid • {data.stats.orders.pending} pending
            </div>
          </Link>
        </div>
      )}

      {/* Row 3: Split Table - Recent Orders & Recent Audit Trail */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">Recent Orders</h3>
              </div>
              <Link
                href="/admin/orders"
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold inline-flex items-center gap-1"
              >
                View All
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {data.recentOrders.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No orders recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {data.recentOrders.map((order) => (
                  <div key={order.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono text-slate-300 font-semibold">
                        #{order.id.slice(-8).toUpperCase()}
                      </div>
                      <div className="text-[11px] text-slate-500">{order.buyerName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-white">
                        {formatRupee(order.totalAmountPaise)}
                      </div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold mt-0.5 ${
                          order.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Audit Trail */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Recent Admin Audit Activity</h3>
              </div>
              <Link
                href="/admin/audit-logs"
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1"
              >
                View All
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {data.recentAuditLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No audit logs recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {data.recentAuditLogs.map((log) => (
                  <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-200">
                        {log.action}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        By {log.adminName} on {log.targetEntity}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-500 font-mono">
                      {formatDate(log.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
