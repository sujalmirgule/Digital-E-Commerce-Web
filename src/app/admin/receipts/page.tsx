"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminAuth } from "../AdminAuthContext";
import {
  FileText,
  Download,
  RotateCw,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface ReceiptItem {
  id: string;
  receiptNumber: string;
  invoiceNumber: string;
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  amountPaidPaise: number;
  amountPaidFormatted: string;
  currency: string;
  paymentMethod: string;
  templateVersion: number;
  createdAt: string;
  downloadUrl: string;
}

export default function AdminReceiptsPage() {
  const { token } = useAdminAuth();
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchReceipts = async (p = page, q = search) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", p.toString());
      params.set("limit", "15");
      if (q.trim()) params.set("search", q.trim());

      const res = await fetch(`/api/v1/admin/receipts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load receipts register");
      }
      setReceipts(data.data.receipts || []);
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
      fetchReceipts(1, search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReceipts(1, search);
  };

  const handleRegenerate = async (receiptId: string, invoiceNumber: string) => {
    if (!token) return;
    try {
      setRegeneratingId(receiptId);
      setError(null);
      setSuccess(null);
      const res = await fetch(`/api/v1/admin/receipts/${receiptId}/regenerate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to regenerate receipt");
      }
      setSuccess(`Receipt '${invoiceNumber}' has been regenerated successfully!`);
      fetchReceipts(page, search);
    } catch (err: any) {
      setError(err.message || "Failed to regenerate receipt");
    } finally {
      setRegeneratingId(null);
    }
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
          <h1 className="text-2xl font-bold tracking-tight text-white">Receipt & Invoicing Register</h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative financial receipt records, PDF regeneration, and tax compliance audit.
          </p>
        </div>
        <button
          onClick={() => fetchReceipts(page, search)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
        <div className="relative max-w-md w-full">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice number, buyer name, order ID..."
            className="w-full text-xs pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
        <button
          type="submit"
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
        >
          Search
        </button>
      </form>

      {/* Receipts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-rose-500" />
            <p className="text-xs font-medium">Loading receipts register...</p>
          </div>
        ) : receipts.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">No Receipts Found</h3>
            <p className="text-xs text-slate-500 mt-1">Receipts are generated automatically upon order payment capture.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice Number</th>
                  <th className="py-3 px-4">Order Ref</th>
                  <th className="py-3 px-4">Buyer Customer</th>
                  <th className="py-3 px-4">Amount Paid</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Issued On</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-white whitespace-nowrap">
                      {r.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Link
                        href={`/admin/orders?search=${r.orderId}`}
                        className="font-mono text-rose-400 hover:underline inline-flex items-center gap-1"
                      >
                        #{r.orderId.slice(-8).toUpperCase()}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-slate-200 font-medium">{r.buyerName}</div>
                      <div className="text-[11px] text-slate-400">{r.buyerEmail}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-white">
                      {r.amountPaidFormatted}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                      <span className="uppercase text-[11px] px-2 py-0.5 rounded bg-slate-800 font-semibold">
                        {r.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 text-[11px] font-mono">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <a
                          href={r.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition inline-flex items-center gap-1"
                        >
                          <Download className="w-3 h-3 text-rose-400" />
                          PDF
                        </a>
                        <button
                          onClick={() => handleRegenerate(r.id, r.invoiceNumber)}
                          disabled={regeneratingId === r.id}
                          className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <RotateCw
                            className={`w-3 h-3 text-amber-400 ${
                              regeneratingId === r.id ? "animate-spin" : ""
                            }`}
                          />
                          Regen
                        </button>
                      </div>
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
              Page {page} of {totalPages} ({totalCount} total receipts)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchReceipts(page - 1, search)}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                onClick={() => fetchReceipts(page + 1, search)}
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
