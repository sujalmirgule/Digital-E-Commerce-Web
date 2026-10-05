"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function TestPaymentVerifyPage() {
  const [token, setToken] = useState("");
  const [orderId, setOrderId] = useState("");
  const [razorpayOrderId, setRazorpayOrderId] = useState("");
  const [razorpayPaymentId, setRazorpayPaymentId] = useState("");
  const [razorpaySignature, setRazorpaySignature] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quick login states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("Password123!@");
  const [loginLoading, setLoginLoading] = useState(false);

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Login failed");
      }
      setToken(data.data?.token ? `Bearer ${data.data.token}` : "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login error");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = token.startsWith("Bearer ")
          ? token
          : `Bearer ${token}`;
      }

      const res = await fetch("/api/v1/payments/verify", {
        method: "POST",
        headers,
        body: JSON.stringify({
          orderId,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || `HTTP ${res.status}`);
      }
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payment verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-10 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-1">
              Feature 11 — Payment Verification
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Razorpay Payment Verification Workbench
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/test/checkout"
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded border border-slate-800 hover:bg-slate-900 transition-colors"
            >
              ← Checkout
            </Link>
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded border border-slate-800 hover:bg-slate-900 transition-colors"
            >
              Home
            </Link>
          </div>
        </div>

        {/* Quick Auth Helper */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              1. Authentication Context
            </h2>
            {token && (
              <span className="text-[11px] text-emerald-400 font-mono">
                Authenticated
              </span>
            )}
          </div>
          <form onSubmit={handleQuickLogin} className="flex gap-2 flex-wrap sm:flex-nowrap">
            <input
              type="email"
              placeholder="buyer@example.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white flex-1 focus:outline-none focus:border-indigo-500"
            />
            <input
              type="password"
              placeholder="Password123!@"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white w-36 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={loginLoading}
              className="text-xs px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
            >
              {loginLoading ? "Authenticating..." : "Quick Login"}
            </button>
          </form>
          <div>
            <input
              type="text"
              placeholder="Or paste Bearer token directly..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-400 w-full font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Verification Form */}
        <form
          onSubmit={handleVerify}
          className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-4"
        >
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            2. Payment Callback Verification Parameters
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Internal Order ID</label>
              <input
                type="text"
                placeholder="ORD-YYYYMMDD-XXXX"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Razorpay Order ID</label>
              <input
                type="text"
                placeholder="order_xxxxxxxxxxxxxx"
                value={razorpayOrderId}
                onChange={(e) => setRazorpayOrderId(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Razorpay Payment ID</label>
              <input
                type="text"
                placeholder="pay_xxxxxxxxxxxxxx"
                value={razorpayPaymentId}
                onChange={(e) => setRazorpayPaymentId(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                Razorpay Cryptographic Signature (HMAC-SHA256 hex)
              </label>
              <input
                type="text"
                placeholder="64-character hex signature"
                value={razorpaySignature}
                onChange={(e) => setRazorpaySignature(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-colors shadow-lg shadow-emerald-600/20"
            >
              {loading ? "Verifying Signature..." : "Verify Payment & Complete Order"}
            </button>
          </div>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <strong>Verification Error:</strong> {error}
          </div>
        )}

        {/* Verification Success Output */}
        {result && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Payment Cryptographically Verified (HTTP {String(result.status ?? 200)})
              </span>
              <span className="text-xs text-emerald-400 font-mono font-bold">
                Order Status: PAID
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <div className="text-[10px] text-slate-500">Order ID</div>
                <div className="font-mono text-white font-semibold truncate">
                  {String((result.data as any)?.orderId)}
                </div>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <div className="text-[10px] text-slate-500">State</div>
                <div className="font-mono text-emerald-400 font-semibold">
                  {String((result.data as any)?.status)}
                </div>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <div className="text-[10px] text-slate-500">Downloads Ready</div>
                <div className="font-mono text-indigo-400 font-semibold">
                  {String((result.data as any)?.downloadReady)}
                </div>
              </div>
            </div>

            <div className="mt-2">
              <div className="text-[10px] text-slate-500 mb-1">Server Response:</div>
              <pre className="p-3 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
