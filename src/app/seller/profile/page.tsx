"use client";

import React, { useEffect, useState } from "react";
import { useSellerAuth } from "../SellerAuthContext";
import {
  Store,
  ShieldCheck,
  Globe,
  Calendar,
  Save,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Lock,
} from "lucide-react";

interface SellerProfileData {
  id: string;
  storeName: string;
  storeSlug: string;
  status: string;
  country: string;
  totalRevenuePaise: number;
  netEarningsPaise: number;
  availableBalance: number;
  pendingBalance: number;
  createdAt: string;
  updatedAt: string;
}

export default function SellerProfilePage() {
  const { token, fetchWithAuth } = useSellerAuth();
  const [profile, setProfile] = useState<SellerProfileData | null>(null);
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithAuth("/api/v1/seller/profile");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load seller profile");
      }
      setProfile(data.data);
      setStoreName(data.data.storeName || "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!storeName.trim() || storeName.trim().length < 2) {
      setError("Store name must be at least 2 characters long.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetchWithAuth("/api/v1/seller/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName: storeName.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update seller profile");
      }

      setProfile((prev) => (prev ? { ...prev, storeName: data.data.storeName } : null));
      setSuccess("Store identity details updated successfully!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-velvet-border/80">
        <h1 className="text-3xl font-serif font-normal text-velvet-cream-soft tracking-tight">
          Seller Profile & Identity
        </h1>
        <p className="text-xs text-velvet-cream-muted mt-1">
          Manage your verified storefront brand, creator accreditation, and payout configurations.
        </p>
      </div>

      {loading ? (
        <div className="bg-velvet-mocha rounded-2xl border border-velvet-border p-16 text-center text-velvet-cream-muted">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-velvet-rose" />
          <p className="text-xs font-mono">Loading creator identity...</p>
        </div>
      ) : profile ? (
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* Verification Banner */}
          <div className="bg-velvet-mocha rounded-2xl border border-velvet-border p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-velvet-plum border border-velvet-border flex items-center justify-center text-velvet-rose">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-serif text-velvet-cream-soft">{profile.storeName}</h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    APPROVED SELLER
                  </span>
                </div>
                <p className="text-xs font-mono text-velvet-cream-muted mt-0.5">
                  Store Slug: <span className="text-velvet-cream">/{profile.storeSlug}</span>
                </p>
              </div>
            </div>
            <div className="text-xs text-velvet-cream-muted flex items-center gap-1.5 self-start sm:self-center font-mono text-[11px]">
              <Calendar className="w-4 h-4 text-velvet-cream-muted" />
              <span>Verified since {formatDate(profile.createdAt)}</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="bg-velvet-mocha rounded-2xl border border-velvet-border p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-serif text-velvet-cream-soft border-b border-velvet-border/60 pb-3">
              Storefront Branding
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-mono text-velvet-cream-muted mb-1.5">
                  Store Display Name
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Apex Creative Studio"
                  className="w-full text-xs p-3 bg-velvet-plum border border-velvet-border rounded-xl text-velvet-cream focus:outline-none focus:border-velvet-cream transition"
                />
                <p className="text-[10px] text-velvet-cream-muted mt-1">
                  Publicly displayed across all your product listings and store catalog.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono text-velvet-cream-muted mb-1.5">
                  Storefront URL Slug (Immutable)
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-3 text-xs bg-velvet-plum/60 border border-r-0 border-velvet-border rounded-l-xl text-velvet-cream-muted font-mono">
                    marketify.com/seller/
                  </span>
                  <input
                    type="text"
                    disabled
                    value={profile.storeSlug}
                    className="w-full text-xs p-3 bg-velvet-plum/40 border border-velvet-border rounded-r-xl text-velvet-cream-muted font-mono cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-velvet-cream-muted mt-1">
                  Assigned during seller onboarding to preserve permanent search indexing.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div>
                <label className="block text-xs font-mono text-velvet-cream-muted mb-1.5">
                  Jurisdiction / Country
                </label>
                <div className="flex items-center gap-2 p-3 bg-velvet-plum border border-velvet-border rounded-xl text-xs text-velvet-cream">
                  <Globe className="w-4 h-4 text-velvet-cream-muted" />
                  <span>{profile.country || "India"}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-velvet-cream-muted mb-1.5">
                  Seller Account ID
                </label>
                <div className="flex items-center gap-2 p-3 bg-velvet-plum border border-velvet-border rounded-xl text-xs font-mono text-velvet-cream-muted">
                  <Lock className="w-4 h-4 text-velvet-cream-muted" />
                  <span>{profile.id}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-velvet-border/60">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-velvet-rose hover:bg-velvet-rose-soft text-white text-xs font-semibold rounded-full disabled:opacity-50 transition-colors shadow-md"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? "Saving Changes..." : "Save Store Details"}</span>
              </button>
            </div>
          </form>

          {/* Masked Payout Rails Notice */}
          <div className="bg-velvet-mocha rounded-2xl border border-velvet-border p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-serif text-velvet-cream-soft">
              Settlement Rails & Regulatory Compliance
            </h3>
            <p className="text-xs text-velvet-cream-muted leading-relaxed font-light">
              Banking credentials and tax identification (PAN / GSTIN) are cryptographically tokenized and masked server-side. For compliance and financial safety, banking modification requires verified administrator reconciliation.
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-velvet-plum px-3 py-1.5 rounded-lg border border-velvet-border">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Payout rail tokenization active · Double-entry ledger verified
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
