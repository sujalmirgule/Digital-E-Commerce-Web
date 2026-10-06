"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAdminAuth } from "../../AdminAuthContext";
import {
  User,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Calendar,
  Mail,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  Star,
  Download,
  Heart,
  Store,
  RefreshCw,
  Power,
} from "lucide-react";

interface UserDetail {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  sellerProfile: {
    id: string;
    storeName: string;
    storeSlug: string;
    status: string;
    rejectionReason: string | null;
    createdAt: string;
  } | null;
  ordersCount: number;
  reviewsCount: number;
  downloadsCount: number;
  wishlistsCount: number;
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user: currentAdmin } = useAdminAuth();

  const [userData, setUserData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const fetchUserDetail = async () => {
    if (!token || !id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load user details");
      }
      setUserData(data.data.user || data.data);
    } catch (err: any) {
      setError(err.message || "Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && id) {
      fetchUserDetail();
    }
  }, [token, id]);

  const handleToggleStatus = async () => {
    if (!token || !userData) return;
    if (userData.id === currentAdmin?.id) {
      setError("An administrator cannot deactivate their own account.");
      setConfirmModalOpen(false);
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      const nextState = !userData.isActive;
      const res = await fetch(`/api/v1/admin/users/${userData.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: nextState }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update account state");
      }
      setSuccess(`User successfully ${nextState ? "activated" : "deactivated"}.`);
      setUserData((prev) => (prev ? { ...prev, isActive: nextState } : null));
      setConfirmModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-[#BBAE9F]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#F43F5E] mb-3" />
        <p className="text-xs font-mono">Retrieving secure user record from database...</p>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-xs text-[#BBAE9F] hover:text-[#F7EFE2] transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Users Directory
        </Link>
        <div className="p-6 bg-rose-950/40 border border-rose-900/50 rounded-2xl text-rose-300 space-y-2">
          <div className="flex items-center gap-2 font-medium text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <span>User Retrieval Error</span>
          </div>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (!userData) return null;

  const isSelf = userData.id === currentAdmin?.id;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Navigation & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 text-xs text-[#BBAE9F] hover:text-[#E8D5B5] transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Users Directory
          </Link>
          <h1 className="text-2xl font-serif text-[#F7EFE2] flex items-center gap-3">
            <span>{userData.fullName}</span>
            {isSelf && (
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#F43F5E]/20 text-[#FB7185] border border-[#F43F5E]/30">
                Current Admin
              </span>
            )}
          </h1>
          <p className="text-xs text-[#BBAE9F] font-mono mt-1">{userData.id}</p>
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={() => setConfirmModalOpen(true)}
            disabled={actionLoading || isSelf}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 transition ${
              userData.isActive
                ? "bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-800/40"
                : "bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-800/40"
            } ${isSelf ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <Power className="w-4 h-4" />
            <span>{userData.isActive ? "Deactivate Account" : "Activate Account"}</span>
          </button>
        </div>
      </div>

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

      {/* Grid: Identity, Role, Account Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Identity & Account Card */}
        <div className="bg-[#211815] border border-[#3A2930] rounded-2xl p-6 space-y-4">
          <h2 className="text-xs font-mono uppercase text-[#E8D5B5] tracking-wider border-b border-[#3A2930] pb-2">
            Identity & Status
          </h2>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[#BBAE9F] block text-[11px]">Email Address</span>
              <span className="font-mono text-[#F7EFE2] break-all">{userData.email}</span>
            </div>
            <div>
              <span className="text-[#BBAE9F] block text-[11px]">Platform Role</span>
              <span
                className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                  userData.role === "ADMIN"
                    ? "bg-[#F43F5E]/20 text-[#FB7185] border border-[#F43F5E]/30"
                    : "bg-[#2B201C] text-[#E8D5B5] border border-[#3A2930]"
                }`}
              >
                {userData.role}
              </span>
            </div>
            <div>
              <span className="text-[#BBAE9F] block text-[11px]">Account State</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {userData.isActive ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                    <XCircle className="w-3.5 h-3.5" /> Deactivated / Inactive
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="text-[#BBAE9F] block text-[11px]">Email Verified</span>
              <span className="text-[#F7EFE2]">
                {userData.isEmailVerified ? "Verified (True)" : "Unverified (False)"}
              </span>
            </div>
            <div>
              <span className="text-[#BBAE9F] block text-[11px]">Created At</span>
              <span className="text-[#BBAE9F] font-mono">
                {new Date(userData.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Merchant Profile Status */}
        <div className="bg-[#211815] border border-[#3A2930] rounded-2xl p-6 space-y-4">
          <h2 className="text-xs font-mono uppercase text-[#E8D5B5] tracking-wider border-b border-[#3A2930] pb-2">
            Merchant Status
          </h2>
          {userData.sellerProfile ? (
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#BBAE9F] block text-[11px]">Store Name</span>
                <span className="text-[#F7EFE2] font-medium">
                  {userData.sellerProfile.storeName}
                </span>
              </div>
              <div>
                <span className="text-[#BBAE9F] block text-[11px]">Store Slug</span>
                <span className="font-mono text-[#E8D5B5]">
                  @{userData.sellerProfile.storeSlug}
                </span>
              </div>
              <div>
                <span className="text-[#BBAE9F] block text-[11px]">Approval State</span>
                <span
                  className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                    userData.sellerProfile.status === "APPROVED"
                      ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40"
                      : userData.sellerProfile.status === "PENDING"
                      ? "bg-amber-950/60 text-amber-300 border border-amber-800/40"
                      : "bg-rose-950/60 text-rose-300 border border-rose-800/40"
                  }`}
                >
                  {userData.sellerProfile.status}
                </span>
              </div>
              {userData.sellerProfile.rejectionReason && (
                <div>
                  <span className="text-rose-400 block text-[11px]">Rejection Reason</span>
                  <p className="text-rose-300 text-xs mt-0.5 bg-rose-950/30 p-2 rounded-lg border border-rose-900/30">
                    {userData.sellerProfile.rejectionReason}
                  </p>
                </div>
              )}
              <div className="pt-2">
                <Link
                  href={`/admin/sellers/${userData.sellerProfile.id}`}
                  className="text-xs text-[#FB7185] hover:underline inline-flex items-center gap-1"
                >
                  <Store className="w-3.5 h-3.5" /> Inspect Seller Profile →
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-[#BBAE9F] space-y-2">
              <Store className="w-8 h-8 mx-auto text-[#3A2930]" />
              <p className="text-xs">No merchant application submitted.</p>
              <span className="text-[10px] font-mono text-[#BBAE9F]/60">Standard Buyer Account</span>
            </div>
          )}
        </div>

        {/* Activity & Counters */}
        <div className="bg-[#211815] border border-[#3A2930] rounded-2xl p-6 space-y-4">
          <h2 className="text-xs font-mono uppercase text-[#E8D5B5] tracking-wider border-b border-[#3A2930] pb-2">
            Platform Engagement
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#1B101B] border border-[#3A2930] rounded-xl text-center">
              <ShoppingBag className="w-4 h-4 mx-auto text-[#E8D5B5] mb-1" />
              <span className="text-lg font-serif text-[#F7EFE2] block">
                {userData.ordersCount}
              </span>
              <span className="text-[10px] font-mono text-[#BBAE9F] uppercase">Orders</span>
            </div>
            <div className="p-3 bg-[#1B101B] border border-[#3A2930] rounded-xl text-center">
              <Star className="w-4 h-4 mx-auto text-amber-400 mb-1" />
              <span className="text-lg font-serif text-[#F7EFE2] block">
                {userData.reviewsCount}
              </span>
              <span className="text-[10px] font-mono text-[#BBAE9F] uppercase">Reviews</span>
            </div>
            <div className="p-3 bg-[#1B101B] border border-[#3A2930] rounded-xl text-center">
              <Download className="w-4 h-4 mx-auto text-[#FB7185] mb-1" />
              <span className="text-lg font-serif text-[#F7EFE2] block">
                {userData.downloadsCount}
              </span>
              <span className="text-[10px] font-mono text-[#BBAE9F] uppercase">Downloads</span>
            </div>
            <div className="p-3 bg-[#1B101B] border border-[#3A2930] rounded-xl text-center">
              <Heart className="w-4 h-4 mx-auto text-rose-400 mb-1" />
              <span className="text-lg font-serif text-[#F7EFE2] block">
                {userData.wishlistsCount}
              </span>
              <span className="text-[10px] font-mono text-[#BBAE9F] uppercase">Wishlists</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Activation / Deactivation */}
      {confirmModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#211815] border border-[#3A2930] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  userData.isActive
                    ? "bg-rose-950/60 text-rose-400 border border-rose-800/40"
                    : "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                }`}
              >
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-[#F7EFE2] text-base">
                  Confirm {userData.isActive ? "Deactivation" : "Activation"}
                </h3>
                <p className="text-xs text-[#BBAE9F]">
                  Affects account access for {userData.fullName}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#BBAE9F] leading-relaxed">
              {userData.isActive
                ? "Deactivating this user will immediately block all protected access across the marketplace. The user will not be able to log in, access downloads, or place orders until reactivated."
                : "Activating this user will restore standard access privileges to the platform."}
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs text-[#BBAE9F] hover:text-[#F7EFE2] rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={actionLoading}
                className={`px-4 py-2 text-xs font-medium rounded-xl transition shadow-lg ${
                  userData.isActive
                    ? "bg-[#F43F5E] hover:bg-[#FB7185] text-white shadow-rose-900/30"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30"
                }`}
              >
                {actionLoading
                  ? "Processing..."
                  : `Confirm ${userData.isActive ? "Deactivation" : "Activation"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
