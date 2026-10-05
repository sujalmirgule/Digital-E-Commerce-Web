"use client";

import React, { useState } from "react";

interface PendingSeller {
  id: string;
  userId: string;
  storeName: string;
  storeSlug: string;
  bio?: string | null;
  description?: string | null;
  country: string;
  status: string;
  panNumberMasked: string;
  bankAccountLast4: string;
  bankIfsc: string;
  bankAccountHolder: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    createdAt: string;
  };
}

export default function TestAdminSellersPage() {
  const [adminToken, setAdminToken] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Pending sellers
  const [sellers, setSellers] = useState<PendingSeller[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<PendingSeller | null>(null);
  const [loading, setLoading] = useState(false);

  // Rejection reason
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Response displays
  const [lastStatus, setLastStatus] = useState<number | null>(null);
  const [responsePayload, setResponsePayload] = useState<unknown>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick Admin Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      setLastStatus(res.status);
      if (res.ok && data.data?.token) {
        setAdminToken(data.data.token);
        fetchPendingSellers(data.data.token);
      } else {
        setErrorMsg(data.error?.message || "Admin login failed");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoginLoading(false);
    }
  };

  // Fetch Pending Sellers
  const fetchPendingSellers = async (activeToken?: string) => {
    const t = activeToken || adminToken;
    if (!t) {
      setErrorMsg("Admin authentication token required");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/admin/sellers/pending", {
        method: "GET",
        headers: { Authorization: `Bearer ${t}` },
      });

      setLastStatus(res.status);
      const data = await res.json();
      setResponsePayload(data);

      if (res.ok && data.data?.sellers) {
        setSellers(data.data.sellers);
        if (data.data.sellers.length > 0 && !selectedSeller) {
          setSelectedSeller(data.data.sellers[0]);
        }
      } else {
        setErrorMsg(data.error?.message || "Failed to fetch pending sellers");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  // Approve Seller
  const handleApprove = async (sellerId: string) => {
    if (!adminToken) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/sellers/${sellerId}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      setLastStatus(res.status);
      const data = await res.json();
      setResponsePayload(data);

      if (res.ok) {
        fetchPendingSellers(adminToken);
        setSelectedSeller(null);
      } else {
        setErrorMsg(data.error?.message || "Approval failed");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Network error");
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Seller
  const handleReject = async (sellerId: string) => {
    if (!adminToken) return;
    if (!rejectionReason.trim()) {
      setErrorMsg("Please provide a rejection reason");
      return;
    }

    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/sellers/${sellerId}/reject`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ rejectionReason }),
      });

      setLastStatus(res.status);
      const data = await res.json();
      setResponsePayload(data);

      if (res.ok) {
        setRejectionReason("");
        fetchPendingSellers(adminToken);
        setSelectedSeller(null);
      } else {
        setErrorMsg(data.error?.message || "Rejection failed");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Network error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 font-sans">
      <div className="mb-6 pb-4 border-b border-slate-700">
        <h1 className="text-2xl font-bold tracking-tight text-white">ADMIN SELLER APPROVAL TEST</h1>
        <p className="text-xs text-slate-400 mt-1">
          Temporary verification UI for Feature 05 (Admin Seller Moderation). Not the final Admin Dashboard.
        </p>
      </div>

      {/* Admin Token Bar */}
      <div className="mb-6 p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Admin Authorization Token
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Paste Admin Bearer JWT here..."
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded text-white font-mono focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => fetchPendingSellers()}
            disabled={loading || !adminToken}
            className="px-4 py-2 text-xs font-semibold rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white"
          >
            {loading ? "Loading..." : "Fetch Pending Sellers"}
          </button>
        </div>

        {/* Admin Login Quick Form */}
        <details className="text-xs text-slate-400">
          <summary className="cursor-pointer hover:text-slate-300 font-semibold">
            Or login with Admin credentials:
          </summary>
          <form onSubmit={handleAdminLogin} className="mt-3 flex gap-2 items-center">
            <input
              type="email"
              placeholder="Admin Email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-white text-xs"
            />
            <input
              type="password"
              placeholder="Password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-white text-xs"
            />
            <button
              type="submit"
              disabled={loginLoading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-semibold text-xs"
            >
              {loginLoading ? "..." : "Login as Admin"}
            </button>
          </form>
        </details>
      </div>

      {errorMsg && (
        <div className="mb-6 p-3 text-xs rounded bg-rose-500/10 border border-rose-500/20 text-rose-400">
          {errorMsg}
        </div>
      )}

      {/* Main Grid: Pending List + Selected Details */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Pending List */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Pending Applications ({sellers.length})
            </h2>
          </div>

          {sellers.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center">
              No pending seller applications currently.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sellers.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedSeller(s)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedSeller?.id === s.id
                      ? "bg-indigo-950/40 border-indigo-500/50"
                      : "bg-slate-950 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-white">{s.storeName}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {s.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">Owner: {s.user?.fullName}</div>
                  <div className="text-[11px] text-slate-500 font-mono">/{s.storeSlug}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Seller Details & Actions */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="pb-3 border-b border-slate-800 mb-3">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Inspection Workbench
            </h2>
          </div>

          {selectedSeller ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block">Store Name</span>
                  <span className="text-white font-semibold text-sm">{selectedSeller.storeName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Store Slug</span>
                  <span className="text-indigo-400 font-mono">/{selectedSeller.storeSlug}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Owner Name</span>
                  <span className="text-slate-200">{selectedSeller.user?.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Owner Email</span>
                  <span className="text-slate-200">{selectedSeller.user?.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">PAN (Masked)</span>
                  <span className="text-slate-200 font-mono">{selectedSeller.panNumberMasked}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Bank Account</span>
                  <span className="text-slate-200 font-mono">
                    {selectedSeller.bankAccountLast4} ({selectedSeller.bankIfsc})
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <button
                  type="button"
                  onClick={() => handleApprove(selectedSeller.id)}
                  disabled={actionLoading}
                  className="w-full py-2 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors"
                >
                  {actionLoading ? "Processing..." : "✓ APPROVE SELLER"}
                </button>

                <div>
                  <input
                    type="text"
                    placeholder="Rejection reason (min 3 chars)..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded text-white mb-2"
                  />
                  <button
                    type="button"
                    onClick={() => handleReject(selectedSeller.id)}
                    disabled={actionLoading || !rejectionReason.trim()}
                    className="w-full py-2 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white transition-colors"
                  >
                    {actionLoading ? "Processing..." : "✕ REJECT SELLER"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-12 text-center">
              Select an application from the left to review details and approve/reject.
            </div>
          )}
        </div>
      </div>

      {/* Response Display */}
      {lastStatus !== null && (
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              API Response
            </span>
            <span className="text-xs px-2 py-0.5 rounded font-mono font-bold text-indigo-400">
              HTTP {lastStatus}
            </span>
          </div>
          <pre className="text-xs font-mono text-slate-300 overflow-x-auto p-2 bg-slate-900 rounded max-h-64">
            {JSON.stringify(responsePayload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
