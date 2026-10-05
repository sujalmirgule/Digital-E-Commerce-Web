"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminAuth } from "../AdminAuthContext";
import {
  BookOpen,
  TrendingUp,
  CreditCard,
  Store,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface LedgerItem {
  id: string;
  orderId: string;
  orderItemId: string;
  grossAmountPaise: number;
  platformFeePaise: number;
  sellerEarningsPaise: number;
  createdAt: string;
  order: {
    id: string;
    status: string;
    totalAmountPaise: number;
    createdAt: string;
    paidAt: string | null;
  };
  orderItem: {
    id: string;
    productTitle: string;
    licenseType: string;
    seller: {
      id: string;
      storeName: string;
    };
  } | null;
}

interface LedgerSummary {
  totalPlatformFeePaise: number;
  totalGrossPaise: number;
  totalSellerEarningsPaise: number;
  totalLedgerEntries: number;
}

export default function AdminLedgerPage() {
  const { token } = useAdminAuth();
  const [ledgers, setLedgers] = useState<LedgerItem[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [orderIdFilter, setOrderIdFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLedger = async (p = page, ordId = orderIdFilter) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", p.toString());
      params.set("limit", "15");
      if (ordId.trim()) params.set("orderId", ordId.trim());

      const res = await fetch(`/api/v1/admin/platform/ledger?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load platform ledger");
      }
      setLedgers(data.data.ledgers || []);
      setSummary(data.data.summary || null);
      setPage(data.data.pagination.page);
      setTotalPages(data.data.pagination.totalPages);
      setTotalCount(data.data.pagination.total);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchLedger(1, orderIdFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLedger(1, orderIdFilter);
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Platform Financial Ledger</h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative platform revenue audit, commission distribution, and double-entry accounting records.
          </p>
        </div>
        <button
          onClick={() => fetchLedger(page, orderIdFilter)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Commission Revenue
              </span>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-emerald-400">
              {formatRupee(summary.totalPlatformFeePaise)}
            </div>
            <p className="text-xs text-slate-400 mt-1">Retained marketplace margin</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Gross Processed Volume
              </span>
              <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-white">
              {formatRupee(summary.totalGrossPaise)}
            </div>
            <p className="text-xs text-slate-400 mt-1">Aggregated order total</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Seller Earnings Share
              </span>
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                <Store className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-indigo-300">
              {formatRupee(summary.totalSellerEarningsPaise)}
            </div>
            <p className="text-xs text-slate-400 mt-1">Credited to creator balances</p>
          </div>
        </div>
      )}

      {/* Ledger Immutability Banner */}
      <div className="flex items-start gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 text-xs">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">Double-Entry Ledger Integrity:</span>{" "}
          Platform commission entries are immutable historical records created upon captured order payment. Financial history cannot be manually altered through the dashboard.
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter by Order ID */}
      <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
        <div className="relative max-w-md w-full">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={orderIdFilter}
            onChange={(e) => setOrderIdFilter(e.target.value)}
            placeholder="Filter by Order ID (e.g. ORD-...)..."
            className="w-full text-xs pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
        <button
          type="submit"
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
        >
          Filter
        </button>
      </form>

      {/* Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-rose-500" />
            <p className="text-xs font-medium">Loading platform ledger...</p>
          </div>
        ) : ledgers.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">No Ledger Entries</h3>
            <p className="text-xs text-slate-500 mt-1">Platform ledger records will populate upon paid orders.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Order</th>
                  <th className="py-3 px-4">Item & Merchant</th>
                  <th className="py-3 px-4">Gross Sale</th>
                  <th className="py-3 px-4">Platform Fee (10%)</th>
                  <th className="py-3 px-4">Seller Earning (90%)</th>
                  <th className="py-3 px-4 text-right">Settlement Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {ledgers.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Link
                        href={`/admin/orders?search=${item.orderId}`}
                        className="font-mono text-xs font-semibold text-rose-400 hover:underline inline-flex items-center gap-1"
                      >
                        #{item.orderId.slice(-8).toUpperCase()}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {formatDate(item.createdAt)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-white truncate">
                        {item.orderItem?.productTitle || "Digital Product"}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>Merchant: {item.orderItem?.seller.storeName || "N/A"}</span>
                        <span>•</span>
                        <span>{item.orderItem?.licenseType || "Standard"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-200">
                      {formatRupee(item.grossAmountPaise)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-emerald-400">
                      +{formatRupee(item.platformFeePaise)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                      {formatRupee(item.sellerEarningsPaise)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {item.order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40">
            <span>
              Page {page} of {totalPages} ({totalCount} total entries)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchLedger(page - 1, orderIdFilter)}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                onClick={() => fetchLedger(page + 1, orderIdFilter)}
                disabled={page >= totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
