"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  Eye,
  Sliders,
  X,
  CreditCard,
  User,
  Package,
} from "lucide-react";

interface ReceiptItem {
  id: string;
  receiptNumber: string;
  invoiceNumber: string;
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  productTitle: string;
  amountPaidPaise: number;
  amountPaidFormatted: string;
  currency: string;
  paymentMethod: string;
  paymentId: string;
  templateVersion: number;
  issuedAt: string;
  createdAt: string;
  generatedDate: string;
  receiptStatus: string;
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

  // Regeneration Confirmation Modal
  const [regenModalOpen, setRegenModalOpen] = useState(false);
  const [targetReceipt, setTargetReceipt] = useState<ReceiptItem | null>(null);

  // View Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptItem | null>(null);

  const fetchReceipts = useCallback(
    async (p = page, q = search) => {
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
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    [token, page, search]
  );

  useEffect(() => {
    if (token) {
      fetchReceipts(1, search);
    }
  }, [token, fetchReceipts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReceipts(1, search);
  };

  const handleOpenRegenModal = (r: ReceiptItem) => {
    setTargetReceipt(r);
    setRegenModalOpen(true);
  };

  const handleConfirmRegenerate = async () => {
    if (!token || !targetReceipt) return;
    try {
      setRegeneratingId(targetReceipt.id);
      setError(null);
      setSuccess(null);
      setRegenModalOpen(false);

      const res = await fetch(`/api/v1/admin/receipts/${targetReceipt.id}/regenerate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to regenerate receipt");
      }
      setSuccess(
        `Receipt '${targetReceipt.invoiceNumber}' regenerated successfully using latest template version!`
      );
      fetchReceipts(page, search);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to regenerate receipt");
    } finally {
      setRegeneratingId(null);
      setTargetReceipt(null);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3B261C]/20 dark:border-stone-800">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-[#151311] dark:text-[#FAF7F2]">
            Receipt & Invoicing Register
          </h1>
          <p className="text-xs text-[#8A6048] dark:text-[#C8AA91] mt-1">
            Authoritative financial receipt records, cryptographic audit trails, and versioned PDF regeneration.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/settings/receipt"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-[#FAF7F2] dark:bg-stone-800 hover:bg-stone-100 text-[#3B261C] dark:text-[#FAF7F2] border border-[#C8AA91]/60 dark:border-stone-700 rounded-xl transition shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5 text-[#A94432]" />
            Template Settings
          </Link>
          <button
            onClick={() => fetchReceipts(page, search)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white dark:bg-[#211D1A] hover:bg-stone-50 text-[#3B261C] dark:text-[#FAF7F2] border border-[#C8AA91]/60 dark:border-stone-700 rounded-xl transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-900/50 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-900/50 rounded-2xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
        <div className="relative max-w-md w-full">
          <Search className="w-3.5 h-3.5 text-[#8A6048] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice number, buyer, order ID, product..."
            className="w-full text-xs pl-8 pr-3 py-2 bg-white dark:bg-[#211D1A] border border-stone-300 dark:border-stone-700 rounded-xl text-[#151311] dark:text-[#FAF7F2] placeholder-[#8A6048]/60 focus:outline-none focus:border-[#3B261C]"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-[#3B261C] hover:bg-[#684332] text-[#FAF7F2] rounded-xl text-xs font-semibold transition shadow-sm"
        >
          Search
        </button>
      </form>

      {/* Receipts Table */}
      <div className="bg-white dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-[#8A6048]">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#A94432]" />
            <p className="text-xs font-medium">Loading receipts register...</p>
          </div>
        ) : receipts.length === 0 ? (
          <div className="py-16 text-center text-[#8A6048]">
            <FileText className="w-12 h-12 text-[#8A6048]/40 mx-auto mb-3" />
            <h3 className="font-serif text-base font-bold text-[#151311] dark:text-[#FAF7F2]">No Receipts Found</h3>
            <p className="text-xs text-[#8A6048] mt-1">
              Receipts are generated automatically upon order payment capture.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 text-[10px] font-bold text-[#8A6048] uppercase tracking-wider">
                  <th className="py-3 px-3.5">Receipt / Invoice</th>
                  <th className="py-3 px-3.5">Order ID</th>
                  <th className="py-3 px-3.5">Buyer</th>
                  <th className="py-3 px-3.5">Product</th>
                  <th className="py-3 px-3.5">Amount</th>
                  <th className="py-3 px-3.5">Method</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Generated Date</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors">
                    <td className="py-3.5 px-3.5 font-mono font-bold text-[#151311] dark:text-[#FAF7F2] whitespace-nowrap">
                      <button
                        onClick={() => setSelectedReceipt(r)}
                        className="hover:text-[#A94432] hover:underline transition text-left"
                      >
                        {r.invoiceNumber}
                      </button>
                    </td>
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <Link
                        href={`/admin/orders?search=${r.orderId}`}
                        className="font-mono text-[#A94432] hover:underline inline-flex items-center gap-1"
                      >
                        #{r.orderId.slice(-8).toUpperCase()}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </td>
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <div className="text-[#151311] dark:text-[#FAF7F2] font-semibold">{r.buyerName}</div>
                      <div className="text-[10px] text-[#8A6048]">{r.buyerEmail}</div>
                    </td>
                    <td className="py-3.5 px-3.5 max-w-[160px] truncate font-medium text-[#151311] dark:text-[#FAF7F2]">
                      {r.productTitle}
                    </td>
                    <td className="py-3.5 px-3.5 whitespace-nowrap font-mono font-bold text-[#151311] dark:text-[#FAF7F2]">
                      {r.amountPaidFormatted}
                    </td>
                    <td className="py-3.5 px-3.5 whitespace-nowrap text-[#684332] dark:text-[#C8AA91]">
                      <span className="uppercase text-[10px] px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 font-semibold border border-stone-200 dark:border-stone-700">
                        {r.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Generated
                      </span>
                    </td>
                    <td className="py-3.5 px-3.5 whitespace-nowrap text-[#8A6048] text-[11px] font-mono">
                      {formatDate(r.issuedAt || r.createdAt)}
                    </td>
                    <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedReceipt(r)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-[#3B261C] dark:text-[#FAF7F2] border border-stone-200 dark:border-stone-700 rounded-lg transition inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-[#A94432]" />
                          View
                        </button>
                        <a
                          href={r.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 text-[11px] font-semibold bg-[#3B261C] hover:bg-[#684332] text-[#FAF7F2] rounded-lg transition inline-flex items-center gap-1 shadow-sm"
                        >
                          <Download className="w-3 h-3 text-[#F2E7DB]" />
                          PDF
                        </a>
                        <button
                          onClick={() => handleOpenRegenModal(r)}
                          disabled={regeneratingId === r.id}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg transition inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <RotateCw
                            className={`w-3 h-3 ${
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
          <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-[#8A6048] bg-stone-50 dark:bg-stone-900">
            <span>
              Page {page} of {totalPages} ({totalCount} total receipts)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchReceipts(page - 1, search)}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 disabled:opacity-40 text-[#151311] dark:text-[#FAF7F2] border border-stone-200 dark:border-stone-700 font-semibold"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                onClick={() => fetchReceipts(page + 1, search)}
                disabled={page >= totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 disabled:opacity-40 text-[#151311] dark:text-[#FAF7F2] border border-stone-200 dark:border-stone-700 font-semibold"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Regeneration Confirmation Modal */}
      {regenModalOpen && targetReceipt && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#211D1A] border border-stone-300 dark:border-stone-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <RotateCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-[#151311] dark:text-[#FAF7F2]">
                  Regenerate Receipt PDF?
                </h3>
                <p className="text-xs text-[#8A6048] dark:text-[#C8AA91] mt-0.5">
                  Invoice #{targetReceipt.invoiceNumber}
                </p>
              </div>
            </div>

            <div className="bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl p-3 text-xs text-[#684332] dark:text-[#C8AA91] leading-relaxed">
              This will re-render a fresh PDF document applying the current active receipt template branding (logo, layout, colors). Historical financial amounts, invoice numbers, and payment references will remain permanently locked and preserved in audit records.
            </div>

            <div className="flex justify-end items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRegenModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#8A6048] hover:text-[#151311] dark:hover:text-[#FAF7F2] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRegenerate}
                className="px-4 py-2 text-xs font-semibold bg-[#A94432] hover:bg-[#8A3626] text-white rounded-xl shadow-sm transition"
              >
                Confirm Regeneration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Receipt Details Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#211D1A] border border-stone-300 dark:border-stone-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#A94432]" />
                <h3 className="font-serif font-bold text-base text-[#151311] dark:text-[#FAF7F2]">
                  Tax Invoice Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1 rounded-lg text-[#8A6048] hover:text-[#151311] dark:hover:text-[#FAF7F2]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-[#8A6048] uppercase block">Invoice Number</span>
                  <span className="font-mono font-bold text-sm text-[#151311] dark:text-[#FAF7F2]">
                    {selectedReceipt.invoiceNumber}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#8A6048] uppercase block">Total Settled</span>
                  <span className="font-mono font-bold text-sm text-[#151311] dark:text-[#FAF7F2]">
                    {selectedReceipt.amountPaidFormatted}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-stone-700 dark:text-stone-300">
                <div className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] text-[#8A6048] block">Customer</span>
                  <div className="font-semibold text-[#151311] dark:text-[#FAF7F2]">{selectedReceipt.buyerName}</div>
                  <div className="text-[10px] text-[#8A6048]">{selectedReceipt.buyerEmail}</div>
                </div>
                <div className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] text-[#8A6048] block">Associated Order</span>
                  <div className="font-mono text-[#A94432]">#{selectedReceipt.orderId.slice(-8).toUpperCase()}</div>
                  <div className="text-[10px] text-[#8A6048]">{selectedReceipt.paymentMethod}</div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800">
                <span className="text-[10px] text-[#8A6048] block">Purchased Deliverable</span>
                <div className="font-semibold text-[#151311] dark:text-[#FAF7F2]">{selectedReceipt.productTitle}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-[#8A6048]">
                <div>Template Version: <span className="font-mono font-bold text-[#151311] dark:text-[#FAF7F2]">v{selectedReceipt.templateVersion}</span></div>
                <div className="text-right">Issued On: <span className="font-mono">{formatDate(selectedReceipt.issuedAt)}</span></div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-stone-200 dark:border-stone-800">
              <a
                href={selectedReceipt.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 text-xs font-semibold bg-[#3B261C] hover:bg-[#684332] text-[#FAF7F2] rounded-xl shadow-sm transition inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </a>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 text-xs font-semibold text-[#8A6048] hover:text-[#151311] dark:hover:text-[#FAF7F2]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
