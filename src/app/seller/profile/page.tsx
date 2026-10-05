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
  ExternalLink,
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
  const { token } = useSellerAuth();
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
      const res = await fetch("/api/v1/seller/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load seller profile");
      }
      setProfile(data.data);
      setStoreName(data.data.storeName || "");
    } catch (err: any) {
      setError(err.message || "An error occurred");
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

      const res = await fetch("/api/v1/seller/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ storeName: storeName.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update seller profile");
      }

      setProfile((prev) => (prev ? { ...prev, storeName: data.data.storeName } : null));
      setSuccess("Store profile updated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to save profile");
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Store Profile & Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your public seller brand, verification records, and workspace configurations.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
          <p className="text-sm font-medium">Loading store profile...</p>
        </div>
      ) : profile ? (
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {/* Verification Banner */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{profile.storeName}</h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    APPROVED SELLER
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Store Slug: <span className="font-mono text-slate-700">/{profile.storeSlug}</span>
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5 self-start sm:self-center">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Member since {formatDate(profile.createdAt)}</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
            <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
              Store Identity
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Store Display Name
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Apex Creative Studio"
                  className="w-full text-sm p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Visible to buyers across all your published product listings.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Store URL Slug
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-3 text-sm bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-slate-500">
                    marketplace.com/seller/
                  </span>
                  <input
                    type="text"
                    disabled
                    value={profile.storeSlug}
                    className="w-full text-sm p-3 bg-slate-50 border border-slate-300 rounded-r-lg text-slate-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Unique store identifier assigned during seller onboarding.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Jurisdiction / Country
                </label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span>{profile.country || "India"}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Seller Account ID
                </label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>{profile.id}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>

          {/* Payout & Settlement Information */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
            <h3 className="text-base font-semibold text-slate-900">
              Payouts & Financial Settlement
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Real-world bank payout wire rails are processed according to marketplace compliance schedules. Cleared earnings in your available balance are accounted server-side in integer paise with double-entry cryptographic verification.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                Banking & Payout rails managed by marketplace administrator
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
