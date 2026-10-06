"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAdminAuth } from "../AdminAuthContext";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Eye,
  FileText,
  ExternalLink,
  X,
  Package,
  User,
  ArrowRight,
} from "lucide-react";

interface PaymentItem {
  id: string;
  orderId: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string;
  amountPaise: number;
  currency: string;
  status: string;
  method: string;
  buyerName: string | null;
  buyerEmail: string | null;
  productTitle: string | null;
  receiptStatus: string;
  receiptId: string | null;
  receiptInvoiceNumber: string | null;
  capturedAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

interface PaymentDetailModalData {
  payment: {
    id: string;
    orderId: string;
    amountPaise: number;
    currency: string;
    status: string;
    method: string;
    razorpayPaymentId: string;
    razorpayOrderId: string | null;
    bank?: string | null;
    wallet?: string | null;
    vpa?: string | null;
    cardLast4?: string | null;
    cardNetwork?: string | null;
    errorCode?: string | null;
    errorDescription?: string | null;
    createdAt: string;
    capturedAt: string | null;
  };
  order: {
    id: string;
    status: string;
    totalAmountPaise: number;
    platformFeePaise: number;
    createdAt: string;
    paidAt: string | null;
    items: Array<{
      id: string;
      productId: string;
      productTitle: string;
      productSlug: string | null;
      sellerStoreName: string | null;
      pricePaise: number;
      platformFeePaise: number;
      sellerEarningsPaise: number;
      licenseType: string;
    }>;
  } | null;
  buyer: {
    id: string | null;
    name: string;
    email: string;
  } | null;
  receipt: {
    id: string;
    invoiceNumber: string;
    issuedAt: string;
    templateVersion: number;
    downloadUrl: string;
  } | null;
}

export default function AdminPaymentsPage() {
  const { token } = useAdminAuth();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment Details Modal
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [modalData, setModalData] = useState<PaymentDetailModalData | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchPayments = useCallback(
    async (p = page, s = statusFilter, q = search) => {
      if (!token) return;
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("page", p.toString());
        params.set("limit", "15");
        if (s !== "ALL") params.set("status", s);
        if (q.trim()) params.set("search", q.trim());

        const res = await fetch(`/api/v1/admin/payments?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error?.message || "Failed to load payments register");
        }
        setPayments(data.data.payments || []);
        setPage(data.data.pagination.page);
        setTotalPages(data.data.pagination.totalPages);
        setTotalCount(data.data.pagination.total);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    [token, page, statusFilter, search]
  );

  useEffect(() => {
    if (token) {
      fetchPayments(1, statusFilter, search);
    }
  }, [token, statusFilter, fetchPayments]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPayments(1, statusFilter, search);
  };

  const handleOpenDetails = async (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setModalLoading(true);
    setModalError(null);
    setModalData(null);

    try {
      const res = await fetch(`/api/v1/admin/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load payment details");
      }
      setModalData(data.data);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Failed to load payment details");
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedPaymentId(null);
    setModalData(null);
    setModalError(null);
  };

  const formatRupee = (paise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(paise / 100);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CAPTURED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Captured
          </span>
        );
      case "AUTHORIZED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <Clock className="w-3 h-3" />
            Authorized
          </span>
        );
      case "CREATED":
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            Created
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case "REFUNDED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#8A6048]/15 text-[#3B261C] dark:text-[#E8D8C8] border border-[#8A6048]/30">
            <RefreshCw className="w-3 h-3" />
            Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3B261C]/20 dark:border-stone-800">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-[#151311] dark:text-[#FAF7F2]">
            Payment Management Register
          </h1>
          <p className="text-xs text-[#8A6048] dark:text-[#C8AA91] mt-1">
            Authoritative platform gateway settlements, verification timestamps, and receipt synchronizations.
          </p>
        </div>
        <button
          onClick={() => fetchPayments(page, statusFilter, search)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white dark:bg-[#211D1A] hover:bg-stone-50 dark:hover:bg-stone-800 text-[#3B261C] dark:text-[#FAF7F2] border border-[#C8AA91]/60 dark:border-stone-700 rounded-xl transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Security Privacy Notice */}
      <div className="flex items-start gap-3 p-4 bg-stone-50 dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 rounded-2xl text-xs text-[#684332] dark:text-[#C8AA91]">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <strong className="text-[#151311] dark:text-[#FAF7F2]">Cryptographic Privacy Guard:</strong>{" "}
          Live gateway secrets, customer CVVs, private storage keys, and authentication credentials are strictly isolated from client registers.
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-900/50 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 rounded-xl overflow-x-auto">
          {[
            { label: "All Payments", value: "ALL" },
            { label: "Captured", value: "CAPTURED" },
            { label: "Authorized", value: "AUTHORIZED" },
            { label: "Created", value: "CREATED" },
            { label: "Failed", value: "FAILED" },
            { label: "Refunded", value: "REFUNDED" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === tab.value
                  ? "bg-[#3B261C] text-[#FAF7F2] shadow-sm"
                  : "text-[#684332] dark:text-[#C8AA91] hover:text-[#151311] dark:hover:text-[#FAF7F2] hover:bg-stone-200/60 dark:hover:bg-stone-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8A6048] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search payment ID, order ID, buyer..."
              className="text-xs pl-8 pr-3 py-2 bg-white dark:bg-[#211D1A] border border-stone-300 dark:border-stone-700 rounded-xl text-[#151311] dark:text-[#FAF7F2] placeholder-[#8A6048]/60 focus:outline-none focus:border-[#3B261C] w-64"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-[#3B261C] text-[#FAF7F2] hover:bg-[#684332] rounded-xl text-xs font-semibold transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-[#8A6048]">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#A94432]" />
            <p className="text-xs font-medium">Loading payments register...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center text-[#8A6048]">
            <CreditCard className="w-12 h-12 text-[#8A6048]/40 mx-auto mb-3" />
            <h3 className="font-serif text-base font-bold text-[#151311] dark:text-[#FAF7F2]">No Payments Found</h3>
            <p className="text-xs text-[#8A6048] mt-1">Try modifying your filter or query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 text-[10px] font-bold text-[#8A6048] uppercase tracking-wider">
                  <th className="py-3 px-3.5">Payment ID</th>
                  <th className="py-3 px-3.5">Order ID</th>
                  <th className="py-3 px-3.5">Buyer</th>
                  <th className="py-3 px-3.5">Product</th>
                  <th className="py-3 px-3.5">Amount</th>
                  <th className="py-3 px-3.5">Method</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Receipt</th>
                  <th className="py-3 px-3.5">Captured At</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors">
                    <td className="py-3 px-3.5 font-mono text-[11px] font-semibold text-[#151311] dark:text-[#FAF7F2] whitespace-nowrap">
                      {p.razorpayPaymentId || p.id.slice(0, 14)}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <Link
                        href={`/admin/orders?search=${p.orderId}`}
                        className="font-mono text-[#A94432] hover:underline"
                      >
                        #{p.orderId.slice(-8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="font-semibold text-[#151311] dark:text-[#FAF7F2]">{p.buyerName || "Customer"}</div>
                      <div className="text-[10px] text-[#8A6048]">{p.buyerEmail || "—"}</div>
                    </td>
                    <td className="py-3 px-3.5 max-w-[160px] truncate font-medium text-[#151311] dark:text-[#FAF7F2]">
                      {p.productTitle || "Digital Product"}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap font-mono font-bold text-[#151311] dark:text-[#FAF7F2]">
                      {formatRupee(p.amountPaise)}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap text-[#684332] dark:text-[#C8AA91]">
                      <span className="inline-flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-[#8A6048]" />
                        {p.method}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {getStatusBadge(p.status)}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {p.receiptStatus === "GENERATED" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Generated
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#8A6048] italic">Pending</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap text-[#8A6048] font-mono text-[10px]">
                      {formatDate(p.capturedAt || p.createdAt)}
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenDetails(p.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#3B261C] dark:text-[#FAF7F2] bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-lg transition"
                      >
                        <Eye className="w-3 h-3 text-[#A94432]" />
                        Details
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
          <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-[#8A6048] bg-stone-50 dark:bg-stone-900">
            <span>
              Page {page} of {totalPages} ({totalCount} total records)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchPayments(page - 1, statusFilter, search)}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 disabled:opacity-40 text-[#151311] dark:text-[#FAF7F2] border border-stone-200 dark:border-stone-700 font-semibold"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                onClick={() => fetchPayments(page + 1, statusFilter, search)}
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

      {/* Payment Details Modal */}
      {selectedPaymentId && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#211D1A] border border-stone-300 dark:border-stone-700 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#FAF7F2] dark:bg-stone-800 border border-[#C8AA91]/50 flex items-center justify-center text-[#A94432]">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#151311] dark:text-[#FAF7F2]">
                    Payment Transaction Details
                  </h3>
                  <p className="text-[11px] text-[#8A6048] font-mono">
                    ID: {selectedPaymentId}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-xl text-[#8A6048] hover:text-[#151311] dark:hover:text-[#FAF7F2] hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalLoading ? (
              <div className="py-20 text-center text-[#8A6048]">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#A94432]" />
                <p className="text-xs font-semibold">Loading authoritative transaction details...</p>
              </div>
            ) : modalError ? (
              <div className="p-4 bg-rose-950/40 border border-rose-900/50 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            ) : modalData ? (
              <div className="space-y-6 text-xs">
                {/* Status & Amount Banner */}
                <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#8A6048] tracking-wider block">
                      Total Transaction Amount
                    </span>
                    <span className="text-2xl font-serif font-bold text-[#151311] dark:text-[#FAF7F2]">
                      {formatRupee(modalData.payment.amountPaise)}
                    </span>
                    <span className="text-[11px] text-[#8A6048] ml-1">({modalData.payment.currency})</span>
                  </div>
                  <div className="flex flex-col sm:items-end gap-1">
                    <span className="text-[10px] font-bold uppercase text-[#8A6048] tracking-wider">
                      Gateway State
                    </span>
                    <div>{getStatusBadge(modalData.payment.status)}</div>
                  </div>
                </div>

                {/* Gateway Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-stone-50/60 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 space-y-2">
                    <h4 className="font-bold text-[#151311] dark:text-[#FAF7F2] flex items-center gap-1.5 pb-2 border-b border-stone-200 dark:border-stone-800">
                      <CreditCard className="w-4 h-4 text-[#A94432]" /> Gateway Identifiers
                    </h4>
                    <div className="flex justify-between py-1">
                      <span className="text-[#8A6048]">Method:</span>
                      <span className="font-semibold text-[#151311] dark:text-[#FAF7F2]">{modalData.payment.method}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#8A6048]">Razorpay Payment ID:</span>
                      <span className="font-mono text-[#151311] dark:text-[#FAF7F2]">{modalData.payment.razorpayPaymentId}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#8A6048]">Razorpay Order ID:</span>
                      <span className="font-mono text-[#151311] dark:text-[#FAF7F2]">{modalData.payment.razorpayOrderId || "—"}</span>
                    </div>
                    {modalData.payment.vpa && (
                      <div className="flex justify-between py-1">
                        <span className="text-[#8A6048]">UPI VPA:</span>
                        <span className="font-mono text-[#151311] dark:text-[#FAF7F2]">{modalData.payment.vpa}</span>
                      </div>
                    )}
                    {modalData.payment.cardLast4 && (
                      <div className="flex justify-between py-1">
                        <span className="text-[#8A6048]">Card:</span>
                        <span className="font-mono text-[#151311] dark:text-[#FAF7F2]">
                          {modalData.payment.cardNetwork} **** {modalData.payment.cardLast4}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="bg-stone-50/60 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 space-y-2">
                    <h4 className="font-bold text-[#151311] dark:text-[#FAF7F2] flex items-center gap-1.5 pb-2 border-b border-stone-200 dark:border-stone-800">
                      <Clock className="w-4 h-4 text-[#A94432]" /> Timestamps & Audit
                    </h4>
                    <div className="flex justify-between py-1">
                      <span className="text-[#8A6048]">Initiated:</span>
                      <span className="font-mono text-[#151311] dark:text-[#FAF7F2]">{formatDate(modalData.payment.createdAt)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#8A6048]">Captured:</span>
                      <span className="font-mono text-[#151311] dark:text-[#FAF7F2]">{formatDate(modalData.payment.capturedAt)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#8A6048]">Order Ref:</span>
                      <Link
                        href={`/admin/orders?search=${modalData.payment.orderId}`}
                        className="font-mono text-[#A94432] hover:underline"
                      >
                        #{modalData.payment.orderId.slice(-8).toUpperCase()}
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Buyer & Customer */}
                {modalData.buyer && (
                  <div className="bg-stone-50/60 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 space-y-2">
                    <h4 className="font-bold text-[#151311] dark:text-[#FAF7F2] flex items-center gap-1.5 pb-2 border-b border-stone-200 dark:border-stone-800">
                      <User className="w-4 h-4 text-[#A94432]" /> Customer Account
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="text-[#8A6048] block text-[11px]">Full Name:</span>
                        <span className="font-semibold text-[#151311] dark:text-[#FAF7F2]">{modalData.buyer.name}</span>
                      </div>
                      <div>
                        <span className="text-[#8A6048] block text-[11px]">Email Address:</span>
                        <span className="font-mono text-[#151311] dark:text-[#FAF7F2]">{modalData.buyer.email}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Purchased Products */}
                {modalData.order && modalData.order.items.length > 0 && (
                  <div className="bg-stone-50/60 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 space-y-3">
                    <h4 className="font-bold text-[#151311] dark:text-[#FAF7F2] flex items-center gap-1.5 pb-2 border-b border-stone-200 dark:border-stone-800">
                      <Package className="w-4 h-4 text-[#A94432]" /> Order Deliverables ({modalData.order.items.length})
                    </h4>
                    <div className="space-y-2">
                      {modalData.order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2.5 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700"
                        >
                          <div>
                            <div className="font-bold text-[#151311] dark:text-[#FAF7F2]">{item.productTitle}</div>
                            <div className="text-[11px] text-[#8A6048]">
                              Seller: {item.sellerStoreName || "Marketplace"} • License: {item.licenseType}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-[#151311] dark:text-[#FAF7F2]">
                              {formatRupee(item.pricePaise)}
                            </div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                              Seller net: {formatRupee(item.sellerEarningsPaise)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Receipt Status & Action */}
                <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-[#151311] dark:text-[#FAF7F2]">Tax Invoice & Receipt</div>
                      <div className="text-[11px] text-[#8A6048]">
                        {modalData.receipt
                          ? `Issued #${modalData.receipt.invoiceNumber} on ${formatDate(modalData.receipt.issuedAt)}`
                          : "Receipt not yet issued for this transaction"}
                      </div>
                    </div>
                  </div>
                  {modalData.receipt ? (
                    <a
                      href={modalData.receipt.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 text-xs font-semibold bg-[#3B261C] hover:bg-[#684332] text-[#FAF7F2] rounded-xl shadow-sm transition inline-flex items-center gap-1.5"
                    >
                      Download PDF
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-[#8A6048] italic">Unissued</span>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-xs font-semibold text-[#8A6048] hover:text-[#151311] dark:hover:text-[#FAF7F2] transition"
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
