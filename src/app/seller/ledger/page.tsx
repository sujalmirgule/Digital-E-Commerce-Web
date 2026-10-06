"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSellerAuth } from "../SellerAuthContext";
import {
  Receipt,
  ShieldCheck,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

interface LedgerEntry {
  id: string;
  orderId: string;
  orderItemId: string;
  productTitle: string | null;
  grossAmountPaise: number;
  platformFeePaise: number;
  netEarningsPaise: number;
  status: "PENDING" | "AVAILABLE" | "PAID_OUT" | "REFUNDED_DEDUCTED";
  availableOn: string;
  createdAt: string;
}

interface LedgerSummary {
  periodGrossPaise: number;
  periodPlatformFeePaise: number;
  periodNetEarningsPaise: number;
  totalRevenuePaise: number;
  netEarningsPaise: number;
  availableBalancePaise: number;
  pendingBalancePaise: number;
}

export default function SellerLedgerPage() {
  const { token, fetchWithAuth } = useSellerAuth();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLedger = useCallback(
    async (page = 1, status = "") => {
      if (!token) return;
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", "20");
        if (status) params.set("status", status);

        const res = await fetchWithAuth(`/api/v1/seller/earnings?${params.toString()}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error?.message || "Failed to load seller ledger");
        }

        setEntries(data.data.earnings || []);
        setSummary(data.data.summary || null);
        setPagination(data.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    [token, fetchWithAuth]
  );

  useEffect(() => {
    loadLedger(1, statusFilter);
  }, [loadLedger, statusFilter]);

  const formatRupee = (paise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(paise / 100);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-velvet-border/80">
        <div>
          <h1 className="text-3xl font-serif font-normal text-velvet-cream-soft tracking-tight">
            Platform Accounting Ledger
          </h1>
          <p className="text-velvet-cream-muted text-xs mt-1">
            Itemized double-entry ledger entries for every transaction, fee split, and cleared payout balance.
          </p>
        </div>
        <button
          onClick={() => loadLedger(pagination.page, statusFilter)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-velvet-cream bg-velvet-mocha border border-velvet-border rounded-xl hover:border-velvet-cream/40 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Ledger
        </button>
      </div>

      {/* Security & Financial Invariant Notice */}
      <div className="flex items-start gap-3 p-4 bg-velvet-mocha border border-velvet-border/80 rounded-2xl text-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-serif font-medium text-velvet-cream-soft">Immutable Double-Entry Ledger</p>
          <p className="text-velvet-cream-muted mt-0.5 font-light">
            All accounting entries strictly follow: <strong className="text-velvet-cream font-mono">Gross = Platform Fee + Net Earnings</strong>. Ledgers are append-only and cannot be manually manipulated.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-velvet-mocha border border-velvet-border/80">
            <span className="text-xs font-mono uppercase text-velvet-cream-muted block">Gross Volume</span>
            <span className="text-2xl font-serif text-velvet-cream-soft mt-1 block">
              {formatRupee(summary.totalRevenuePaise)}
            </span>
          </div>
          <div className="p-5 rounded-2xl bg-velvet-mocha border border-velvet-border/80">
            <span className="text-xs font-mono uppercase text-velvet-cream-muted block">Platform Commission</span>
            <span className="text-2xl font-serif text-velvet-cream-muted mt-1 block">
              {formatRupee(summary.totalRevenuePaise - summary.netEarningsPaise)}
            </span>
          </div>
          <div className="p-5 rounded-2xl bg-velvet-mocha border border-velvet-border/80">
            <span className="text-xs font-mono uppercase text-velvet-cream-muted block">Available Balance</span>
            <span className="text-2xl font-serif text-emerald-400 mt-1 block">
              {formatRupee(summary.availableBalancePaise)}
            </span>
          </div>
          <div className="p-5 rounded-2xl bg-velvet-mocha border border-velvet-border/80">
            <span className="text-xs font-mono uppercase text-velvet-cream-muted block">Pending Escrow</span>
            <span className="text-2xl font-serif text-amber-400 mt-1 block">
              {formatRupee(summary.pendingBalancePaise)}
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-velvet-cream-muted flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filter:
        </span>
        {["", "AVAILABLE", "PENDING", "PAID_OUT"].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              statusFilter === st
                ? "bg-velvet-rose text-white"
                : "bg-velvet-mocha border border-velvet-border text-velvet-cream-muted hover:text-velvet-cream"
            }`}
          >
            {st === "" ? "All Entries" : st}
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
            <p className="text-xs font-mono">Loading ledger journal...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="py-20 text-center text-velvet-cream-muted space-y-2">
            <Receipt className="w-12 h-12 text-velvet-cream-muted/40 mx-auto" />
            <h3 className="font-serif text-base text-velvet-cream-soft">No Ledger Entries Found</h3>
            <p className="text-xs text-velvet-cream-muted max-w-sm mx-auto">
              Completed purchase transactions will generate itemized double-entry journal items automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-velvet-border/60 text-velvet-cream-muted uppercase text-[10px] tracking-wider font-mono">
                  <th className="py-3 px-4 font-medium">Order ID</th>
                  <th className="py-3 px-4 font-medium">Product Item</th>
                  <th className="py-3 px-4 font-medium">Gross</th>
                  <th className="py-3 px-4 font-medium">Fee (10%)</th>
                  <th className="py-3 px-4 font-medium">Net Payout</th>
                  <th className="py-3 px-4 font-medium">Settlement Status</th>
                  <th className="py-3 px-4 font-medium">Settled / Available</th>
                  <th className="py-3 px-4 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-velvet-border/50 text-velvet-cream-soft">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-velvet-plum/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-velvet-cream">
                      #{entry.orderId.substring(0, 10)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-velvet-cream-soft">
                      {entry.productTitle || "Digital Product"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-velvet-cream-muted">
                      {formatRupee(entry.grossAmountPaise)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-velvet-cream-muted/80">
                      -{formatRupee(entry.platformFeePaise)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-emerald-400">
                      {formatRupee(entry.netEarningsPaise)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                          entry.status === "AVAILABLE"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : entry.status === "PENDING"
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                            : "bg-sky-500/15 text-sky-400 border border-sky-500/20"
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-velvet-cream-muted font-mono">
                      {entry.availableOn ? new Date(entry.availableOn).toLocaleDateString() : "Immediate"}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-velvet-cream-muted font-mono">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-velvet-border/60 flex items-center justify-between text-xs">
            <span className="text-velvet-cream-muted font-mono text-[11px]">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadLedger(pagination.page - 1, statusFilter)}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg bg-velvet-plum border border-velvet-border text-velvet-cream disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => loadLedger(pagination.page + 1, statusFilter)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 rounded-lg bg-velvet-plum border border-velvet-border text-velvet-cream disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
