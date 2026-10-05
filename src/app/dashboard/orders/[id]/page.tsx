"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useDashboardAuth } from "../../DashboardAuthContext";
import { BuyerOrderDTO } from "@/lib/services/buyer-dashboard";

export default function BuyerOrderDetailPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const { token, fetchWithAuth } = useDashboardAuth();

  const [order, setOrder] = useState<BuyerOrderDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrderDetail = useCallback(async () => {
    if (!token || !orderId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithAuth(`/api/v1/buyer/orders/${orderId}`);
      const json = await res.json();

      if (res.ok && json.data) {
        setOrder(json.data);
      } else {
        setError(json.error?.message || "Failed to load order details");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [token, orderId, fetchWithAuth]);

  useEffect(() => {
    loadOrderDetail();
  }, [loadOrderDetail]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-slate-800 rounded w-1/4 animate-pulse"></div>
        <div className="h-48 bg-slate-900 border border-slate-800 rounded-xl animate-pulse"></div>
        <div className="h-64 bg-slate-900 border border-slate-800 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
        <div className="text-3xl">⚠️</div>
        <h2 className="text-lg font-bold text-white">Unable to Display Order</h2>
        <p className="text-sm text-red-400 max-w-md mx-auto">{error}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard/orders"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            ← Back to Orders
          </Link>
          <button
            onClick={loadOrderDetail}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top breadcrumb & actions */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <Link
          href="/dashboard/orders"
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 font-medium transition-colors"
        >
          <span>←</span> Back to Order History
        </Link>

        <div className="flex items-center gap-2">
          {order.receipt && (
            <a
              href={order.receipt.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>🧾</span> Download PDF Receipt
            </a>
          )}
          <Link
            href="/dashboard/support"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Need Help?
          </Link>
        </div>
      </div>

      {/* Order Summary Header Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-400">Order Reference</div>
            <div className="text-xl font-mono font-extrabold text-white">{order.id}</div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                order.status === "PAID"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : order.status === "PENDING"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}
            >
              Status: {order.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80 text-xs">
          <div>
            <div className="text-slate-400">Date Placed</div>
            <div className="font-semibold text-slate-200 mt-0.5">
              {new Date(order.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div className="text-slate-400">Payment Completed</div>
            <div className="font-semibold text-slate-200 mt-0.5">
              {order.paidAt ? new Date(order.paidAt).toLocaleDateString() : "Pending"}
            </div>
          </div>
          <div>
            <div className="text-slate-400">Payment Method</div>
            <div className="font-semibold text-slate-200 mt-0.5">
              {order.payment?.method || "Razorpay Gateway"}
            </div>
          </div>
          <div>
            <div className="text-slate-400">Transaction ID</div>
            <div className="font-semibold font-mono text-slate-200 mt-0.5 truncate">
              {order.payment?.razorpayPaymentId || "N/A"}
            </div>
          </div>
        </div>
      </div>

      {/* Itemized Order Breakdown */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="font-bold text-white text-base">Purchased Digital Items</h2>

        <div className="divide-y divide-slate-800">
          {order.items.map((item) => (
            <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="font-bold text-white text-sm">{item.productTitle}</div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>Seller: <strong className="text-slate-300">{item.sellerStoreName}</strong></span>
                  <span>·</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                    {item.licenseType} LICENSE
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-bold text-white text-sm">
                    ₹{(item.pricePaise / 100).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-emerald-400">1x Digital Copy</div>
                </div>

                {item.productFileId && (
                  <a
                    href={`/api/v1/buyer/downloads/${item.productFileId}/url`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                  >
                    Download
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Financial Calculation Summary */}
        <div className="pt-4 border-t border-slate-800 space-y-2 text-xs text-slate-400">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span className="text-slate-200">₹{(order.subtotalPaise / 100).toFixed(2)}</span>
          </div>
          {order.discountPaise > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Promotional Discount:</span>
              <span>-₹{(order.discountPaise / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm text-white pt-2 border-t border-slate-800">
            <span>Total Paid (INR):</span>
            <span className="text-indigo-400">₹{(order.totalAmountPaise / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
