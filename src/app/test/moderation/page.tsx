"use client";

import { useState } from "react";
import Link from "next/link";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface PendingProduct {
  id: string;
  title: string;
  pricePaise: number;
  status: string;
  seller: {
    storeName: string;
  };
  files: Array<{ originalFilename: string; fileSizeBytes: number }>;
}

export default function ModerationTestPage() {
  const [sellerToken, setSellerToken] = useState("");
  const [productId, setProductId] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([]);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) =>
    setActionLog((prev) => [`[${new Date().toISOString()}] ${msg}`, ...prev]);

  // Seller: Submit Product
  const handleSubmitProduct = async () => {
    if (!sellerToken || !productId) {
      addLog("ERROR: Seller token and Product ID are required.");
      return;
    }
    setLoading(true);
    addLog(`Submitting product ${productId} for review...`);
    try {
      const res = await fetch(`${APP_URL}/api/v1/seller/products/${productId}/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sellerToken.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addLog(`✅ Product submitted! Status: ${data.data.product.status}`);
      } else {
        addLog(`❌ Submission failed: ${JSON.stringify(data.error || data)}`);
      }
    } catch (err) {
      addLog(`❌ Network error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Admin: Fetch Pending Queue
  const handleFetchPending = async () => {
    if (!adminToken) {
      addLog("ERROR: Admin token required to fetch pending queue.");
      return;
    }
    setLoading(true);
    addLog("Fetching pending review products...");
    try {
      const res = await fetch(`${APP_URL}/api/v1/admin/products/moderation`, {
        headers: {
          Authorization: `Bearer ${adminToken.trim()}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPendingProducts(data.data.products);
        addLog(`✅ Retrieved ${data.data.products.length} pending products.`);
      } else {
        addLog(`❌ Fetch failed: ${JSON.stringify(data.error || data)}`);
      }
    } catch (err) {
      addLog(`❌ Network error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Admin: Approve
  const handleApprove = async (idToApprove: string) => {
    if (!adminToken || !idToApprove) {
      addLog("ERROR: Admin token and target product ID required.");
      return;
    }
    setLoading(true);
    addLog(`Approving product ${idToApprove}...`);
    try {
      const res = await fetch(`${APP_URL}/api/v1/admin/products/${idToApprove}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken.trim()}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addLog(`✅ Product approved! Status: ${data.data.product.status}`);
        handleFetchPending();
      } else {
        addLog(`❌ Approval failed: ${JSON.stringify(data.error || data)}`);
      }
    } catch (err) {
      addLog(`❌ Network error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Admin: Reject
  const handleReject = async (idToReject: string) => {
    if (!adminToken || !idToReject || !rejectionReason.trim()) {
      addLog("ERROR: Admin token, product ID, and rejection reason (min 5 chars) required.");
      return;
    }
    setLoading(true);
    addLog(`Rejecting product ${idToReject}...`);
    try {
      const res = await fetch(`${APP_URL}/api/v1/admin/products/${idToReject}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addLog(`✅ Product rejected! Status: ${data.data.product.status}`);
        setRejectionReason("");
        handleFetchPending();
      } else {
        addLog(`❌ Rejection failed: ${JSON.stringify(data.error || data)}`);
      }
    } catch (err) {
      addLog(`❌ Network error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 font-mono">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-slate-400 hover:text-white text-sm">
            ← Back to home
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-white mb-1">
          🛡️ Product Moderation &amp; Publishing Workbench
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Feature 08 Verification UI (DRAFT → PENDING_REVIEW → PUBLISHED / REJECTED)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Seller Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-emerald-400 font-semibold text-sm uppercase tracking-wider">
              Seller: Submit for Review
            </h2>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Seller JWT Token</label>
              <input
                type="text"
                placeholder="eyJhbGci..."
                value={sellerToken}
                onChange={(e) => setSellerToken(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Product ID (DRAFT with file)</label>
              <input
                type="text"
                placeholder="cuid..."
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs text-white"
              />
            </div>

            <button
              onClick={handleSubmitProduct}
              disabled={loading}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded font-semibold text-xs transition"
            >
              🚀 Submit Product (DRAFT → PENDING_REVIEW)
            </button>
          </div>

          {/* Admin Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-indigo-400 font-semibold text-sm uppercase tracking-wider">
              Admin: Moderation Controls
            </h2>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Admin JWT Token</label>
              <input
                type="text"
                placeholder="eyJhbGci..."
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs text-white"
              />
            </div>

            <button
              onClick={handleFetchPending}
              disabled={loading}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded font-semibold text-xs transition"
            >
              📋 Load Pending Review Queue
            </button>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Rejection Reason</label>
              <input
                type="text"
                placeholder="e.g. Broken ZIP archive or copyright mismatch"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Pending Products Queue Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Pending Queue ({pendingProducts.length})
          </h2>

          {pendingProducts.length === 0 ? (
            <p className="text-xs text-slate-500">No products currently awaiting moderation.</p>
          ) : (
            <div className="space-y-3">
              {pendingProducts.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-800/80 border border-slate-700 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{p.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Store: {p.seller.storeName} | Price: ₹{(p.pricePaise / 100).toFixed(2)} | Files:{" "}
                      {p.files.length > 0 ? p.files[0].originalFilename : "None"}
                    </p>
                    <p className="text-[11px] text-slate-500">ID: {p.id}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(p.id)}
                      disabled={loading}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-semibold"
                    >
                      ✓ Approve &amp; Publish
                    </button>
                    <button
                      onClick={() => handleReject(p.id)}
                      disabled={loading || !rejectionReason.trim()}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 rounded text-xs font-semibold"
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Log */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase">Activity Log</h3>
            {actionLog.length > 0 && (
              <button
                onClick={() => setActionLog([])}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Clear log
              </button>
            )}
          </div>
          {actionLog.length === 0 ? (
            <p className="text-xs text-slate-600">No actions recorded yet.</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {actionLog.map((log, i) => (
                <p key={i} className="text-xs text-slate-300">
                  {log}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
