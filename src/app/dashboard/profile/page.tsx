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
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-white tracking-tight">Account & Profile Settings</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Manage your buyer personal information, account credentials, and communication preferences.
        </p>
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="h-48 bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse"></div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-200 text-sm">
          <span>⚠️ {error}</span>
          <button onClick={loadProfile} className="ml-3 underline hover:text-white">
            Retry
          </button>
        </div>
      )}

      {!loading && profile && (
        <div className="space-y-6">
          {/* Status Badges */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-300">Account Status:</span>
              <span
                className={`px-2 py-0.5 rounded font-semibold uppercase ${
                  profile.isActive
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}
              >
                {profile.isActive ? "Active Verified Account" : "Inactive"}
              </span>
            </div>

            <div className="text-slate-400">
              Role: <strong className="text-indigo-400">{profile.role}</strong> · Member since{" "}
              {new Date(profile.createdAt).toLocaleDateString()}
            </div>
          </div>

          {/* Edit Form */}
          <form
            onSubmit={handleProfileSubmit}
            className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5"
          >
            <h2 className="font-bold text-white text-base">Personal Information</h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400 cursor-not-allowed"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Email addresses are primary account identifiers and cannot be modified directly.
                </span>
              </div>

              <div className="pt-2">
                <div className="text-slate-400">Security & Authentication</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Password protected using bcrypt (salt rounds: 12) with JWT authentication.
                </div>
              </div>
            </div>

            {successMsg && (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-medium">
                {successMsg}
              </div>
            )}

            {updateError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 text-xs font-medium">
                {updateError}
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors disabled:opacity-50 shadow-sm"
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
