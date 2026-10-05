"use client";

import React, { useEffect, useState } from "react";
import { useAdminAuth } from "../AdminAuthContext";
import {
  Store,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Building,
  User,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
} from "lucide-react";

interface SellerItem {
  id: string;
  userId: string;
  storeName: string;
  storeSlug: string;
  status: string;
  country: string;
  totalRevenuePaise: number;
  netEarningsPaise: number;
  availableBalance: number;
  pendingBalance: number;
  rejectionReason: string | null;
  createdAt: string;
  user: {
    fullName: string;
    email: string;
    isActive: boolean;
  };
  productsCount: number;
}

interface SellerDetailModalData extends SellerItem {
  panNumberMasked?: string;
  bankAccountLast4?: string;
  bankIfsc?: string;
  bankAccountHolder?: string;
  bio?: string;
}

export default function AdminSellersPage() {
  const { token } = useAdminAuth();
  const [sellers, setSellers] = useState<SellerItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetSellerId, setTargetSellerId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Detail inspection modal
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectData, setInspectData] = useState<SellerDetailModalData | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  const fetchSellers = async (p = page, s = statusFilter, q = search) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", p.toString());
      params.set("limit", "15");
      if (s !== "ALL") params.set("status", s);
      if (q.trim()) params.set("search", q.trim());

      const res = await fetch(`/api/v1/admin/sellers?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load sellers register");
      }
      setSellers(data.data.sellers || []);
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
      fetchSellers(1, statusFilter, search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSellers(1, statusFilter, search);
  };

  const handleApprove = async (id: string, storeName: string) => {
    if (!token) return;
    if (!confirm(`Are you sure you want to approve '${storeName}'?`)) return;
    try {
      setActionLoading(true);
      setError(null);
      setActionSuccess(null);
      const res = await fetch(`/api/v1/admin/sellers/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Approval failed");
      }
      setActionSuccess(`Seller '${storeName}' has been approved successfully!`);
      fetchSellers(page, statusFilter, search);
    } catch (err: any) {
      setError(err.message || "Failed to approve seller");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (id: string) => {
    setTargetSellerId(id);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!token || !targetSellerId) return;
    if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
      alert("Please provide a rejection reason (minimum 5 characters).");
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      setActionSuccess(null);
      const res = await fetch(`/api/v1/admin/sellers/${targetSellerId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Rejection failed");
      }
      setRejectModalOpen(false);
      setActionSuccess("Seller application has been rejected.");
      fetchSellers(page, statusFilter, search);
    } catch (err: any) {
      setError(err.message || "Failed to reject seller");
    } finally {
      setActionLoading(false);
    }
  };

  const handleInspect = async (id: string) => {
    if (!token) return;
    try {
      setInspectLoading(true);
      setInspectModalOpen(true);
      const res = await fetch(`/api/v1/admin/sellers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to inspect seller application");
      }
      setInspectData(data.data.seller);
    } catch (err: any) {
      alert(err.message || "Failed to inspect seller");
      setInspectModalOpen(false);
    } finally {
      setInspectLoading(false);
    }
  };

  const formatRupee = (paise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(paise / 100);
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
            Pending Review
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400">
            Suspended
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
          <h1 className="text-2xl font-bold tracking-tight text-white">Seller Management Register</h1>
          <p className="text-xs text-slate-400 mt-1">
            Review onboarding submissions, inspect verified merchant credentials, and moderate statuses.
          </p>
        </div>
        <button
          onClick={() => fetchSellers(page, statusFilter, search)}
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

      {actionSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800 md:border-b-0">
          {[
            { label: "All Sellers", value: "ALL" },
            { label: "Pending Moderation", value: "PENDING" },
            { label: "Approved", value: "APPROVED" },
            { label: "Rejected", value: "REJECTED" },
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
              placeholder="Search store name, email..."
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

      {/* Sellers Register Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-rose-500" />
            <p className="text-xs font-medium">Loading seller register...</p>
          </div>
        ) : sellers.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Store className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">No Sellers Found</h3>
            <p className="text-xs text-slate-500 mt-1">Try clearing filters or changing search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Store & Slug</th>
                  <th className="py-3 px-4">Owner Account</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Catalog</th>
                  <th className="py-3 px-4">Revenue</th>
                  <th className="py-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {sellers.map((seller) => (
                  <tr key={seller.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{seller.storeName}</div>
                      <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                        /{seller.storeSlug}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-medium">{seller.user.fullName}</div>
                      <div className="text-[11px] text-slate-400">{seller.user.email}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(seller.status)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                      {seller.productsCount} products
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-300">
                      {formatRupee(seller.totalRevenuePaise)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleInspect(seller.id)}
                          className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
                          title="Inspect KYC & details"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                          Inspect
                        </button>
                        {seller.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleApprove(seller.id, seller.storeName)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenReject(seller.id)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition shadow-sm"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
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
              Page {page} of {totalPages} ({totalCount} total sellers)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchSellers(page - 1, statusFilter, search)}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                onClick={() => fetchSellers(page + 1, statusFilter, search)}
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

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-500" />
              Reject Seller Application
            </h3>
            <p className="text-xs text-slate-400">
              Provide a clear reason for rejecting this seller onboarding application. The reason will be recorded and displayed to the applicant.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Incomplete business address or illegible document attachment."
              className="w-full text-xs p-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={actionLoading || !rejectionReason.trim()}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg disabled:opacity-50"
              >
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspection Modal */}
      {inspectModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-rose-400" />
                Merchant Verification Inspection
              </h3>
              <button onClick={() => setInspectModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {inspectLoading || !inspectData ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
                <p className="text-xs">Loading KYC profile...</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Store Name</span>
                    <span className="text-white font-semibold">{inspectData.storeName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Store Slug</span>
                    <span className="font-mono text-slate-300">/{inspectData.storeSlug}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Merchant Status</span>
                    {getStatusBadge(inspectData.status)}
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Country</span>
                    <span className="text-slate-300">{inspectData.country || "India"}</span>
                  </div>
                </div>

                <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Verified KYC & Settlement Rails
                  </h4>
                  <div className="grid grid-cols-2 gap-3 pt-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">PAN ID (Masked):</span>
                      <span className="font-mono text-slate-300">{inspectData.panNumberMasked || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Bank Account:</span>
                      <span className="font-mono text-slate-300">
                        {inspectData.bankAccountLast4 ? `•••• ${inspectData.bankAccountLast4}` : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Bank IFSC:</span>
                      <span className="font-mono text-slate-300">{inspectData.bankIfsc || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Account Holder:</span>
                      <span className="text-slate-300">{inspectData.bankAccountHolder || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {inspectData.rejectionReason && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
                    <span className="font-semibold block text-[11px] text-rose-400">Rejection Reason:</span>
                    {inspectData.rejectionReason}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
