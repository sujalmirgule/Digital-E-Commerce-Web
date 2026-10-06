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

  // Cancellation Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Refund Request Modal
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [requestingRefund, setRequestingRefund] = useState(false);
  const [refundSuccessMsg, setRefundSuccessMsg] = useState<string | null>(null);

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

  const handleCancelOrder = async () => {
    if (!token || !orderId) return;
    try {
      setCancelling(true);
      const res = await fetchWithAuth(`/api/v1/buyer/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        setCancelModalOpen(false);
        loadOrderDetail();
      } else {
        alert(json.error?.message || "Failed to cancel order");
      }
    } catch {
      alert("Network error cancelling order");
    } finally {
      setCancelling(false);
    }
  };

  const handleRequestRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !orderId) return;
    try {
      setRequestingRefund(true);
      const res = await fetchWithAuth(`/api/v1/buyer/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: refundReason.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        setRefundModalOpen(false);
        setRefundSuccessMsg("Your refund request has been registered and is under administrative review.");
        loadOrderDetail();
      } else {
        alert(json.error?.message || "Failed to submit refund request");
      }
    } catch {
      alert("Network error submitting refund request");
    } finally {
      setRequestingRefund(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-4xl">
        <div className="h-6 w-32 bg-velvet-mocha rounded"></div>
        <div className="h-44 bg-velvet-mocha rounded-2xl border border-velvet-border/80"></div>
        <div className="h-64 bg-velvet-mocha rounded-2xl border border-velvet-border/80"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-3xl bg-velvet-mocha border border-velvet-border text-center space-y-4 max-w-2xl mx-auto">
        <div className="text-3xl">⚠️</div>
        <h2 className="text-lg font-serif text-velvet-cream-soft">Unable to Display Order</h2>
        <p className="text-sm text-rose-300 max-w-md mx-auto">{error}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard/orders"
            className="px-4 py-2 rounded-xl bg-velvet-plum hover:bg-velvet-mocha-elevated text-velvet-cream text-xs font-medium border border-velvet-border"
          >
            ← Back to Orders
          </Link>
          <button
            onClick={loadOrderDetail}
            className="px-4 py-2 rounded-xl bg-velvet-rose hover:bg-velvet-rose-soft text-white text-xs font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const isRefunded = order.status === "REFUNDED";
  const isRefundRequested = order.status === "REFUND_REQUESTED";
  const isPending = order.status === "PENDING" || order.status === "PAYMENT_PROCESSING";
  const isPaid = order.status === "PAID";
  const isCancelled = order.status === "CANCELLED";

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Top breadcrumb & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-velvet-border/80">
        <Link
          href="/dashboard/orders"
          className="text-xs text-velvet-cream-muted hover:text-velvet-cream flex items-center gap-1.5 transition-colors"
        >
          <span>←</span> Back to Order History
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          {order.receipt && !isRefunded && (
            <a
              href={order.receipt.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-1.5 rounded-full bg-velvet-rose hover:bg-velvet-rose-soft text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>🧾</span> Download PDF Receipt
            </a>
          )}

          {isPending && (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-800/40 text-xs font-medium transition-colors"
            >
              Cancel Order
            </button>
          )}

          {isPaid && (
            <button
              onClick={() => setRefundModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full bg-velvet-plum hover:bg-velvet-mocha-elevated text-velvet-cream border border-velvet-border text-xs font-medium transition-colors"
            >
              Request Refund
            </button>
          )}

          <Link
            href="/dashboard/support"
            className="px-3.5 py-1.5 rounded-full bg-velvet-plum hover:bg-velvet-mocha-elevated text-velvet-cream-muted hover:text-velvet-cream border border-velvet-border text-xs font-medium transition-colors"
          >
            Support
          </Link>
        </div>
      </div>

      {refundSuccessMsg && (
        <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-800/40 text-purple-200 text-xs flex items-center justify-between">
          <span>{refundSuccessMsg}</span>
          <button onClick={() => setRefundSuccessMsg(null)} className="text-purple-300 hover:text-white text-sm">
            ×
          </button>
        </div>
      )}

      {/* Status Notice Alerts */}
      {isRefunded && (
        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-300 space-y-1">
          <div className="font-serif font-medium flex items-center gap-2 text-sm text-rose-300">
            <span>↺</span> Order Refunded
          </div>
          <p className="text-velvet-cream-muted">
            This order has been fully refunded to your original payment method. Entitlements and digital access have been revoked.
            {order.providerRefundId && (
              <span className="block mt-1 font-mono text-velvet-cream-muted/70">
                Gateway Reference: {order.providerRefundId}
              </span>
            )}
          </p>
        </div>
      )}

      {isRefundRequested && (
        <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-800/40 text-xs text-purple-200 space-y-1">
          <div className="font-serif font-medium flex items-center gap-2 text-sm text-purple-300">
            <span>⏳</span> Refund Request Under Review
          </div>
          <p className="text-velvet-cream-muted">
            Your refund request for this order is currently being reviewed by marketplace administration.
            {order.refundReason && (
              <span className="block mt-1 italic text-velvet-cream">
                Your stated reason: &quot;{order.refundReason}&quot;
              </span>
            )}
          </p>
        </div>
      )}

      {/* Order Summary Header Card */}
      <div className="p-6 rounded-3xl bg-velvet-mocha border border-velvet-border/80 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-velvet-cream-muted font-medium">Order Reference</div>
            <div className="text-xl font-mono text-velvet-cream-soft font-semibold">{order.id}</div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
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
              Status: {order.status.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-velvet-border/60 text-xs">
          <div>
            <div className="text-velvet-cream-muted text-[11px]">Date Placed</div>
            <div className="font-serif text-velvet-cream-soft mt-0.5">
              {new Date(order.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div className="text-velvet-cream-muted text-[11px]">Payment Status</div>
            <div className="font-serif text-velvet-cream-soft mt-0.5">
              {order.paidAt ? (isRefunded ? "Refunded" : "Completed") : isCancelled ? "Cancelled" : "Pending"}
            </div>
          </div>
          <div>
            <div className="text-velvet-cream-muted text-[11px]">Payment Method</div>
            <div className="font-serif text-velvet-cream-soft mt-0.5">
              {order.payment?.method || "Razorpay Gateway"}
            </div>
          </div>
          <div>
            <div className="text-velvet-cream-muted text-[11px]">Transaction ID</div>
            <div className="font-mono text-velvet-cream-muted mt-0.5 truncate text-[11px]">
              {order.payment?.razorpayPaymentId || "N/A"}
            </div>
          </div>
        </div>
      </div>

      {/* Itemized Order Breakdown */}
      <div className="p-6 rounded-3xl bg-velvet-mocha border border-velvet-border/80 space-y-4 shadow-sm">
        <h2 className="font-serif font-medium text-velvet-cream-soft text-base">Purchased Digital Items</h2>

        <div className="divide-y divide-velvet-border/60">
          {order.items.map((item) => (
            <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="font-serif font-medium text-velvet-cream-soft text-sm">{item.productTitle}</div>
                <div className="text-xs text-velvet-cream-muted flex items-center gap-2">
                  <span>Seller: <strong className="text-velvet-cream font-normal">{item.sellerStoreName}</strong></span>
                  <span>·</span>
                  <span className="px-2 py-0.5 rounded-full bg-velvet-plum text-[10px] text-velvet-cream font-mono border border-velvet-border">
                    {item.licenseType} LICENSE
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-serif text-velvet-cream text-base">
                    ₹{(item.pricePaise / 100).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-emerald-400">1x Vault Entitlement</div>
                </div>

                {isRefunded ? (
                  <span className="px-3 py-1.5 rounded-full bg-rose-950/30 text-rose-300 text-xs font-medium border border-rose-800/40">
                    Revoked
                  </span>
                ) : item.productFileId && isPaid ? (
                  <a
                    href={`/api/v1/buyer/downloads/${item.productFileId}/url`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-velvet-rose hover:bg-velvet-rose-soft text-white text-xs font-medium transition-colors shadow-sm"
                  >
                    Download File
                  </a>
                ) : (
                  <Link
                    href="/dashboard/library"
                    className="px-3.5 py-1.5 rounded-xl bg-velvet-plum hover:bg-velvet-mocha-elevated text-velvet-cream border border-velvet-border text-xs font-medium"
                  >
                    View Library
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Total Summary */}
        <div className="pt-4 border-t border-velvet-border/70 flex justify-between items-center text-sm">
          <span className="font-serif text-velvet-cream-muted">Total Paid</span>
          <span className="font-serif text-2xl text-velvet-cream">
            ₹{(order.totalAmountPaise / 100).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Cancellation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-velvet-mocha border border-velvet-border p-6 space-y-4 shadow-2xl">
            <h3 className="font-serif text-base text-velvet-cream-soft">Cancel Pending Order</h3>
            <p className="text-xs text-velvet-cream-muted">
              Are you sure you want to cancel this pending order? This action cannot be undone.
            </p>
            <input
              type="text"
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream placeholder-velvet-cream-muted/50 focus:outline-none focus:border-velvet-cream"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-velvet-border/70">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-velvet-plum text-velvet-cream-muted hover:text-velvet-cream text-xs border border-velvet-border"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Request Modal */}
      {refundModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-velvet-mocha border border-velvet-border p-6 space-y-4 shadow-2xl">
            <h3 className="font-serif text-base text-velvet-cream-soft">Request Order Refund</h3>
            <p className="text-xs text-velvet-cream-muted">
              Please state why you are requesting a refund. Our curation and support team will inspect the request.
            </p>
            <form onSubmit={handleRequestRefund} className="space-y-4">
              <textarea
                required
                rows={3}
                placeholder="State your reason (minimum 5 characters)..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full p-3 text-xs rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream placeholder-velvet-cream-muted/50 focus:outline-none focus:border-velvet-cream font-light"
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-velvet-border/70">
                <button
                  type="button"
                  onClick={() => setRefundModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-velvet-plum text-velvet-cream-muted hover:text-velvet-cream text-xs border border-velvet-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestingRefund || refundReason.trim().length < 5}
                  className="px-4 py-1.5 rounded-xl bg-velvet-rose hover:bg-velvet-rose-soft text-white text-xs font-medium disabled:opacity-50"
                >
                  {requestingRefund ? "Submitting..." : "Submit Refund Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
