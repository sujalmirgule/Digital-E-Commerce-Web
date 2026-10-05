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
        body: JSON.stringify({ reason: cancelReason.trim() || "Buyer cancelled order" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to cancel order");
      }
      setCancelModalOpen(false);
      setCancelReason("");
      loadOrderDetail();
    } catch (err: any) {
      alert(err.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  const handleRequestRefund = async () => {
    if (!token || !orderId) return;
    if (!refundReason.trim() || refundReason.trim().length < 5) {
      alert("Please provide a reason for the refund (minimum 5 characters).");
      return;
    }

    try {
      setRequestingRefund(true);
      const res = await fetchWithAuth(`/api/v1/buyer/orders/${orderId}/refund-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: refundReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to submit refund request");
      }
      setRefundModalOpen(false);
      setRefundReason("");
      setRefundSuccessMsg("Your refund request has been submitted and is under administrative review.");
      loadOrderDetail();
    } catch (err: any) {
      alert(err.message || "Failed to submit refund request");
    } finally {
      setRequestingRefund(false);
    }
  };

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

  const isRefunded = order.status === "REFUNDED";
  const isRefundRequested = order.status === "REFUND_REQUESTED";
  const isPending = order.status === "PENDING" || order.status === "PAYMENT_PROCESSING";
  const isPaid = order.status === "PAID";
  const isCancelled = order.status === "CANCELLED";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top breadcrumb & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <Link
          href="/dashboard/orders"
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 font-medium transition-colors"
        >
          <span>←</span> Back to Order History
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          {order.receipt && !isRefunded && (
            <a
              href={order.receipt.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>🧾</span> Download PDF Receipt
            </a>
          )}

          {isPending && (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors"
            >
              Cancel Order
            </button>
          )}

          {isPaid && (
            <button
              onClick={() => setRefundModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Request Refund
            </button>
          )}

          <Link
            href="/dashboard/support"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Need Help?
          </Link>
        </div>
      </div>

      {refundSuccessMsg && (
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs flex items-center justify-between">
          <span>{refundSuccessMsg}</span>
          <button onClick={() => setRefundSuccessMsg(null)} className="text-purple-400 hover:text-white text-sm">
            ×
          </button>
        </div>
      )}

      {/* Status Notice Alerts */}
      {isRefunded && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1">
          <div className="font-bold flex items-center gap-2 text-sm text-rose-400">
            <span>↺</span> Order Refunded
          </div>
          <p>
            This order has been fully refunded to your original payment method. Entitlements and digital download access have been revoked.
            {order.providerRefundId && (
              <span className="block mt-1 font-mono text-slate-400">
                Gateway Reference: {order.providerRefundId}
              </span>
            )}
          </p>
        </div>
      )}

      {isRefundRequested && (
        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 space-y-1">
          <div className="font-bold flex items-center gap-2 text-sm text-purple-400">
            <span>⏳</span> Refund Request Under Review
          </div>
          <p>
            Your refund request for this order is currently being reviewed by our administration team.
            {order.refundReason && (
              <span className="block mt-1 italic text-slate-300">
                Your stated reason: &quot;{order.refundReason}&quot;
              </span>
            )}
          </p>
        </div>
      )}

      {isCancelled && (
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 text-xs text-slate-300 space-y-1">
          <div className="font-bold flex items-center gap-2 text-sm text-slate-200">
            <span>✕</span> Order Cancelled
          </div>
          <p>
            This order was cancelled before payment was captured.
            {order.failureReason && (
              <span className="block mt-1 text-slate-400">
                Reason: {order.failureReason}
              </span>
            )}
          </p>
        </div>
      )}

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
                  : order.status === "PENDING" || order.status === "PAYMENT_PROCESSING"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : order.status === "REFUND_REQUESTED"
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : order.status === "REFUNDED"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}
            >
              Status: {order.status.replace("_", " ")}
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
            <div className="text-slate-400">Payment Status</div>
            <div className="font-semibold text-slate-200 mt-0.5">
              {order.paidAt ? (isRefunded ? "Refunded" : "Completed") : isCancelled ? "Cancelled" : "Pending"}
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

                {isRefunded ? (
                  <span className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 text-xs font-semibold border border-rose-500/20">
                    Access Revoked
                  </span>
                ) : item.productFileId && isPaid ? (
                  <a
                    href={`/api/v1/buyer/downloads/${item.productFileId}/url`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                  >
                    Download
                  </a>
                ) : null}
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
            <span className={isRefunded ? "text-rose-400 line-through" : "text-indigo-400"}>
              ₹{(order.totalAmountPaise / 100).toFixed(2)}
            </span>
          </div>
          {isRefunded && (
            <div className="flex justify-between font-bold text-sm text-rose-400">
              <span>Total Refunded (INR):</span>
              <span>₹{(order.totalAmountPaise / 100).toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Order Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white">Cancel Order</h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to cancel Order <span className="font-mono text-white font-bold">{order.id}</span>?
            </p>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold">
                Reason for cancellation (optional)
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Changed my mind"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                disabled={cancelling}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Refund Modal */}
      {refundModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white">Request a Refund</h3>
            <p className="text-xs text-slate-300">
              Submit a formal refund request for Order <span className="font-mono text-white font-bold">{order.id}</span>.
              Our support team will review your submission in accordance with our marketplace policy.
            </p>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold">
                Reason for refund * (minimum 5 characters)
              </label>
              <textarea
                rows={3}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Please describe why you are requesting a refund..."
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Note: If approved, access to digital downloads will be revoked and funds returned to your original payment method.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRefundModalOpen(false)}
                disabled={requestingRefund}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestRefund}
                disabled={requestingRefund}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                {requestingRefund ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
