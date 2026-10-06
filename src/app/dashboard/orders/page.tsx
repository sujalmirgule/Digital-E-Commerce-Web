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
    <div className="space-y-8">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-velvet-border/80">
        <div>
          <h1 className="text-3xl font-serif font-normal text-velvet-cream-soft tracking-tight">
            Order History
          </h1>
          <p className="text-velvet-cream-muted text-xs mt-1">
            View all your digital purchases, transactions, and tax invoices.
          </p>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1.5 bg-velvet-mocha border border-velvet-border/80 p-1 rounded-xl text-xs overflow-x-auto">
          {["", "PAID", "PENDING", "REFUND_REQUESTED", "REFUNDED", "CANCELLED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap text-xs ${
                statusFilter === status
                  ? "bg-velvet-rose text-white shadow-sm"
                  : "text-velvet-cream-muted hover:text-velvet-cream-soft hover:bg-velvet-plum/60"
              }`}
            >
              {status ? status.replace("_", " ") : "All Orders"}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3.5 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-velvet-mocha border border-velvet-border/80 rounded-2xl p-4"></div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-velvet-mocha border border-rose-900/50 text-rose-200 text-sm flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={loadOrders} className="px-3 py-1 bg-velvet-rose text-white rounded-lg text-xs font-medium">
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && orders.length === 0 && (
        <div className="py-20 text-center bg-velvet-mocha/40 border border-velvet-border/80 rounded-3xl p-8 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-velvet-plum border border-velvet-border flex items-center justify-center text-xl mx-auto mb-3">
            📦
          </div>
          <h3 className="font-serif text-base text-velvet-cream-soft">No orders found</h3>
          <p className="text-xs text-velvet-cream-muted max-w-sm mx-auto mt-1 mb-6">
            {statusFilter
              ? `You have no orders with status "${statusFilter}".`
              : "You haven't placed any orders yet. Discover high-quality digital assets in our catalog."}
          </p>
          <Link
            href="/products"
            className="inline-flex px-5 py-2.5 rounded-full bg-velvet-rose hover:bg-velvet-rose-soft text-white text-xs font-semibold shadow-md transition-colors"
          >
            Explore Catalog →
          </Link>
        </div>
      )}

      {/* Orders List */}
      {!loading && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="p-5 rounded-2xl bg-velvet-mocha border border-velvet-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-velvet-cream/40 transition-all shadow-sm"
            >
              {/* Order Info */}
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono font-medium text-velvet-cream-soft text-xs">
                    {order.id}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full tracking-wider ${
                      order.status === "PAID"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        : order.status === "PENDING" || order.status === "PAYMENT_PROCESSING"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                        : order.status === "REFUND_REQUESTED"
                        ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                        : order.status === "REFUNDED"
                        ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                        : "bg-red-500/15 text-red-400 border border-red-500/20"
                    }`}
                  >
                    {order.status.replace("_", " ")}
                  </span>
                  <span className="text-xs text-velvet-cream-muted">
                    · {new Date(order.createdAt).toLocaleDateString()} at{" "}
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="text-xs text-velvet-cream-soft flex items-center gap-2">
                      <span className="text-velvet-rose">✦</span>
                      <span className="font-medium text-velvet-cream">{item.productTitle}</span>
                      <span className="text-velvet-cream-muted">by {item.sellerStoreName}</span>
                      <span className="text-velvet-cream-muted font-mono">· ₹{(item.pricePaise / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Payment method snapshot */}
                {order.payment && (
                  <div className="text-[11px] text-velvet-cream-muted flex items-center gap-2">
                    <span>Payment: <strong className="text-velvet-cream-soft font-normal">{order.payment.method}</strong></span>
                    {order.payment.razorpayPaymentId && (
                      <span className="font-mono text-velvet-cream-muted/70">({order.payment.razorpayPaymentId})</span>
                    )}
                  </div>
                )}
              </div>

              {/* Price & Actions */}
              <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-velvet-border/60">
                <div className="text-right">
                  <div className="text-[11px] text-velvet-cream-muted">Total Paid</div>
                  <div className="text-xl font-serif text-velvet-cream">
                    ₹{(order.totalAmountPaise / 100).toFixed(2)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="px-3.5 py-1.5 rounded-xl bg-velvet-plum hover:bg-velvet-mocha-elevated text-velvet-cream border border-velvet-border hover:border-velvet-cream/40 text-xs font-medium transition-all"
                  >
                    View Details
                  </Link>

                  {order.receipt && (
                    <a
                      href={order.receipt.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-xl bg-velvet-plum hover:bg-velvet-mocha-elevated text-velvet-rose border border-velvet-border hover:border-velvet-rose/40 text-xs font-medium transition-all flex items-center gap-1.5"
                    >
                      <span>🧾</span> Invoice
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
