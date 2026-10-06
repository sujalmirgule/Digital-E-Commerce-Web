"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSellerAuth } from "../SellerAuthContext";
import {
  Settings,
  Store,
  ShieldCheck,
  Save,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Globe,
  Lock,
} from "lucide-react";

export default function SellerSettingsPage() {
  const { token, fetchWithAuth } = useSellerAuth();
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [country, setCountry] = useState("India");
  const [status, setStatus] = useState("APPROVED");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithAuth("/api/v1/seller/profile");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load seller settings");
      }
      setStoreName(json.data.storeName || "");
      setStoreSlug(json.data.storeSlug || "");
      setCountry(json.data.country || "India");
      setStatus(json.data.status || "APPROVED");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [token, fetchWithAuth]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

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
        throw new Error(data.error?.message || "Failed to update store settings");
      }

      setStoreName(data.data.storeName);
      setSuccess("Store settings updated successfully!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-velvet-border/80">
        <h1 className="text-3xl font-serif font-normal text-velvet-cream-soft tracking-tight">
          Store Settings
        </h1>
        <p className="text-xs text-velvet-cream-muted mt-1">
          Configure creator storefront identity, public brand presence, and account security.
        </p>
      </div>

      {loading ? (
        <div className="bg-velvet-mocha rounded-2xl border border-velvet-border p-16 text-center text-velvet-cream-muted">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-velvet-rose" />
          <p className="text-xs font-mono">Loading settings...</p>
        </div>
      ) : (
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

          <form onSubmit={handleSave} className="bg-velvet-mocha rounded-2xl border border-velvet-border p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-serif text-velvet-cream-soft border-b border-velvet-border/60 pb-3 flex items-center gap-2">
              <Store className="w-4 h-4 text-velvet-cream" />
              <span>Storefront Configuration</span>
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
                  placeholder="Creative Studio"
                  className="w-full text-xs p-3 bg-velvet-plum border border-velvet-border rounded-xl text-velvet-cream focus:outline-none focus:border-velvet-cream transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-velvet-cream-muted mb-1.5">
                  Public Storefront Slug (Immutable)
                </label>
                <input
                  type="text"
                  disabled
                  value={`/${storeSlug}`}
                  className="w-full text-xs p-3 bg-velvet-plum/40 border border-velvet-border rounded-xl text-velvet-cream-muted font-mono cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div>
                <label className="block text-xs font-mono text-velvet-cream-muted mb-1.5">
                  Country / Operating Jurisdiction
                </label>
                <div className="flex items-center gap-2 p-3 bg-velvet-plum border border-velvet-border rounded-xl text-xs text-velvet-cream">
                  <Globe className="w-4 h-4 text-velvet-cream-muted" />
                  <span>{country}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-velvet-cream-muted mb-1.5">
                  Accreditation Status
                </label>
                <div className="flex items-center gap-2 p-3 bg-velvet-plum border border-velvet-border rounded-xl text-xs text-emerald-400 font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{status}</span>
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
                <span>{saving ? "Saving..." : "Save Settings"}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
