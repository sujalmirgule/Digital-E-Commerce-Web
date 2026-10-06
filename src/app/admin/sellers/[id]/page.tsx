"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAdminAuth } from "../../AdminAuthContext";
import {
  Store,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building,
  CreditCard,
  User,
  Globe,
  Mail,
  RefreshCw,
  Clock,
} from "lucide-react";

interface SellerDetail {
  id: string;
  userId: string;
  storeName: string;
  storeSlug: string;
  bio: string | null;
  description: string | null;
  country: string;
  status: string;
  rejectionReason: string | null;
  panNumberMasked: string | null;
  bankAccountLast4: string | null;
  bankIfsc: string | null;
  bankAccountHolder: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    createdAt: string;
  };
}

export default function AdminSellerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user: currentAdmin } = useAdminAuth();

  const [seller, setSeller] = useState<SellerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchSeller = async () => {
    if (!token || !id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/admin/sellers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load seller details");
      }
      setSeller(data.data.seller);
    } catch (err: any) {
      setError(err.message || "Failed to load seller");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && id) {
      fetchSeller();
    }
  }, [token, id]);

  const handleApprove = async () => {
    if (!token || !seller) return;
    if (seller.userId === currentAdmin?.id) {
      setError("An administrator cannot approve their own seller application.");
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/admin/sellers/${seller.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to approve seller application");
      }
      setSuccess("Seller application approved successfully.");
      setSeller((prev) => (prev ? { ...prev, status: "APPROVED", rejectionReason: null } : null));
    } catch (err: any) {
      setError(err.message || "Approval failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !seller) return;
    if (!rejectionReason.trim()) {
      setError("A rejection reason is mandatory.");
      return;
    }
    if (seller.userId === currentAdmin?.id) {
      setError("An administrator cannot reject their own seller application.");
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/admin/sellers/${seller.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to reject seller application");
      }
      setSuccess("Seller application rejected.");
      setSeller((prev) => (prev ? { ...prev, status: "REJECTED", rejectionReason: rejectionReason.trim() } : null));
      setRejectModalOpen(false);
      setRejectionReason("");
    } catch (err: any) {
      setError(err.message || "Rejection failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-[#BBAE9F]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#F43F5E] mb-3" />
        <p className="text-xs font-mono">Retrieving seller profile from database...</p>
      </div>
    );
  }

  if (error && !seller) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Link
          href="/admin/sellers"
          className="inline-flex items-center gap-2 text-xs text-[#BBAE9F] hover:text-[#F7EFE2] transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Sellers Register
        </Link>
        <div className="p-6 bg-rose-950/40 border border-rose-900/50 rounded-2xl text-rose-300 space-y-2">
          <div className="flex items-center gap-2 font-medium text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <span>Seller Profile Error</span>
          </div>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (!seller) return null;

  const isSelf = seller.userId === currentAdmin?.id;
  const isPending = seller.status === "PENDING";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/admin/sellers"
            className="inline-flex items-center gap-2 text-xs text-[#BBAE9F] hover:text-[#E8D5B5] transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Sellers Register
          </Link>
          <h1 className="text-2xl font-serif text-[#F7EFE2] flex items-center gap-3">
            <span>{seller.storeName}</span>
            <span
              className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full ${
                seller.status === "APPROVED"
                  ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40"
                  : seller.status === "PENDING"
                  ? "bg-amber-950/60 text-amber-300 border border-amber-800/40"
                  : "bg-rose-950/60 text-rose-300 border border-rose-800/40"
              }`}
            >
              {seller.status}
            </span>
          </h1>
          <p className="text-xs text-[#BBAE9F] font-mono mt-1">
            Store Slug: @{seller.storeSlug} • ID: {seller.id}
          </p>
        </div>

        {/* Action Buttons */}
        {isPending && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRejectModalOpen(true)}
              disabled={actionLoading || isSelf}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-800/40 transition ${
                isSelf ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              Reject Application
            </button>
            <button
              onClick={handleApprove}
              disabled={actionLoading || isSelf}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium bg-[#F43F5E] hover:bg-[#FB7185] text-white shadow-lg shadow-rose-900/25 transition ${
                isSelf ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              {actionLoading ? "Processing..." : "Approve Application"}
            </button>
          </div>
        )}
      </div>

      {isSelf && (
        <div className="p-4 bg-amber-950/40 border border-amber-800/50 rounded-xl text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Notice: This seller profile belongs to your current administrator account. Self-approval or self-rejection is strictly forbidden by platform governance.</span>
        </div>
      )}

      {/* Notifications */}
      {success && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Store & Profile Info */}
        <div className="bg-[#211815] border border-[#3A2930] rounded-2xl p-6 space-y-4">
          <h2 className="text-xs font-mono uppercase text-[#E8D5B5] tracking-wider border-b border-[#3A2930] pb-2 flex items-center gap-2">
            <Store className="w-4 h-4 text-[#FB7185]" /> Store Information
          </h2>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[#BBAE9F] block text-[11px]">Bio</span>
              <p className="text-[#F7EFE2] font-light mt-0.5">{seller.bio || "No bio provided"}</p>
            </div>
            <div>
              <span className="text-[#BBAE9F] block text-[11px]">Description</span>
              <p className="text-[#F7EFE2] font-light mt-0.5 whitespace-pre-wrap">
                {seller.description || "No full description provided"}
              </p>
            </div>
            <div>
              <span className="text-[#BBAE9F] block text-[11px]">Country</span>
              <span className="font-mono text-[#F7EFE2]">{seller.country}</span>
            </div>
            <div>
              <span className="text-[#BBAE9F] block text-[11px]">Application Date</span>
              <span className="font-mono text-[#BBAE9F]">
                {new Date(seller.createdAt).toLocaleString()}
              </span>
            </div>
            {seller.rejectionReason && (
              <div className="p-3 bg-rose-950/40 border border-rose-900/40 rounded-xl">
                <span className="text-rose-400 block text-[11px] font-medium">Rejection Reason</span>
                <p className="text-rose-300 text-xs mt-1">{seller.rejectionReason}</p>
              </div>
            )}
          </div>
        </div>

        {/* KYC & Financial Details (Safely Masked) */}
        <div className="bg-[#211815] border border-[#3A2930] rounded-2xl p-6 space-y-4">
          <h2 className="text-xs font-mono uppercase text-[#E8D5B5] tracking-wider border-b border-[#3A2930] pb-2 flex items-center gap-2">
            <Building className="w-4 h-4 text-[#FB7185]" /> KYC & Financial Data (Protected)
          </h2>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[#BBAE9F] block text-[11px]">Account Holder</span>
              <span className="text-[#F7EFE2] font-medium">{seller.bankAccountHolder || "Not on file"}</span>
            </div>
            <div>
              <span className="text-[#BBAE9F] block text-[11px]">PAN Number (Masked)</span>
              <span className="font-mono text-[#E8D5B5]">{seller.panNumberMasked || "Not provided"}</span>
            </div>
            <div>
              <span className="text-[#BBAE9F] block text-[11px]">Bank Account (Last 4)</span>
              <span className="font-mono text-[#E8D5B5]">{seller.bankAccountLast4 || "Not provided"}</span>
            </div>
            <div>
              <span className="text-[#BBAE9F] block text-[11px]">IFSC Code</span>
              <span className="font-mono text-[#E8D5B5]">{seller.bankIfsc || "Not provided"}</span>
            </div>
            <div className="pt-2 border-t border-[#3A2930] text-[11px] text-[#BBAE9F]/70">
              <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-emerald-400" />
              Full credentials, banking secrets, and private keys are never stored in plain text or leaked via admin API endpoints.
            </div>
          </div>
        </div>

        {/* User Account Link */}
        <div className="bg-[#211815] border border-[#3A2930] rounded-2xl p-6 space-y-4 md:col-span-2">
          <h2 className="text-xs font-mono uppercase text-[#E8D5B5] tracking-wider border-b border-[#3A2930] pb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-[#FB7185]" /> Linked User Account
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
            <div className="space-y-1">
              <div className="font-medium text-[#F7EFE2] text-sm">{seller.user.fullName}</div>
              <div className="text-[#BBAE9F] font-mono">{seller.user.email}</div>
              <div className="text-[11px] text-[#BBAE9F]">
                User ID: {seller.user.id} • Registered: {new Date(seller.user.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div>
              <Link
                href={`/admin/users/${seller.user.id}`}
                className="px-4 py-2 bg-[#2B201C] hover:bg-[#3A2930] border border-[#3A2930] text-[#E8D5B5] text-xs rounded-xl inline-flex items-center gap-1.5 transition"
              >
                Inspect User Profile →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#211815] border border-[#3A2930] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800/40 text-rose-400 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-[#F7EFE2] text-base">Reject Seller Application</h3>
                <p className="text-xs text-[#BBAE9F]">{seller.storeName}</p>
              </div>
            </div>

            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#BBAE9F] mb-1.5">
                  Rejection Reason (Required)
                </label>
                <textarea
                  rows={4}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide clear reason for rejection (e.g. Invalid PAN details, insufficient store description)..."
                  className="w-full text-xs p-3 bg-[#1B101B] border border-[#3A2930] rounded-xl text-[#F7EFE2] outline-none focus:border-[#E8D5B5] transition"
                />
              </div>

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs text-[#BBAE9F] hover:text-[#F7EFE2] rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="px-4 py-2 text-xs font-medium bg-[#F43F5E] hover:bg-[#FB7185] text-white rounded-xl shadow-lg transition"
                >
                  {actionLoading ? "Processing..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
