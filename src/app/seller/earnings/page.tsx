"use client";

import React, { useEffect, useState } from "react";
import { useSellerAuth } from "../SellerAuthContext";
import {
  Wallet,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Percent,
} from "lucide-react";

interface EarningItem {
  id: string;
  orderId: string;
  orderItemId: string;
  productTitle: string | null;
  licenseType: string | null;
  grossAmountPaise: number;
  platformFeePaise: number;
  netEarningsPaise: number;
  status: "PENDING" | "AVAILABLE" | "PAID_OUT" | "REFUNDED_DEDUCTED";
  availableOn: string;
  orderStatus: string;
  saleDate: string;
  createdAt: string;
}

interface EarningSummary {
  periodGrossPaise: number;
  periodPlatformFeePaise: number;
  periodNetEarningsPaise: number;
  totalRevenuePaise: number;
  netEarningsPaise: number;
  availableBalancePaise: number;
  pendingBalancePaise: number;
}

interface EarningPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function SellerEarningsPage() {
  const { token } = useSellerAuth();
  const [earnings, setEarnings] = useState<EarningItem[]>([]);
  const [summary, setSummary] = useState<EarningSummary | null>(null);
  const [pagination, setPagination] = useState<EarningPagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEarnings = async (page = 1, status = statusFilter) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "15");
      if (status !== "ALL") {
        params.set("status", status);
      }

      const res = await fetch(`/api/v1/seller/earnings?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load financial ledger");
      }

      setEarnings(data.data.earnings || []);
      setSummary(data.data.summary || null);
      setPagination(data.data.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 });
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchEarnings(1, statusFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);

  const formatRupee = (paise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(paise / 100);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Cleared / Available
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending Escrow
          </span>
        );
      case "PAID_OUT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            Paid Out
          </span>
        );
      case "REFUNDED_DEDUCTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Refund Deducted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Financial Ledger & Earnings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Authoritative financial settlement records, fee transparency, and escrow balances.
          </p>
        </div>
        <button
          onClick={() => fetchEarnings(pagination.page, statusFilter)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Gross Sales
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {summary ? formatRupee(summary.totalRevenuePaise) : "₹0.00"}
          </div>
          <p className="text-xs text-slate-400 mt-1">Total revenue generated</p>
        </div>

        {/* Net Earnings */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Net Earnings
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-600">
            {summary ? formatRupee(summary.netEarningsPaise) : "₹0.00"}
          </div>
          <p className="text-xs text-slate-400 mt-1">After 10% platform commission</p>
        </div>

        {/* Cleared / Available Balance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Available Balance
            </span>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {summary ? formatRupee(summary.availableBalancePaise) : "₹0.00"}
          </div>
          <p className="text-xs text-teal-600 font-medium mt-1">Cleared for payouts</p>
        </div>

        {/* Pending Escrow */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Escrow
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {summary ? formatRupee(summary.pendingBalancePaise) : "₹0.00"}
          </div>
          <p className="text-xs text-amber-600 font-medium mt-1">Clears after return window</p>
        </div>
      </div>

      {/* Accounting Notice */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-600 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-800">Double-Entry Ledger Integrity</p>
          <p className="mt-0.5 text-slate-500">
            All balances and commissions are computed server-side in integer paise to avoid rounding discrepancies. Funds move from <span className="font-medium text-amber-700">Pending</span> to <span className="font-medium text-emerald-700">Available</span> upon escrow maturation.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { label: "All Records", val: "ALL" },
          { label: "Available (Cleared)", val: "AVAILABLE" },
          { label: "Pending Escrow", val: "PENDING" },
          { label: "Paid Out", val: "PAID_OUT" },
        ].map((tab) => (
          <button
            key={tab.val}
            onClick={() => setStatusFilter(tab.val)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === tab.val
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
            <p className="text-sm font-medium">Loading ledger entries...</p>
          </div>
        ) : earnings.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No Ledger Entries Found</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              Ledger entries are created automatically when sales are processed and paid.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Order</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Gross Sale</th>
                  <th className="py-3 px-4">Platform Fee</th>
                  <th className="py-3 px-4 text-emerald-600">Net Earning</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Available On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {earnings.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                      <div className="font-semibold text-slate-700">
                        #{entry.orderId.slice(-8).toUpperCase()}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {formatDate(entry.saleDate || entry.createdAt)}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-slate-900 truncate">
                        {entry.productTitle || "Digital Product"}
                      </div>
                      <div className="text-xs text-slate-400">
                        License: {entry.licenseType || "Standard"}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {formatRupee(entry.grossAmountPaise)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">
                      -{formatRupee(entry.platformFeePaise)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-600 whitespace-nowrap">
                      {formatRupee(entry.netEarningsPaise)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(entry.status)}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-500 whitespace-nowrap font-mono">
                      {formatDate(entry.availableOn)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
            <span className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchEarnings(pagination.page - 1, statusFilter)}
                disabled={pagination.page <= 1 || loading}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={() => fetchEarnings(pagination.page + 1, statusFilter)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
