"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Store,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { SpatialBackground } from "@/components/ui/SpatialBackground";
import { MarketplaceNavbar } from "@/components/ui/MarketplaceNavbar";
import { MarketplaceFooter } from "@/components/ui/MarketplaceFooter";

interface SellerStatusUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  hasSellerProfile: boolean;
  sellerStatus: string | null;
}

interface SellerProfileSnapshot {
  storeName?: string;
  storeSlug?: string;
  createdAt?: string;
}

export default function SellerApplicationStatusPage() {
  const router = useRouter();
  const [user, setUser] = useState<SellerStatusUser | null>(null);
  const [profile, setProfile] = useState<SellerProfileSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setError(null);
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("seller_token") ||
        localStorage.getItem("buyer_token");

      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        router.push("/login");
        return;
      }

      const json = await res.json();
      const authUser = json.data?.user || json.data;
      setUser(authUser);

      if (authUser.hasSellerProfile) {
        // Try fetching seller profile details
        try {
          const profRes = await fetch("/api/v1/seller/profile", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (profRes.ok) {
            const profData = await profRes.json();
            setProfile(profData.data);
          }
        } catch {
          // Fallback gracefully
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load application status");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  return (
    <SpatialBackground>
      <MarketplaceNavbar />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-28 relative">
        <div className="w-full max-w-xl">
          {loading ? (
            <div className="p-12 text-center text-xs text-[#BBAE9F]">
              Loading application records...
            </div>
          ) : !user?.hasSellerProfile ? (
            <div className="rounded-3xl border border-[#3A2930] bg-[#211815] p-8 text-center space-y-4 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-[#1B101B] border border-[#3A2930] flex items-center justify-center text-[#E8D5B5] mx-auto">
                <Store className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-editorial text-[#F7EFE2]">No Active Seller Application</h1>
              <p className="text-xs text-[#BBAE9F] max-w-md mx-auto leading-relaxed">
                You haven&apos;t submitted a creator application yet. Apply to become a seller and begin publishing digital assets.
              </p>
              <div className="pt-2">
                <Link
                  href="/seller/signup"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-medium text-white bg-[#F43F5E] hover:bg-[#FB7185] transition-colors"
                >
                  <span>Apply Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : user.sellerStatus === "APPROVED" ? (
            <div className="rounded-3xl border border-[#3A2930] bg-[#211815] p-8 text-center space-y-5 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-400 font-bold block mb-1">
                  Verified Creator Profile
                </span>
                <h1 className="text-2xl sm:text-3xl font-editorial text-[#F7EFE2]">
                  Your Store is Approved!
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-[#BBAE9F] max-w-md mx-auto leading-relaxed font-light">
                Congratulations! Platform administration has verified your creator credentials for{" "}
                <strong className="text-[#E8D5B5] font-medium">{profile?.storeName || "your studio"}</strong>. You have full access to publish products and monitor ledger earnings.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/seller"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full text-xs font-medium text-white bg-[#F43F5E] hover:bg-[#FB7185] shadow-lg shadow-[#F43F5E]/30 transition-all"
                >
                  <span>Enter Seller Studio</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-xs font-medium text-[#BBAE9F] hover:text-[#F7EFE2] border border-[#3A2930] hover:bg-[#2B201C] transition-all"
                >
                  <span>Buyer Hub</span>
                </Link>
              </div>
            </div>
          ) : user.sellerStatus === "REJECTED" ? (
            <div className="rounded-3xl border border-rose-900/40 bg-[#211815] p-8 text-center space-y-5 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-rose-400 font-bold block mb-1">
                  Application Decision
                </span>
                <h1 className="text-2xl sm:text-3xl font-editorial text-rose-200">
                  Seller Application Not Approved
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-[#BBAE9F] max-w-md mx-auto leading-relaxed font-light">
                Your creator application did not satisfy our verification guidelines or compliance requirements. You can continue purchasing digital assets from the marketplace or contact support for clarification.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-xs font-medium text-white bg-[#2B201C] border border-[#3A2930] hover:border-[#E8D5B5]/50 transition-all"
                >
                  <span>Return to Buyer Hub</span>
                </Link>
                <Link
                  href="/products"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-xs font-medium text-[#BBAE9F] hover:text-[#F7EFE2] border border-[#3A2930] transition-all"
                >
                  <span>Browse Products</span>
                </Link>
              </div>
            </div>
          ) : (
            /* PENDING STATUS */
            <div className="rounded-3xl border border-[#3A2930] bg-[#211815] p-8 text-center space-y-6 shadow-2xl shadow-black/80">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <Clock className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-amber-400 font-bold block mb-1">
                  Verification in Progress
                </span>
                <h1 className="text-2xl sm:text-3xl font-editorial text-[#F7EFE2]">
                  Application Under Review
                </h1>
              </div>

              <p className="text-xs sm:text-sm text-[#BBAE9F] max-w-md mx-auto leading-relaxed font-light">
                Your store profile for{" "}
                <strong className="text-[#E8D5B5] font-medium">{profile?.storeName || "your studio"}</strong> is currently undergoing administrative compliance and KYC verification.
              </p>

              {/* Status Details Card */}
              <div className="p-4 rounded-2xl bg-[#1B101B] border border-[#3A2930] text-left space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#BBAE9F]">Review Queue:</span>
                  <span className="text-amber-400 font-mono font-medium">PENDING_ADMIN_APPROVAL</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#BBAE9F]">Store Identifier:</span>
                  <span className="text-[#F7EFE2] font-mono">{profile?.storeSlug || "Registered"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#BBAE9F]">SLA Timeline:</span>
                  <span className="text-[#E8D5B5]">24 - 48 business hours</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-medium text-[#F7EFE2] bg-[#2B201C] border border-[#3A2930] hover:border-[#E8D5B5]/50 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                  <span>{refreshing ? "Checking Status..." : "Refresh Status"}</span>
                </button>
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-medium text-white bg-[#F43F5E] hover:bg-[#FB7185] transition-all"
                >
                  <span>Go to Buyer Hub</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <MarketplaceFooter />
    </SpatialBackground>
  );
}
