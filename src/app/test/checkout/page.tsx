"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface ProductOption {
  id: string;
  title: string;
  pricePaise: number;
  discountPricePaise?: number | null;
  status: string;
}

export default function TestCheckoutPage() {
  const [token, setToken] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [licenseType, setLicenseType] = useState("COMMERCIAL");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quick login states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("Password123!@");
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    // Fetch published products for convenient selection
    fetch("/api/v1/products?limit=10")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setProducts(data.data);
          if (data.data.length > 0) {
            setSelectedProductId(data.data[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

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

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Please login or provide a valid JWT Authorization token first.");
      return;
    }
    if (!selectedProductId.trim()) {
      setError("Please select or enter a valid Product ID.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
      };
      if (idempotencyKey.trim()) {
        headers["Idempotency-Key"] = idempotencyKey.trim();
      }

      const res = await fetch("/api/v1/orders/checkout", {
        method: "POST",
        headers,
        body: JSON.stringify({
          productId: selectedProductId.trim(),
          licenseType,
          idempotencyKey: idempotencyKey.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || `Checkout failed (${res.status})`);
      }

      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Checkout error occurred");
    } finally {
      setLoading(false);
    }
  };

  const generateRandomKey = () => {
    setIdempotencyKey(`idem_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
              Feature 10 — Order &amp; Checkout Initialization
            </div>
            <h1 className="text-2xl font-bold text-white">Checkout Test Workbench</h1>
            <p className="text-xs text-slate-400 mt-1">
              Verify server-side price snapshots, idempotency, Razorpay order creation, and initial PENDING state.
            </p>
          </div>
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-md border border-slate-800 hover:bg-slate-900 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Auth Section */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            1. Buyer Authentication
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <form onSubmit={handleQuickLogin} className="space-y-2">
              <span className="text-[11px] text-slate-400">Quick Login:</span>
              <input
                type="email"
                placeholder="Buyer Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white"
              />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white"
              />
              <button
                type="submit"
                disabled={loginLoading || !loginEmail}
                className="w-full py-1 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 disabled:opacity-50"
              >
                {loginLoading ? "Logging in..." : "Login as Buyer"}
              </button>
            </form>

            <div className="space-y-2">
              <span className="text-[11px] text-slate-400">Active JWT Token:</span>
              <textarea
                rows={3}
                placeholder="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-[11px] font-mono text-emerald-400 focus:outline-none"
              />
              <div className="text-[10px] text-slate-500">
                {token ? "✓ Token attached for checkout requests" : "No token set (Checkout will return 401)"}
              </div>
            </div>
          </div>
        </div>

        {/* Checkout Form */}
        <form onSubmit={handleCheckout} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            2. Purchase Configuration
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Select Published Product</label>
              {products.length > 0 ? (
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} — ₹{((p.discountPricePaise ?? p.pricePaise) / 100).toFixed(2)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Enter Product ID manually"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">License Tier</label>
              <select
                value={licenseType}
                onChange={(e) => setLicenseType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="COMMERCIAL">Commercial (Standard)</option>
                <option value="PERSONAL">Personal</option>
                <option value="EXTENDED">Extended</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">Idempotency Key (Optional)</label>
              <button
                type="button"
                onClick={generateRandomKey}
                className="text-[10px] text-indigo-400 hover:text-indigo-300"
              >
                + Generate Random Key
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g. idem_clx109283_retry1"
              value={idempotencyKey}
              onChange={(e) => setIdempotencyKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Test duplicate clicks: Re-submitting with the same key returns the existing order session without duplicate DB records.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Target Route: <code className="text-slate-300 font-mono">POST /api/v1/orders/checkout</code>
            </span>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors shadow-lg shadow-indigo-600/25"
            >
              {loading ? "Initializing..." : "Initialize Checkout →"}
            </button>
          </div>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Result Inspection */}
        {result && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Order Initialized Successfully (HTTP {String(result.status ?? 201)})
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Status: PENDING
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <div className="text-[10px] text-slate-500">Order ID</div>
                <div className="font-mono text-white font-semibold truncate">{String((result.data as any)?.orderId)}</div>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <div className="text-[10px] text-slate-500">Amount</div>
                <div className="font-mono text-emerald-400 font-bold">
                  ₹{(((result.data as any)?.totalAmountPaise ?? 0) / 100).toFixed(2)}
                </div>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <div className="text-[10px] text-slate-500">Currency</div>
                <div className="font-mono text-white">{String((result.data as any)?.currency)}</div>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <div className="text-[10px] text-slate-500">Razorpay Order</div>
                <div className="font-mono text-white truncate">{String((result.data as any)?.razorpayOrderId)}</div>
              </div>
            </div>

            <pre className="p-3 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-60">
              {JSON.stringify(result, null, 2)}
            </pre>

            <div className="p-2.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px]">
              ℹ️ <strong>Scope Check:</strong> Order is in <code className="font-bold">PENDING</code> state awaiting payment. Razorpay signature verification, webhooks, and digital download provisioning are strictly reserved for Feature 11+.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
