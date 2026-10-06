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
  ShieldCheck,
  FileText,
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load application status";
      setError(msg);
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

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20 sm:py-28 relative">
        <div className="w-full max-w-xl mx-auto">
          {loading ? (
            <div className="p-12 text-center text-xs font-mono text-[#6B4632]">
              Verifying creator status records...
            </div>
          ) : !user?.hasSellerProfile ? (
            <div className="rounded-2xl border border-[#E6DBD1] bg-[#FFFFFF] p-8 sm:p-10 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-full bg-[#F3E9DD] border border-[#D8BFA5] flex items-center justify-center text-[#3B2418] mx-auto">
                <Store className="w-7 h-7" />
              </div>
              <h1 className="font-serif text-2xl font-medium text-[#111111]">No Active Seller Application</h1>
              <p className="text-xs text-[#6B4632] max-w-md mx-auto leading-relaxed font-light">
                You haven&apos;t submitted a creator application yet. Apply to become a seller and begin publishing digital assets.
              </p>
              <div className="pt-2">
                <Link
                  href="/signup/seller"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#FFFFFF] bg-[#111111] hover:bg-[#3B2418] transition-colors"
                >
                  <span>Apply Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : user.sellerStatus === "APPROVED" ? (
            <div className="rounded-2xl border border-[#E6DBD1] bg-[#FFFFFF] p-8 sm:p-10 text-center space-y-5 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-700 font-bold block mb-1">
                  VERIFIED CREATOR PROFILE
                </span>
                <h1 className="font-serif text-2xl sm:text-3xl font-medium text-[#111111]">
                  Your Store is Approved!
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-[#6B4632] max-w-md mx-auto leading-relaxed font-light">
                Congratulations! Administration has verified your seller profile for{" "}
                <strong className="text-[#111111] font-semibold">{profile?.storeName || "your studio"}</strong>. You have full access to publish products and manage earnings.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/seller"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#FFFFFF] bg-[#111111] hover:bg-[#3B2418] shadow-sm transition-all"
                >
                  <span>Enter Seller Studio</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-xs font-mono uppercase tracking-wider font-medium text-[#6B4632] hover:text-[#111111] border border-[#E6DBD1] hover:bg-[#FAF8F4] transition-all"
                >
                  <span>Buyer Hub</span>
                </Link>
              </div>
            </div>
          ) : user.sellerStatus === "REJECTED" ? (
            <div className="rounded-2xl border border-[#B42318]/30 bg-[#FFFFFF] p-8 sm:p-10 text-center space-y-5 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-[#FEF3F2] border border-[#B42318]/20 flex items-center justify-center text-[#B42318] mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-[#B42318] font-bold block mb-1">
                  APPLICATION DECISION
                </span>
                <h1 className="font-serif text-2xl sm:text-3xl font-medium text-[#111111]">
                  Seller Application Not Approved
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-[#6B4632] max-w-md mx-auto leading-relaxed font-light">
                Your creator application did not satisfy our verification guidelines or compliance requirements. You can continue purchasing digital assets from the marketplace or contact support for clarification.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#FFFFFF] bg-[#111111] hover:bg-[#3B2418] transition-all"
                >
                  <span>Return to Buyer Hub</span>
                </Link>
                <Link
                  href="/discover"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-xs font-mono uppercase tracking-wider font-medium text-[#6B4632] hover:text-[#111111] border border-[#E6DBD1] hover:bg-[#FAF8F4] transition-all"
                >
                  <span>Browse Products</span>
                </Link>
              </div>
            </div>
          ) : (
            /* PENDING STATUS */
            <div className="rounded-2xl border border-[#E6DBD1] bg-[#FFFFFF] p-8 sm:p-10 text-center space-y-6 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mx-auto">
                <Clock className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-amber-800 font-bold block mb-1">
                  VERIFICATION IN PROGRESS
                </span>
                <h1 className="font-serif text-2xl sm:text-3xl font-medium text-[#111111]">
                  Your seller application is under review.
                </h1>
              </div>

              <p className="text-xs sm:text-sm text-[#6B4632] max-w-md mx-auto leading-relaxed font-light">
                Your store profile for{" "}
                <strong className="text-[#111111] font-semibold">{profile?.storeName || "your studio"}</strong> is currently undergoing administrative compliance and KYC verification.
              </p>

              {/* Status Details Card */}
              <div className="p-4 rounded-xl bg-[#FAF8F4] border border-[#E6DBD1] text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#6B4632]">Review Status:</span>
                  <span className="text-amber-800 font-mono font-bold">PENDING_ADMIN_APPROVAL</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6B4632]">Store Identifier:</span>
                  <span className="text-[#111111] font-mono">{profile?.storeSlug || "Registered"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6B4632]">Estimated Review Window:</span>
                  <span className="text-[#3B2418] font-mono">24 – 48 business hours</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md text-xs font-mono uppercase tracking-wider font-medium text-[#111111] bg-[#FAF8F4] border border-[#E6DBD1] hover:border-[#3B2418] transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                  <span>{refreshing ? "Checking Status..." : "Refresh Status"}</span>
                </button>
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#FFFFFF] bg-[#111111] hover:bg-[#3B2418] transition-all"
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
