"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAdminAuth } from "../../AdminAuthContext";
import {
  ShoppingBag,
  CreditCard,
  FileText,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  Store,
  Tag,
  Receipt,
  User,
} from "lucide-react";

interface AdminOrderDetail {
  id: string;
  buyerNameSnapshot: string;
  buyerEmailSnapshot: string;
  subtotalPaise: number;
  platformFeePaise: number;
  totalAmountPaise: number;
  currency: string;
  status: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  refundReason: string | null;
  providerRefundId: string | null;
  failureReason: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    productId: string;
    productTitle: string;
    productSlug: string;
    sellerStoreName: string;
    pricePaise: number;
    platformFeePaise: number;
    sellerEarningsPaise: number;
    licenseType: string;
  }>;
  payment: {
    id: string;
    amountPaise: number;
    currency: string;
    status: string;
    method: string;
    razorpayPaymentId: string;
    verifiedAt: string | null;
    createdAt: string;
  } | null;
  receipt: {
    id: string;
    invoiceNumber: string;
    amountPaidPaise: number;
    downloadUrl: string;
    createdAt: string;
  } | null;
}

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAdminAuth();

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderDetail = async () => {
    if (!token || !id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/admin/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load order details");
      }
      setOrder(data.data.order || data.data);
    } catch (err: any) {
      setError(err.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && id) {
      fetchOrderDetail();
    }
  }, [token, id]);

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-[#BBAE9F]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#F43F5E] mb-3" />
        <p className="text-xs font-mono">Retrieving order and payment records...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-xs text-[#BBAE9F] hover:text-[#F7EFE2] transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Orders Directory
        </Link>
        <div className="p-6 bg-rose-950/40 border border-rose-900/50 rounded-2xl text-rose-300 space-y-2">
          <div className="flex items-center gap-2 font-medium text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <span>Order Retrieval Error</span>
          </div>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-xs text-[#BBAE9F] hover:text-[#E8D5B5] transition mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Orders Directory
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif text-[#F7EFE2] flex items-center gap-3">
              <span>Order #{order.id.slice(-8).toUpperCase()}</span>
              <span
                className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full ${
                  order.status === "PAID"
                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40"
                    : order.status === "PENDING"
                    ? "bg-amber-950/60 text-amber-300 border border-amber-800/40"
                    : "bg-rose-950/60 text-rose-300 border border-rose-800/40"
                }`}
              >
                {order.status}
              </span>
            </h1>
            <p className="text-xs text-[#BBAE9F] font-mono mt-1">
              Full Order ID: {order.id} • Created: {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>

          {order.receipt && (
            <div>
              <Link
                href={`/admin/receipts/${order.receipt.id}`}
                className="px-4 py-2.5 rounded-xl text-xs font-medium bg-[#211815] hover:bg-[#2B201C] border border-[#3A2930] text-[#E8D5B5] hover:text-white flex items-center gap-2 transition"
              >
                <Receipt className="w-4 h-4 text-[#FB7185]" />
                <span>View Receipt ({order.receipt.invoiceNumber})</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Financial State Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-[#211815] border border-[#3A2930] rounded-2xl space-y-1">
          <span className="text-[11px] font-mono uppercase text-[#BBAE9F]">Gross Total</span>
          <div className="text-2xl font-serif text-[#F7EFE2]">
            ₹{(order.totalAmountPaise / 100).toLocaleString()}
          </div>
          <span className="text-[10px] font-mono text-[#BBAE9F]">Currency: {order.currency}</span>
        </div>

        <div className="p-5 bg-[#211815] border border-[#3A2930] rounded-2xl space-y-1">
          <span className="text-[11px] font-mono uppercase text-[#BBAE9F]">Platform Commission</span>
          <div className="text-2xl font-serif text-[#E8D5B5]">
            ₹{(order.platformFeePaise / 100).toLocaleString()}
          </div>
          <span className="text-[10px] font-mono text-[#BBAE9F]">Authoritative ledger rate</span>
        </div>

        <div className="p-5 bg-[#211815] border border-[#3A2930] rounded-2xl space-y-1">
          <span className="text-[11px] font-mono uppercase text-[#BBAE9F]">Seller Net Share</span>
          <div className="text-2xl font-serif text-[#FB7185]">
            ₹{((order.totalAmountPaise - order.platformFeePaise) / 100).toLocaleString()}
          </div>
          <span className="text-[10px] font-mono text-[#BBAE9F]">Distributed to vendors</span>
        </div>
      </div>

      {/* Main Grid: Items + Payment/Customer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items Table (2 cols) */}
        <div className="lg:col-span-2 bg-[#211815] border border-[#3A2930] rounded-2xl p-6 space-y-4">
          <h2 className="text-xs font-mono uppercase text-[#E8D5B5] tracking-wider border-b border-[#3A2930] pb-2 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#FB7185]" /> Line Items Breakdown
          </h2>

          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-[#1B101B] border border-[#3A2930] rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
              >
                <div className="space-y-1 flex-1">
                  <div className="font-medium text-[#F7EFE2] text-sm">
                    {item.productTitle}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#BBAE9F]">
                    <span>Store: {item.sellerStoreName}</span>
                    <span>•</span>
                    <span className="font-mono">License: {item.licenseType}</span>
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <div className="font-serif text-[#F7EFE2]">
                    ₹{(item.pricePaise / 100).toLocaleString()}
                  </div>
                  <div className="text-[10px] font-mono text-[#BBAE9F]">
                    Fee: ₹{(item.platformFeePaise / 100).toLocaleString()} | Net: ₹{(item.sellerEarningsPaise / 100).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer & Payment Snapshot (1 col) */}
        <div className="space-y-6">
          {/* Customer */}
          <div className="bg-[#211815] border border-[#3A2930] rounded-2xl p-6 space-y-3">
            <h2 className="text-xs font-mono uppercase text-[#E8D5B5] tracking-wider border-b border-[#3A2930] pb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-[#FB7185]" /> Customer Snapshot
            </h2>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[#BBAE9F] block text-[11px]">Buyer Name</span>
                <span className="text-[#F7EFE2] font-medium">{order.buyerNameSnapshot}</span>
              </div>
              <div>
                <span className="text-[#BBAE9F] block text-[11px]">Buyer Email</span>
                <span className="font-mono text-[#F7EFE2]">{order.buyerEmailSnapshot}</span>
              </div>
            </div>
          </div>

          {/* Payment Snapshot */}
          <div className="bg-[#211815] border border-[#3A2930] rounded-2xl p-6 space-y-3">
            <h2 className="text-xs font-mono uppercase text-[#E8D5B5] tracking-wider border-b border-[#3A2930] pb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#FB7185]" /> Payment Record
            </h2>
            {order.payment ? (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[#BBAE9F] block text-[11px]">Payment Status</span>
                  <span className="font-mono text-emerald-400 font-medium">
                    {order.payment.status}
                  </span>
                </div>
                <div>
                  <span className="text-[#BBAE9F] block text-[11px]">Method</span>
                  <span className="font-mono text-[#F7EFE2]">{order.payment.method}</span>
                </div>
                <div>
                  <span className="text-[#BBAE9F] block text-[11px]">Provider ID</span>
                  <span className="font-mono text-[#E8D5B5] text-[11px] break-all">
                    {order.payment.razorpayPaymentId}
                  </span>
                </div>
                {order.payment.verifiedAt && (
                  <div>
                    <span className="text-[#BBAE9F] block text-[11px]">Verified At</span>
                    <span className="font-mono text-[#BBAE9F]">
                      {new Date(order.payment.verifiedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-[#BBAE9F]">No payment recorded yet.</p>
            )}

            {/* Refund Info if refunded */}
            {order.refundedAt && (
              <div className="mt-3 p-3 bg-amber-950/40 border border-amber-900/40 rounded-xl space-y-1 text-xs">
                <span className="text-amber-400 font-medium block">Refunded Order</span>
                <div className="text-[11px] text-[#BBAE9F]">
                  At: {new Date(order.refundedAt).toLocaleString()}
                </div>
                {order.refundReason && (
                  <div className="text-[11px] text-amber-200">Reason: {order.refundReason}</div>
                )}
                {order.providerRefundId && (
                  <div className="text-[10px] font-mono text-[#BBAE9F]">
                    Refund ID: {order.providerRefundId}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
