"use client";

import React, { useState } from "react";

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  hasSellerProfile?: boolean;
  sellerStatus?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function TestProfilePage() {
  const [token, setToken] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Profile data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  // Response displays
  const [lastStatus, setLastStatus] = useState<number | null>(null);
  const [getResponsePayload, setGetResponsePayload] = useState<unknown>(null);
  const [patchResponsePayload, setPatchResponsePayload] = useState<unknown>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick Login to get token
  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      setLastStatus(res.status);
      if (res.ok && data.data?.token) {
        setToken(data.data.token);
        fetchProfile(data.data.token);
      } else {
        setErrorMsg(data.error?.message || "Login failed");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoginLoading(false);
    }
  };

  // Fetch Profile via GET /api/v1/users/me
  const fetchProfile = async (activeToken?: string) => {
    const t = activeToken || token;
    if (!t) {
      setErrorMsg("Please provide an authentication token first");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/users/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${t}`,
        },
      });

      setLastStatus(res.status);
      const data = await res.json();
      setGetResponsePayload(data);

      if (res.ok && data.data?.user) {
        setProfile(data.data.user);
        setNewName(data.data.user.fullName);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  // Update Profile via PATCH /api/v1/users/me
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMsg("Authentication token required");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fullName: newName }),
      });

      setLastStatus(res.status);
      const data = await res.json();
      setPatchResponsePayload(data);

      if (res.ok && data.data?.user) {
        setProfile((prev) => (prev ? { ...prev, ...data.data.user } : data.data.user));
        // Refresh via GET to confirm persistence
        fetchProfile(token);
      } else {
        setErrorMsg(data.error?.message || "Update failed");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8 font-sans">
      <div className="mb-6 pb-4 border-b border-slate-700">
        <h1 className="text-2xl font-bold tracking-tight text-white">PROFILE TEST</h1>
        <p className="text-xs text-slate-400 mt-1">
          Temporary verification UI for Feature 03 (Authenticated User Profile). Not the final marketplace UI.
        </p>
      </div>

      {/* Token Acquisition Bar */}
      <div className="mb-6 p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Authentication Token
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Paste Bearer JWT token here..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded text-white font-mono focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => fetchProfile()}
            disabled={loading || !token}
            className="px-4 py-2 text-xs font-semibold rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white"
          >
            {loading ? "Fetching..." : "Fetch Profile"}
          </button>
        </div>

        {/* Quick login accordion */}
        <details className="text-xs text-slate-400">
          <summary className="cursor-pointer hover:text-slate-300 font-semibold">
            Or login with credentials to get a token:
          </summary>
          <form onSubmit={handleQuickLogin} className="mt-3 flex gap-2 items-center">
            <input
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-white text-xs"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-white text-xs"
            />
            <button
              type="submit"
              disabled={loginLoading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-semibold text-xs"
            >
              {loginLoading ? "..." : "Login & Load"}
            </button>
          </form>
        </details>
      </div>

      {errorMsg && (
        <div className="mb-6 p-3 text-xs rounded bg-rose-500/10 border border-rose-500/20 text-rose-400">
          {errorMsg}
        </div>
      )}

      {/* Authenticated User Display */}
      {profile && (
        <div className="mb-6 p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Authenticated User Details
            </h2>
            <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {profile.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Full Name</span>
              <span className="text-white font-semibold text-sm">{profile.fullName}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Email</span>
              <span className="text-white font-semibold text-sm">{profile.email}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Role</span>
              <span className="text-indigo-400 font-mono font-semibold">{profile.role}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">User ID</span>
              <span className="text-slate-300 font-mono text-xs">{profile.id}</span>
            </div>
          </div>

          {/* Update Name Form */}
          <div className="pt-4 border-t border-slate-800">
            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300" htmlFor="new-name">
                Update Full Name
              </label>
              <div className="flex gap-2">
                <input
                  id="new-name"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-sm font-semibold rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors"
                >
                  {loading ? "Updating..." : "UPDATE PROFILE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Response Payloads */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              GET /users/me Response
            </span>
            {lastStatus !== null && (
              <span className="text-xs px-2 py-0.5 rounded font-mono font-bold text-indigo-400">
                HTTP {lastStatus}
              </span>
            )}
          </div>
          <pre className="text-xs font-mono text-slate-300 overflow-x-auto p-2 bg-slate-900 rounded max-h-64">
            {JSON.stringify(getResponsePayload, null, 2) || "No GET request dispatched yet"}
          </pre>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              PATCH /users/me Response
            </span>
          </div>
          <pre className="text-xs font-mono text-slate-300 overflow-x-auto p-2 bg-slate-900 rounded max-h-64">
            {JSON.stringify(patchResponsePayload, null, 2) || "No PATCH request dispatched yet"}
          </pre>
        </div>
      </div>
    </div>
  );
}
