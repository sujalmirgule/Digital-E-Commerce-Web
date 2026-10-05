"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useDashboardAuth } from "../DashboardAuthContext";
import { BuyerOrderDTO } from "@/lib/services/buyer-dashboard";

export default function BuyerOrdersPage() {
  const { token, fetchWithAuth } = useDashboardAuth();
  const [orders, setOrders] = useState<BuyerOrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const loadOrders = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const url = statusFilter
        ? `/api/v1/buyer/orders?status=${statusFilter}`
        : "/api/v1/buyer/orders";
      const res = await fetchWithAuth(url);
      const json = await res.json();

      if (res.ok && json.data?.orders) {
        setOrders(json.data.orders);
      } else {
        setError(json.error?.message || "Failed to load orders");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, fetchWithAuth]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Order History</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            View all your past and pending digital purchases, transactions, and tax invoices.
          </p>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
          {["", "PAID", "PENDING", "CANCELLED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === status
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {status || "All Orders"}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse"></div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-200 text-sm">
          <span>⚠️ {error}</span>
          <button onClick={loadOrders} className="ml-3 underline hover:text-white">
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && orders.length === 0 && (
        <div className="py-16 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8">
          <div className="text-4xl mb-3">📦</div>
          <h3 className="font-bold text-base text-white">No orders found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            {statusFilter
              ? `You have no orders with status "${statusFilter}".`
              : "You haven't placed any orders yet. Discover high-quality digital products in our catalog."}
          </p>
          <Link
            href="/test/catalog"
            className="inline-flex px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Explore Catalog
          </Link>
        </div>
      )}

      {/* Orders List */}
      {!loading && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-colors"
            >
              {/* Order Info */}
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-white text-sm">
                    {order.id}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded ${
                      order.status === "PAID"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : order.status === "PENDING"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                    }`}
                  >
                    {order.status}
                  </span>
                  <span className="text-xs text-slate-400">
                    · {new Date(order.createdAt).toLocaleDateString()} at{" "}
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="text-xs text-slate-300 flex items-center gap-2">
                      <span className="text-slate-500">▪</span>
                      <span className="font-medium text-white">{item.productTitle}</span>
                      <span className="text-slate-400">by {item.sellerStoreName}</span>
                      <span className="text-slate-500">· ₹{(item.pricePaise / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Payment method snapshot */}
                {order.payment && (
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span>Payment: <strong className="text-slate-300">{order.payment.method}</strong></span>
                    {order.payment.razorpayPaymentId && (
                      <span className="font-mono text-slate-500">({order.payment.razorpayPaymentId})</span>
                    )}
                  </div>
                )}
              </div>

              {/* Price & Actions */}
              <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                <div className="text-right">
                  <div className="text-xs text-slate-400">Total Paid</div>
                  <div className="text-xl font-extrabold text-white">
                    ₹{(order.totalAmountPaise / 100).toFixed(2)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    View Details
                  </Link>

                  {order.receipt && (
                    <a
                      href={order.receipt.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <span>🧾</span> Receipt
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
