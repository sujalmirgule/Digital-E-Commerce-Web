"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useDashboardAuth } from "../DashboardAuthContext";
import { BuyerReceiptDTO } from "@/lib/services/buyer-dashboard";

export default function BuyerReceiptsPage() {
  const { token, fetchWithAuth } = useDashboardAuth();
  const [receipts, setReceipts] = useState<BuyerReceiptDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Official Tax Receipts</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Download verified payment receipts and tax invoices generated for all your completed orders.
          </p>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse"></div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-200 text-sm">
          <span>⚠️ {error}</span>
          <button onClick={loadReceipts} className="ml-3 underline hover:text-white">
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && receipts.length === 0 && (
        <div className="py-16 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8">
          <div className="text-4xl mb-3">🧾</div>
          <h3 className="font-bold text-base text-white">No receipts issued yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            Receipts are automatically generated when an order payment is captured and verified.
          </p>
          <Link
            href="/test/catalog"
            className="inline-flex px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Explore Catalog
          </Link>
        </div>
      )}

      {/* Receipts Table */}
      {!loading && receipts.length > 0 && (
        <div className="space-y-3">
          {receipts.map((rec) => (
            <div
              key={rec.id}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-white text-sm">
                    {rec.invoiceNumber}
                  </span>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    PAID
                  </span>
                </div>

                <div className="text-xs text-slate-300">
                  Order: <span className="font-mono text-slate-400">{rec.orderId}</span> ·{" "}
                  {rec.items.map((i) => i.productTitle).join(", ")}
                </div>

                <div className="text-[11px] text-slate-400">
                  Issued on {new Date(rec.issuedAt).toLocaleDateString()} · Method: {rec.paymentMethod}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[11px] text-slate-400">Amount Paid</div>
                  <div className="text-base font-extrabold text-white">
                    ₹{(rec.amountPaidPaise / 100).toFixed(2)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={rec.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <span>📄</span> Download PDF
                  </a>
                  <Link
                    href={`/dashboard/orders/${rec.orderId}`}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    Order Details
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
