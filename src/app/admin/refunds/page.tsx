"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminAuth } from "../AdminAuthContext";
import {
  RotateCcw,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  X,
  FileText,
} from "lucide-react";

interface RefundRequestItem {
  id: string;
  orderId: string;
  amountPaise: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNotes: string | null;
  providerRefundId: string | null;
  createdAt: string;
  updatedAt: string;
  order: {
    id: string;
    status: string;
    totalAmountPaise: number;
    currency: string;
    paidAt: string | null;
    refundedAt: string | null;
    items: Array<{
      id: string;
      productTitle: string;
      pricePaise: number;
      seller: {
        id: string;
        storeName: string;
      };
    }>;
  };
  buyer: {
    id: string;
    email: string;
    fullName: string;
  };
}

export default function AdminRefundsPage() {
  const { token } = useAdminAuth();
  const [requests, setRequests] = useState<RefundRequestItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rejection modal
  const [rejectingItem, setRejectingItem] = useState<RefundRequestItem | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [processingAction, setProcessingAction] = useState(false);

  // Approval confirmation modal
  const [approvingItem, setApprovingItem] = useState<RefundRequestItem | null>(null);

  const fetchRefunds = async (p = page, s = statusFilter, q = search) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", p.toString());
      params.set("limit", "15");
      if (s !== "ALL") params.set("status", s);
      if (q.trim()) params.set("search", q.trim());

      const res = await fetch(`/api/v1/admin/refunds?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load refund requests");
      }
      setRequests(data.data.requests || []);
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
      fetchRefunds(1, statusFilter, search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRefunds(1, statusFilter, search);
  };

  const handleApprove = async () => {
    if (!token || !approvingItem) return;
    try {
      setProcessingAction(true);
      const res = await fetch(`/api/v1/admin/refunds/${approvingItem.id}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to approve refund");
      }
      setApprovingItem(null);
      fetchRefunds(page, statusFilter, search);
    } catch (err: any) {
      alert(err.message || "Failed to approve refund");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleReject = async () => {
    if (!token || !rejectingItem) return;
    if (!rejectionNotes.trim()) {
      alert("Please provide a reason for declining the refund request.");
      return;
    }
    try {
      setProcessingAction(true);
      const res = await fetch(`/api/v1/admin/refunds/${rejectingItem.id}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adminNotes: rejectionNotes }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to reject refund");
      }
      setRejectingItem(null);
      setRejectionNotes("");
      fetchRefunds(page, statusFilter, search);
    } catch (err: any) {
      alert(err.message || "Failed to reject refund");
    } finally {
      setProcessingAction(false);
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
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            Pending Review
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            Declined
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
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <RotateCcw className="w-6 h-6 text-rose-500" />
            Refund & Cancellation Workbench
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative order lifecycle manager: review refund requests, trigger Razorpay reversals, and manage license revocations.
          </p>
        </div>
        <button
          onClick={() => fetchRefunds(page, statusFilter, search)}
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { label: "All Requests", val: "ALL" },
            { label: "Pending", val: "PENDING" },
            { label: "Approved", val: "APPROVED" },
            { label: "Declined", val: "REJECTED" },
          ].map((tab) => (
            <button
              key={tab.val}
              onClick={() => setStatusFilter(tab.val)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === tab.val
                  ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order, buyer, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
          />
        </form>
      </div>

      {/* Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Order & Buyer</th>
                <th className="py-3 px-4">Product & Creator</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Reason / Notes</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
                    Loading refund requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    No refund requests found matching the active criteria.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-white font-semibold flex items-center gap-1.5">
                        <Link
                          href={`/admin/orders?search=${r.orderId}`}
                          className="hover:text-rose-400 flex items-center gap-1"
                        >
                          {r.orderId}
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                        </Link>
                      </div>
                      <div className="text-[11px] text-slate-400">{r.buyer.fullName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{r.buyer.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200 max-w-xs truncate">
                        {r.order.items[0]?.productTitle || "Marketplace Product"}
                        {r.order.items.length > 1 && ` (+${r.order.items.length - 1} more)`}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Creator: {r.order.items[0]?.seller.storeName || "N/A"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white text-sm">
                        {formatRupee(r.amountPaise)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="text-slate-300 italic line-clamp-2">
                        &quot;{r.reason}&quot;
                      </div>
                      {r.adminNotes && (
                        <div className="text-[10px] text-rose-400 mt-1">
                          Admin note: {r.adminNotes}
                        </div>
                      )}
                      {r.providerRefundId && (
                        <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                          Ref: {r.providerRefundId}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(r.status)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {r.status === "PENDING" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setApprovingItem(r)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectingItem(r);
                              setRejectionNotes("");
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-300 font-semibold rounded-lg text-xs border border-slate-700 transition"
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono">
                          {r.status === "APPROVED" ? "Settled" : "Resolved"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing {requests.length} of {totalCount} records
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchRefunds(page - 1, statusFilter, search)}
                disabled={page <= 1 || loading}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono text-slate-200">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => fetchRefunds(page + 1, statusFilter, search)}
                disabled={page >= totalPages || loading}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Approval Confirmation Modal */}
      {approvingItem && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-emerald-400" />
                Confirm Refund Execution
              </h3>
              <button onClick={() => setApprovingItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <p>
                Are you sure you want to approve this refund? This will execute the authoritative Razorpay refund
                and perform automatic financial adjustments:
              </p>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 font-mono text-[11px]">
                <div>Order: {approvingItem.orderId}</div>
                <div>Amount: {formatRupee(approvingItem.amountPaise)}</div>
                <div>Customer: {approvingItem.buyer.email}</div>
              </div>
              <ul className="list-disc list-inside text-slate-400 space-y-0.5 text-[11px]">
                <li>Razorpay refund API call will be executed</li>
                <li>Digital download access and entitlements will be revoked</li>
                <li>Seller pending/available earnings will be deducted</li>
                <li>Platform ledger will be reversed</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setApprovingItem(null)}
                disabled={processingAction}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={processingAction}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
              >
                {processingAction ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Executing...
                  </>
                ) : (
                  "Execute Refund"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-400" />
                Decline Refund Request
              </h3>
              <button onClick={() => setRejectingItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <p>
                Provide a reason for declining the refund request. This will revert the order to PAID status
                and notify the customer.
              </p>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 italic">
                Buyer reason: &quot;{rejectingItem.reason}&quot;
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                  Explanation / Note to Buyer *
                </label>
                <textarea
                  rows={3}
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="e.g. As per our refund policy, product files were already downloaded and accessed..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingItem(null)}
                disabled={processingAction}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processingAction}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
              >
                {processingAction ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Declining...
                  </>
                ) : (
                  "Decline Request"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
