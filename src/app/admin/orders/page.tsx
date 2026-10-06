"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminAuth } from "../AdminAuthContext";
import {
  ShoppingBag,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  CreditCard,
  FileText,
  Tag,
  RotateCcw,
} from "lucide-react";

interface OrderListItem {
  id: string;
  buyerNameSnapshot: string;
  buyerEmailSnapshot: string;
  totalAmountPaise: number;
  platformFeePaise: number;
  currency: string;
  status: string;
  itemsCount: number;
  paymentMethod: string | null;
  paymentStatus: string | null;
  receiptId: string | null;
  createdAt: string;
  paidAt: string | null;
}

interface OrderDetailItem {
  id: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  sellerStoreName: string;
  pricePaise: number;
  platformFeePaise: number;
  sellerEarningsPaise: number;
  licenseType: string;
}

interface OrderDetailData {
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
  refundedAt?: string | null;
  refundReason?: string | null;
  providerRefundId?: string | null;
  failureReason?: string | null;
  createdAt: string;
  items: OrderDetailItem[];
  payment: {
    id: string;
    amountPaise: number;
    currency: string;
    status: string;
    method: string;
    razorpayPaymentId: string | null;
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

export default function AdminOrdersPage() {
  const { token } = useAdminAuth();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<OrderDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Direct Refund Modal
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);

  const handleExecuteRefund = async () => {
    if (!token || !selectedOrderId) return;
    try {
      setRefunding(true);
      const res = await fetch(`/api/v1/admin/orders/${selectedOrderId}/refund`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: refundReason.trim() || "Admin direct refund" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to process refund");
      }
      setRefundModalOpen(false);
      setRefundReason("");
      handleInspect(selectedOrderId);
      fetchOrders(page, statusFilter, search);
    } catch (err: any) {
      alert(err.message || "Failed to execute refund");
    } finally {
      setRefunding(false);
    }
  };

  const fetchOrders = async (p = page, s = statusFilter, q = search) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", p.toString());
      params.set("limit", "15");
      if (s !== "ALL") params.set("status", s);
      if (q.trim()) params.set("search", q.trim());

      const res = await fetch(`/api/v1/admin/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load orders register");
      }
      setOrders(data.data.orders || []);
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
      fetchOrders(1, statusFilter, search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders(1, statusFilter, search);
  };

  const handleInspect = async (orderId: string) => {
    if (!token) return;
    try {
      setSelectedOrderId(orderId);
      setDetailLoading(true);
      const res = await fetch(`/api/v1/admin/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load order details");
      }
      setDetailData(data.data);
    } catch (err: any) {
      alert(err.message || "Error loading order detail");
      setSelectedOrderId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const formatRupee = (paise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(paise / 100);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Paid
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case "REFUND_REQUESTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Clock className="w-3 h-3" />
            Refund Requested
          </span>
        );
      case "REFUNDED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <RotateCcw className="w-3 h-3" />
            Refunded
          </span>
        );
      case "FAILED":
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Order Management Register</h1>
          <p className="text-xs text-slate-400 mt-1">
            Global marketplace transactions, settlement status, payment associations, and digital receipts.
          </p>
        </div>
        <button
          onClick={() => fetchOrders(page, statusFilter, search)}
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

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800 md:border-b-0">
          {[
            { label: "All Orders", value: "ALL" },
            { label: "Paid", value: "PAID" },
            { label: "Pending", value: "PENDING" },
            { label: "Failed", value: "FAILED" },
            { label: "Cancelled", value: "CANCELLED" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === tab.value
                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order ID, email..."
              className="text-xs pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 w-64"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-rose-500" />
            <p className="text-xs font-medium">Loading orders register...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <ShoppingBag className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">No Orders Found</h3>
            <p className="text-xs text-slate-500 mt-1">Try modifying your filter or query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Order ID & Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Gross Amount</th>
                  <th className="py-3 px-4">Platform Fee</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono text-xs font-semibold text-white">
                        <Link href={`/admin/orders/${order.id}`} className="hover:text-rose-400 hover:underline transition">
                          #{order.id.slice(-8).toUpperCase()}
                        </Link>
                      </div>
                      <div className="text-[11px] text-slate-500">{formatDate(order.createdAt)}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-slate-200 font-medium">{order.buyerNameSnapshot}</div>
                      <div className="text-[11px] text-slate-400">{order.buyerEmailSnapshot}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-white">
                      {formatRupee(order.totalAmountPaise)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-emerald-400 font-medium">
                      +{formatRupee(order.platformFeePaise)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-slate-500" />
                        {order.paymentMethod || "N/A"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleInspect(order.id)}
                        className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
                      >
                        <Eye className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                        Inspect
                      </button>
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
              Page {page} of {totalPages} ({totalCount} total orders)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchOrders(page - 1, statusFilter, search)}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                onClick={() => fetchOrders(page + 1, statusFilter, search)}
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

      {/* Order Detail Modal */}
      {selectedOrderId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-rose-400" />
                  Order #{selectedOrderId.slice(-8).toUpperCase()}
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">{selectedOrderId}</span>
              </div>
              <button onClick={() => setSelectedOrderId(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailLoading || !detailData ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
                <p className="text-xs">Loading order breakdown...</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Summary Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Status</span>
                    {getStatusBadge(detailData.status)}
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Total Paid</span>
                    <span className="text-white font-bold text-sm">
                      {formatRupee(detailData.totalAmountPaise)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Platform Fee</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      {formatRupee(detailData.platformFeePaise)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Placed Date</span>
                    <span className="text-slate-300">{formatDate(detailData.createdAt)}</span>
                  </div>
                </div>

                {/* Buyer Details */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Customer Information
                  </span>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="font-semibold text-white">{detailData.buyerNameSnapshot}</span>
                    <span className="font-mono text-slate-400">{detailData.buyerEmailSnapshot}</span>
                  </div>
                </div>

                {/* Items Purchased */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Fulfillment Items ({detailData.items.length})
                  </span>
                  <div className="divide-y divide-slate-800">
                    {detailData.items.map((item) => (
                      <div key={item.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white">{item.productTitle}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>Seller: {item.sellerStoreName}</span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.2 bg-slate-800 rounded text-[10px]">
                              <Tag className="w-2.5 h-2.5 text-slate-500" />
                              {item.licenseType}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-200">{formatRupee(item.pricePaise)}</div>
                          <div className="text-[10px] text-slate-500">
                            Creator: {formatRupee(item.sellerEarningsPaise)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment & Receipt References */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Payment */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-rose-400" />
                      Payment Transaction
                    </span>
                    {detailData.payment ? (
                      <div className="space-y-1 text-[11px]">
                        <div>
                          <span className="text-slate-500">Method:</span>{" "}
                          <span className="text-slate-200 font-semibold">{detailData.payment.method}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Gateway Ref:</span>{" "}
                          <span className="font-mono text-slate-300">
                            {detailData.payment.razorpayPaymentId || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Status:</span>{" "}
                          <span className="text-emerald-400 font-semibold">{detailData.payment.status}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-[11px]">No payment record linked.</p>
                    )}
                  </div>

                  {/* Receipt */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      Tax Receipt / Invoice
                    </span>
                    {detailData.receipt ? (
                      <div className="space-y-2 text-[11px]">
                        <div>
                          <span className="text-slate-500">Invoice:</span>{" "}
                          <span className="font-mono text-slate-200 font-semibold">
                            {detailData.receipt.invoiceNumber}
                          </span>
                        </div>
                        <a
                          href={detailData.receipt.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-xs transition"
                        >
                          <FileText className="w-3.5 h-3.5 text-rose-400" />
                          Download PDF Receipt
                        </a>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-[11px]">No receipt generated.</p>
                    )}
                  </div>
                </div>

                {/* Refund Status & Action Section */}
                {detailData.status === "REFUNDED" ? (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1 text-[11px]">
                    <div className="font-bold text-rose-400 flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5" />
                      Order Refunded
                    </div>
                    <div className="text-slate-300">
                      Refunded on {detailData.refundedAt ? formatDate(detailData.refundedAt) : "N/A"}.
                      {detailData.providerRefundId && (
                        <span className="ml-2 font-mono text-slate-400">
                          Provider Ref: {detailData.providerRefundId}
                        </span>
                      )}
                    </div>
                    {detailData.refundReason && (
                      <div className="text-slate-400 italic">
                        Reason: &quot;{detailData.refundReason}&quot;
                      </div>
                    )}
                  </div>
                ) : (detailData.status === "PAID" || detailData.status === "REFUND_REQUESTED") ? (
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">Order Refund Controller</div>
                      <div className="text-[11px] text-slate-400">
                        {detailData.status === "REFUND_REQUESTED"
                          ? "Customer has requested a refund for this order."
                          : "Issue a full refund via Razorpay and reverse financial ledgers."}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setRefundReason(detailData.refundReason || "");
                        setRefundModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Issue Refund
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Refund Execution Confirmation Modal */}
      {refundModalOpen && selectedOrderId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-500" />
                Confirm Order Refund
              </h3>
              <button onClick={() => setRefundModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3">
              <p>
                You are about to issue a full refund for Order <span className="font-mono text-white font-bold">{selectedOrderId}</span>.
              </p>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 font-mono text-[11px]">
                <div>Total to refund: {detailData ? formatRupee(detailData.totalAmountPaise) : ""}</div>
                <div>Customer: {detailData?.buyerEmailSnapshot}</div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                  Refund Reason / Note
                </label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Customer requested refund / dissatisfied"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                This will invoke the Razorpay Refund API, revoke customer digital access, and reverse creator ledger earnings.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRefundModalOpen(false)}
                disabled={refunding}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRefund}
                disabled={refunding}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
              >
                {refunding ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Refunding...
                  </>
                ) : (
                  "Confirm & Execute"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
