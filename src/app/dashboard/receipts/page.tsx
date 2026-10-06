"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useDashboardAuth } from "../DashboardAuthContext";
import { BuyerReceiptDTO } from "@/lib/services/buyer-dashboard";
import { Receipt, Download, ExternalLink, Search, AlertCircle } from "lucide-react";

export default function BuyerReceiptsPage() {
  const { token, fetchWithAuth } = useDashboardAuth();
  const [receipts, setReceipts] = useState<BuyerReceiptDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadReceipts = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithAuth("/api/v1/buyer/receipts");
      const json = await res.json();

      if (res.ok && json.data?.receipts) {
        setReceipts(json.data.receipts);
      } else {
        setError(json.error?.message || "Failed to load receipts");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [token, fetchWithAuth]);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  const handleDownloadPdf = (downloadUrl: string) => {
    const url = token ? `${downloadUrl}?token=${encodeURIComponent(token)}` : downloadUrl;
    window.open(url, "_blank");
  };

  const filteredReceipts = receipts.filter(
    (r) =>
      r.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.items.some((i) => i.productTitle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3A2930]">
        <div>
          <h1 className="text-3xl font-serif font-normal text-[#F7EFE2] tracking-tight">
            Official Tax Receipts
          </h1>
          <p className="text-[#BBAE9F] text-xs mt-1">
            Download verified payment receipts and tax invoices generated for all your completed orders.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#BBAE9F]" />
          <input
            type="text"
            placeholder="Search invoice or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl bg-[#211815] border border-[#3A2930] text-[#F7EFE2] placeholder-[#BBAE9F]/50 focus:outline-none focus:border-[#E8D5B5] transition-all font-light"
          />
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-[#211815] border border-[#3A2930] rounded-2xl p-4"></div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-[#211815] border border-rose-900/50 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadReceipts}
            className="px-3 py-1 rounded-lg bg-[#F43F5E] text-white text-xs font-medium hover:bg-[#F43F5E]/90"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredReceipts.length === 0 && (
        <div className="py-20 text-center bg-[#211815]/40 border border-[#3A2930] rounded-3xl p-8 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-[#120A12] border border-[#3A2930] flex items-center justify-center text-xl mx-auto mb-3">
            <Receipt className="w-5 h-5 text-[#BBAE9F]" />
          </div>
          <h3 className="font-serif text-base text-[#F7EFE2]">
            {searchQuery ? "No matching receipts" : "No receipts issued yet"}
          </h3>
          <p className="text-xs text-[#BBAE9F] max-w-sm mx-auto mt-1 mb-6">
            {searchQuery
              ? `No receipts matched query "${searchQuery}".`
              : "Tax receipts are automatically generated when an order payment is captured and verified."}
          </p>
          {!searchQuery && (
            <Link
              href="/products"
              className="inline-flex px-5 py-2.5 rounded-full bg-[#F43F5E] hover:bg-[#F43F5E]/90 text-white text-xs font-semibold shadow-md transition-colors"
            >
              Explore Products →
            </Link>
          )}
        </div>
      )}

      {/* Receipts Table */}
      {!loading && filteredReceipts.length > 0 && (
        <div className="space-y-3">
          {filteredReceipts.map((rec) => (
            <div
              key={rec.id}
              className="p-5 rounded-2xl bg-[#211815] border border-[#3A2930] hover:border-[#E8D5B5]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-sm"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-medium text-[#F7EFE2] text-sm">
                    {rec.invoiceNumber}
                  </span>
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 font-mono">
                    PAID
                  </span>
                </div>

                <div className="text-xs text-[#BBAE9F]">
                  Order: <span className="font-mono text-[#E8D5B5]">{rec.orderId}</span> ·{" "}
                  {rec.items.map((i) => i.productTitle).join(", ")}
                </div>

                <div className="text-[11px] text-[#BBAE9F]/70 font-mono">
                  Issued on {new Date(rec.issuedAt).toLocaleDateString()} · Method: {rec.paymentMethod}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-[#BBAE9F]/70">Amount Paid</div>
                  <div className="text-base font-medium text-[#F7EFE2]">
                    ₹{(rec.amountPaidPaise / 100).toFixed(2)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadPdf(rec.downloadUrl)}
                    className="px-3.5 py-2 rounded-xl bg-[#F43F5E] hover:bg-[#F43F5E]/90 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF Receipt</span>
                  </button>
                  <Link
                    href={`/dashboard/orders/${rec.orderId}`}
                    className="px-3 py-2 rounded-xl bg-[#120A12] hover:bg-[#120A12]/80 text-[#E8D5B5] border border-[#3A2930] text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <span>Order</span>
                    <ExternalLink className="w-3 h-3 text-[#BBAE9F]" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
