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

interface DownloadResponse {
  downloadUrl: string;
  expiresInSeconds: number;
  expiresAt: string;
  fileName: string;
  contentType: string;
  remainingDownloads: number | "unlimited";
}

export default function TestDownloadPage() {
  const [token, setToken] = useState("");
  const [productFileId, setProductFileId] = useState("");

  const [loading, setLoading] = useState(false);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[] | null>(null);
  const [downloadResult, setDownloadResult] = useState<DownloadResponse | null>(null);
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
      setStatusMessage(`Loaded ${data.data?.length ?? 0} library items`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load library");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDownload = async (fileIdToUse?: string) => {
    const targetFileId = fileIdToUse || productFileId;
    if (!targetFileId) {
      setError("Product File ID is required");
      return;
    }

    setLoading(true);
    setError(null);
    setDownloadResult(null);
    try {
      const res = await fetch(
        `/api/v1/buyer/downloads/${encodeURIComponent(targetFileId)}/url`,
        {
          method: "POST",
          headers: getHeaders(),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || `HTTP ${res.status}`);
      }
      setDownloadResult(data.data);
      setStatusMessage("Short-lived signed download URL generated!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate download URL");
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
          Feature 13 Test Bench: Secure Digital Download
        </h1>
        <p style={{ color: "#64748b", fontSize: "14px" }}>
          Developer test bench for entitlement-authorized, time-limited signed digital file downloads.
        </p>
      </div>

      {/* Quick Login */}
      <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>1. Authenticate Buyer Session</h2>
        <form onSubmit={handleQuickLogin} style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "#475569" }}>Email</label>
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
            {loginLoading ? "Logging in..." : "Login Buyer"}
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

      {/* Owned Products & Files */}
      <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600", margin: 0 }}>2. Load Owned Products & Files</h2>
          <button
            type="button"
            onClick={handleFetchLibrary}
            disabled={loading}
            style={{ padding: "8px 16px", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}
          >
            {loading ? "Loading..." : "Load Library"}
          </button>
        </div>

        {libraryItems !== null && (
          <div>
            {libraryItems.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: "14px", fontStyle: "italic" }}>
                No active entitlements found for this user.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {libraryItems.map((item) => (
                  <div
                    key={item.entitlementId}
                    style={{ background: "#ffffff", padding: "12px", borderRadius: "6px", border: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <div>
                      <strong style={{ fontSize: "14px", color: "#0f172a" }}>{item.product.title}</strong>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        ProductFile ID: {item.file?.id || "No file attached"} | Filename: {item.file?.filename || "N/A"}
                      </div>
                    </div>
                    {item.file && (
                      <button
                        type="button"
                        onClick={() => {
                          setProductFileId(item.file!.id);
                          handleRequestDownload(item.file!.id);
                        }}
                        style={{ padding: "6px 12px", background: "#10b981", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "500" }}
                      >
                        Request Download URL →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Request */}
      <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>3. Manual Download Request (or Test Unauthorized ID)</h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "#475569" }}>ProductFile ID</label>
            <input
              type="text"
              value={productFileId}
              onChange={(e) => setProductFileId(e.target.value)}
              placeholder="e.g. file_cm20..."
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
            />
          </div>
          <button
            type="button"
            onClick={() => handleRequestDownload()}
            disabled={loading || !productFileId}
            style={{ padding: "8px 16px", background: "#6366f1", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}
          >
            Authorize Download
          </button>
        </div>
      </div>

      {/* Download Result */}
      {downloadResult && (
        <div style={{ background: "#ecfdf5", padding: "16px", borderRadius: "8px", border: "1px solid #a7f3d0", marginBottom: "20px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#065f46", margin: "0 0 10px 0" }}>
            ✓ Download Authorization Granted (15-Minute TTL)
          </h3>
          <div style={{ fontSize: "13px", color: "#047857", lineHeight: "1.8" }}>
            <div><strong>File Name:</strong> {downloadResult.fileName}</div>
            <div><strong>Content-Type:</strong> {downloadResult.contentType}</div>
            <div><strong>Expires In:</strong> {downloadResult.expiresInSeconds} seconds ({new Date(downloadResult.expiresAt).toLocaleTimeString()})</div>
            <div><strong>Remaining Downloads:</strong> {downloadResult.remainingDownloads}</div>
            <div style={{ marginTop: "12px" }}>
              <a
                href={downloadResult.downloadUrl}
                download={downloadResult.fileName}
                style={{
                  display: "inline-block",
                  padding: "10px 18px",
                  background: "#059669",
                  color: "#ffffff",
                  textDecoration: "none",
                  borderRadius: "6px",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                📥 Download File Now ({downloadResult.fileName})
              </a>
            </div>
          </div>
        </div>
      )}

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

      {/* Raw Output Inspector */}
      {downloadResult && (
        <div style={{ background: "#0f172a", color: "#f8fafc", padding: "16px", borderRadius: "8px", fontSize: "12px", overflowX: "auto" }}>
          <div style={{ fontWeight: "600", marginBottom: "8px", color: "#94a3b8" }}>Raw Response DTO (Notice zero storageKey or private path):</div>
          <pre style={{ margin: 0, fontFamily: "monospace" }}>
            {JSON.stringify(downloadResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
