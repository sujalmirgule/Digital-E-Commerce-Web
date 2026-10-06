"use client";

import React, { useEffect, useState } from "react";
import { useSellerAuth } from "../SellerAuthContext";
import {
  Wallet,
  Clock,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
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
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEarnings = async (page = 1, status = "ALL") => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const url =
        status && status !== "ALL"
          ? `/api/v1/seller/earnings?page=${page}&limit=20&status=${status}`
          : `/api/v1/seller/earnings?page=${page}&limit=20`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load financial records");
      }
      setEarnings(data.data.earnings || []);
      setSummary(data.data.summary || null);
      setPagination(data.data.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Cleared / Available
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 text-amber-400" />
            Pending Escrow
          </span>
        );
      case "PAID_OUT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-sky-500/15 text-sky-400 border border-sky-500/20">
            <CheckCircle2 className="w-3 h-3 text-sky-400" />
            Paid Out
          </span>
        );
      case "REFUNDED_DEDUCTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/15 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            Refund Deducted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-velvet-plum text-velvet-cream-muted border border-velvet-border">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-velvet-border/80">
        <div>
          <h1 className="text-3xl font-serif font-normal text-velvet-cream-soft tracking-tight">
            Financial Ledger & Settlement
          </h1>
          <p className="text-velvet-cream-muted text-xs mt-1">
            Authoritative creator financial settlement records, commission fees, and escrow maturation balances.
          </p>
        </div>
        <button
          onClick={() => fetchEarnings(pagination.page, statusFilter)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-velvet-cream bg-velvet-mocha border border-velvet-border rounded-xl hover:border-velvet-cream/40 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Ledger
        </button>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Sales */}
        <div className="bg-velvet-mocha p-5 rounded-2xl border border-velvet-border/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-velvet-cream-muted uppercase tracking-wider">
              Gross Volume
            </span>
            <div className="p-2 bg-velvet-plum text-velvet-cream rounded-xl border border-velvet-border">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-serif text-velvet-cream-soft">
            {summary ? formatRupee(summary.totalRevenuePaise) : "₹0.00"}
          </div>
          <p className="text-[11px] text-velvet-cream-muted mt-1">Lifetime gross marketplace volume</p>
        </div>

        {/* Net Earnings */}
        <div className="bg-velvet-mocha p-5 rounded-2xl border border-velvet-border/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-velvet-cream-muted uppercase tracking-wider">
              Net Earnings
            </span>
            <div className="p-2 bg-velvet-plum text-emerald-400 rounded-xl border border-velvet-border">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-serif text-emerald-400">
            {summary ? formatRupee(summary.netEarningsPaise) : "₹0.00"}
          </div>
          <p className="text-[11px] text-velvet-cream-muted mt-1">After 10% platform commission</p>
        </div>

        {/* Cleared / Available Balance */}
        <div className="bg-velvet-mocha p-5 rounded-2xl border border-velvet-border/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-velvet-cream-muted uppercase tracking-wider">
              Available Balance
            </span>
            <div className="p-2 bg-velvet-plum text-velvet-cream rounded-xl border border-velvet-border">
              <CheckCircle2 className="w-4 h-4 text-velvet-cream" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-serif text-velvet-cream">
            {summary ? formatRupee(summary.availableBalancePaise) : "₹0.00"}
          </div>
          <p className="text-[11px] text-velvet-cream font-medium mt-1">Cleared & ready for transfer</p>
        </div>

        {/* Pending Escrow */}
        <div className="bg-velvet-mocha p-5 rounded-2xl border border-velvet-border/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-velvet-cream-muted uppercase tracking-wider">
              Pending Escrow
            </span>
            <div className="p-2 bg-velvet-plum text-amber-400 rounded-xl border border-velvet-border">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-serif text-amber-400">
            {summary ? formatRupee(summary.pendingBalancePaise) : "₹0.00"}
          </div>
          <p className="text-[11px] text-amber-400/80 font-medium mt-1">Clears post return-window</p>
        </div>
      </div>

      {/* Accounting Notice */}
      <div className="p-4 bg-velvet-mocha border border-velvet-border/80 rounded-2xl text-xs text-velvet-cream-muted flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-velvet-rose shrink-0 mt-0.5" />
        <div>
          <p className="font-serif font-medium text-velvet-cream-soft">Double-Entry Ledger Integrity</p>
          <p className="mt-0.5 text-velvet-cream-muted">
            All balances and commissions are computed server-side in integer paise to avoid precision discrepancies. Funds transition from <span className="font-medium text-amber-400">Pending</span> to <span className="font-medium text-emerald-400">Available</span> upon escrow maturation.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-velvet-mocha border border-velvet-border/80 overflow-x-auto">
        {[
          { label: "All Records", val: "ALL" },
          { label: "Available (Cleared)", val: "AVAILABLE" },
          { label: "Pending Escrow", val: "PENDING" },
          { label: "Paid Out", val: "PAID_OUT" },
        ].map((tab) => (
          <button
            key={tab.val}
            onClick={() => setStatusFilter(tab.val)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
              statusFilter === tab.val
                ? "bg-velvet-rose text-white shadow-sm"
                : "text-velvet-cream-muted hover:text-velvet-cream-soft hover:bg-velvet-plum/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Ledger Table */}
      <div className="bg-velvet-mocha rounded-2xl border border-velvet-border/80 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-950/40 border-b border-rose-900/50 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-velvet-cream-muted">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-velvet-rose" />
            <p className="text-xs font-medium">Loading ledger entries...</p>
          </div>
        ) : earnings.length === 0 ? (
          <div className="py-20 text-center text-velvet-cream-muted">
            <Wallet className="w-12 h-12 text-velvet-cream-muted/40 mx-auto mb-3" />
            <h3 className="font-serif text-base text-velvet-cream-soft">No Ledger Entries Found</h3>
            <p className="text-xs text-velvet-cream-muted mt-1 max-w-sm mx-auto">
              Ledger entries are created automatically when sales are processed and settled.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-velvet-plum/60 border-b border-velvet-border/80 text-[10px] font-medium text-velvet-cream-muted uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Order</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Gross Sale</th>
                  <th className="py-3 px-4">Platform Fee</th>
                  <th className="py-3 px-4 text-emerald-400">Net Earning</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Available On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-velvet-border/50 text-xs">
                {earnings.map((entry) => (
                  <tr key={entry.id} className="hover:bg-velvet-plum/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs text-velvet-cream-muted whitespace-nowrap">
                      <div className="font-medium text-velvet-cream-soft">
                        #{entry.orderId.slice(-8).toUpperCase()}
                      </div>
                      <div className="text-[10px] text-velvet-cream-muted/70 mt-0.5 font-sans">
                        {formatDate(entry.saleDate || entry.createdAt)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-serif font-medium text-velvet-cream-soft truncate">
                        {entry.productTitle || "Digital Product"}
                      </div>
                      <div className="text-[10px] text-velvet-cream-muted">
                        License: {entry.licenseType || "Standard"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-velvet-cream-soft whitespace-nowrap">
                      {formatRupee(entry.grossAmountPaise)}
                    </td>
                    <td className="py-3.5 px-4 text-velvet-cream-muted text-xs whitespace-nowrap font-mono">
                      -{formatRupee(entry.platformFeePaise)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-emerald-400 whitespace-nowrap">
                      {formatRupee(entry.netEarningsPaise)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(entry.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-xs text-velvet-cream-muted whitespace-nowrap font-mono">
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
          <div className="p-4 border-t border-velvet-border/80 flex items-center justify-between bg-velvet-plum/40">
            <span className="text-xs text-velvet-cream-muted">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchEarnings(pagination.page - 1, statusFilter)}
                disabled={pagination.page <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-velvet-plum border border-velvet-border rounded-xl text-velvet-cream hover:border-velvet-cream/40 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={() => fetchEarnings(pagination.page + 1, statusFilter)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-velvet-plum border border-velvet-border rounded-xl text-velvet-cream hover:border-velvet-cream/40 disabled:opacity-40 transition-colors"
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
