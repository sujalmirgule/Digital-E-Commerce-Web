"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useDashboardAuth } from "../DashboardAuthContext";

interface FullUserProfile {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function BuyerProfilePage() {
  const { token, fetchWithAuth, refreshProfile } = useDashboardAuth();
  const [profile, setProfile] = useState<FullUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithAuth("/api/v1/users/me");
      const json = await res.json();

      if (res.ok && json.data?.user) {
        setProfile(json.data.user);
        setFullName(json.data.user.fullName || "");
      } else {
        setError(json.error?.message || "Failed to load user profile");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [token, fetchWithAuth]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setUpdateError(null);

    try {
      const res = await fetchWithAuth("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fullName.trim() }),
      });

      const json = await res.json();
      if (res.ok && json.data?.user) {
        setProfile(json.data.user);
        setSuccessMsg("Profile updated successfully!");
        refreshProfile();
      } else {
        setUpdateError(json.error?.message || "Failed to update profile");
      }
    } catch {
      setUpdateError("Network error updating profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="pb-4 border-b border-velvet-border/80">
        <h1 className="text-3xl font-serif font-normal text-velvet-cream-soft tracking-tight">
          Account Settings
        </h1>
        <p className="text-velvet-cream-muted text-xs mt-1">
          Manage your personal information, profile credentials, and marketplace preferences.
        </p>
      </div>

      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-52 bg-velvet-mocha border border-velvet-border/80 rounded-2xl p-5"></div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-velvet-mocha border border-rose-900/50 text-rose-200 text-sm flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={loadProfile} className="px-3 py-1 bg-velvet-rose text-white rounded-lg text-xs font-medium">
            Retry
          </button>
        </div>
      )}

      {!loading && profile && (
        <div className="space-y-6">
          {/* Status Badges */}
          <div className="p-5 rounded-2xl bg-velvet-mocha border border-velvet-border/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-serif text-velvet-cream">Account Status:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-medium uppercase text-[10px] tracking-wider ${
                  profile.isActive
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                }`}
              >
                {profile.isActive ? "Verified Collector" : "Inactive"}
              </span>
            </div>

            <div className="text-velvet-cream-muted">
              Role: <strong className="text-velvet-cream font-medium">{profile.role}</strong> · Member since{" "}
              {new Date(profile.createdAt).toLocaleDateString()}
            </div>
          </div>

          {/* Edit Form */}
          <form
            onSubmit={handleProfileSubmit}
            className="p-6 rounded-2xl bg-velvet-mocha border border-velvet-border/80 space-y-5"
          >
            <h2 className="font-serif font-medium text-velvet-cream-soft text-base">
              Personal Information
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-velvet-cream-muted font-medium mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-velvet-plum border border-velvet-border text-velvet-cream placeholder-velvet-cream-muted/50 focus:outline-none focus:border-velvet-cream/60 transition-colors"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-velvet-cream-muted font-medium mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl bg-velvet-plum/60 border border-velvet-border text-velvet-cream-muted/70 cursor-not-allowed"
                />
                <span className="text-[11px] text-velvet-cream-muted/60 mt-1 block">
                  Email addresses are primary account identifiers and cannot be altered.
                </span>
              </div>

              <div className="pt-2">
                <div className="text-velvet-cream-soft font-medium">Security & Vault Cryptography</div>
                <div className="text-[11px] text-velvet-cream-muted mt-0.5">
                  Password protected using salted cryptographic hashes with JWT-secured access tokens.
                </div>
              </div>
            </div>

            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs font-medium">
                {successMsg}
              </div>
            )}

            {updateError && (
              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/40 text-rose-300 text-xs font-medium">
                {updateError}
              </div>
            )}

            <div className="pt-4 border-t border-velvet-border/70 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-full bg-velvet-rose hover:bg-velvet-rose-soft text-white font-medium text-xs transition-colors disabled:opacity-50 shadow-md shadow-velvet-rose/20"
              >
                {saving ? "Saving Changes..." : "Save Profile"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
