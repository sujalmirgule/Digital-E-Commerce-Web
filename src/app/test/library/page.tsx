"use client";

import React, { useState } from "react";
import Link from "next/link";

interface LibraryItem {
  entitlementId: string;
  orderId: string;
  purchasedAt: string;
  product: {
    id: string;
    title: string;
    slug: string;
    version: string;
    thumbnailUrl: string | null;
  };
  file: {
    id: string;
    filename: string;
    fileSize: number;
    downloadCount: number;
    maxAllowed: number | null;
  } | null;
}

export default function TestBuyerLibraryPage() {
  const [token, setToken] = useState("");
  const [orderId, setOrderId] = useState("");
  const [checkProductId, setCheckProductId] = useState("");

  const [loading, setLoading] = useState(false);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[] | null>(null);
  const [accessResult, setAccessResult] = useState<Record<string, unknown> | null>(null);
  const [provisionResult, setProvisionResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Quick login states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("Password123!@");
  const [loginLoading, setLoginLoading] = useState(false);

  const getHeaders = () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = token.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;
    }
    return headers;
  };

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setError(null);
    setStatusMessage(null);
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
      setStatusMessage(`Logged in as ${data.data?.user?.email || loginEmail}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login error");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleFetchLibrary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/buyer/library", {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || `HTTP ${res.status}`);
      }
      setLibraryItems(data.data || []);
      setStatusMessage(`Retrieved ${data.data?.length ?? 0} library items`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch library");
    } finally {
      setLoading(false);
    }
  };

  const handleProvisionOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setProvisionResult(null);
    try {
      const res = await fetch(`/api/v1/buyer/orders/${encodeURIComponent(orderId)}/provision`, {
        method: "POST",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || `HTTP ${res.status}`);
      }
      setProvisionResult(data);
      setStatusMessage("Provisioning completed successfully");
      // Auto-refresh library
      handleFetchLibrary();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Provisioning failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAccessResult(null);
    try {
      const res = await fetch(
        `/api/v1/buyer/products/${encodeURIComponent(checkProductId)}/access`,
        { headers: getHeaders() }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || `HTTP ${res.status}`);
      }
      setAccessResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Access check failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "32px", fontFamily: "sans-serif", maxWidth: "960px", margin: "0 auto", color: "#1e293b" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link href="/" style={{ color: "#2563eb", textDecoration: "none", fontSize: "14px" }}>
          ← Back to Hub
        </Link>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginTop: "8px", color: "#0f172a" }}>
          Feature 12 Test Bench: Entitlements & Buyer Library
        </h1>
        <p style={{ color: "#64748b", fontSize: "14px" }}>
          Developer test utility for authoritative post-payment ownership provisioning and buyer library queries.
        </p>
        <div style={{ padding: "8px 12px", background: "#fef3c7", borderRadius: "6px", fontSize: "12px", color: "#92400e", marginTop: "8px" }}>
          <strong>Feature 12 Boundary:</strong> Digital downloads, signed URLs, and S3/R2 storage are strictly deferred to Feature 13+.
          Download records count = 0.
        </div>
      </div>

      {/* Quick Login */}
      <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>1. Authenticate Buyer Session</h2>
        <form onSubmit={handleQuickLogin} style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "#475569" }}>Buyer Email</label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="buyer@example.com"
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
              required
            />
          </div>
          <div style={{ flex: "1 1 180px" }}>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "#475569" }}>Password</label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loginLoading}
            style={{ padding: "8px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}
          >
            {loginLoading ? "Authenticating..." : "Login Buyer"}
          </button>
        </form>
        <div style={{ marginTop: "10px" }}>
          <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "#475569" }}>Active JWT Token</label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Bearer eyJhbGciOi..."
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", fontFamily: "monospace" }}
          />
        </div>
      </div>

      {/* Provision Order */}
      <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>2. Provision Order Entitlement</h2>
        <form onSubmit={handleProvisionOrder} style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "#475569" }}>Order ID (must be PAID & CAPTURED)</label>
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="ORD-YYYYMMDD-XXXX"
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !orderId}
            style={{ padding: "8px 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}
          >
            {loading ? "Processing..." : "Provision Entitlement"}
          </button>
        </form>
      </div>

      {/* Check Access */}
      <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>3. Product Ownership Access Check</h2>
        <form onSubmit={handleCheckAccess} style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "#475569" }}>Product ID</label>
            <input
              type="text"
              value={checkProductId}
              onChange={(e) => setCheckProductId(e.target.value)}
              placeholder="e.g. prod_cm20..."
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !checkProductId}
            style={{ padding: "8px 16px", background: "#6366f1", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}
          >
            Check Access
          </button>
        </form>
      </div>

      {/* Fetch Buyer Library */}
      <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600", margin: 0 }}>4. Buyer Digital Library</h2>
          <button
            type="button"
            onClick={handleFetchLibrary}
            disabled={loading}
            style={{ padding: "8px 16px", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}
          >
            {loading ? "Loading..." : "Refresh Library"}
          </button>
        </div>

        {libraryItems !== null && (
          <div>
            {libraryItems.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: "14px", fontStyle: "italic" }}>
                Library is empty. No active entitlements found for this buyer.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {libraryItems.map((item) => (
                  <div
                    key={item.entitlementId}
                    style={{ background: "#ffffff", padding: "14px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <strong style={{ fontSize: "15px", color: "#0f172a" }}>{item.product.title}</strong>
                      <span style={{ fontSize: "11px", background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "4px", fontWeight: "600" }}>
                        OWNED
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.6" }}>
                      <div><strong>Entitlement ID:</strong> {item.entitlementId}</div>
                      <div><strong>Order ID:</strong> {item.orderId}</div>
                      <div><strong>Purchased At:</strong> {new Date(item.purchasedAt).toLocaleString()}</div>
                      <div><strong>Product Slug:</strong> {item.product.slug} (v{item.product.version})</div>
                      {item.file && (
                        <div>
                          <strong>File Asset:</strong> {item.file.filename} ({(item.file.fileSize / 1024).toFixed(1)} KB) — Downloads provisioned in Feature 13+
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div style={{ padding: "10px 14px", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "6px", color: "#065f46", fontSize: "13px", marginBottom: "16px" }}>
          {statusMessage}
        </div>
      )}

      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#991b1b", fontSize: "13px", marginBottom: "16px" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Output Inspector */}
      {(provisionResult || accessResult) && (
        <div style={{ background: "#0f172a", color: "#f8fafc", padding: "16px", borderRadius: "8px", fontSize: "12px", overflowX: "auto" }}>
          <div style={{ fontWeight: "600", marginBottom: "8px", color: "#94a3b8" }}>Raw API Response:</div>
          <pre style={{ margin: 0, fontFamily: "monospace" }}>
            {JSON.stringify(provisionResult || accessResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
