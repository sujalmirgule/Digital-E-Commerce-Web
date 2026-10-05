"use client";

import { useState } from "react";
import Link from "next/link";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function UploadTestPage() {
  const [token, setToken] = useState("");
  const [productId, setProductId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [assetId, setAssetId] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [initResult, setInitResult] = useState<object | null>(null);
  const [completeResult, setCompleteResult] = useState<object | null>(null);
  const [uploading, setUploading] = useState(false);

  const addLog = (msg: string) => setLog((prev) => [...prev, `[${new Date().toISOString()}] ${msg}`]);

  const handleInit = async () => {
    if (!token || !productId || !selectedFile) {
      addLog("ERROR: Provide token, productId, and a file first.");
      return;
    }

    addLog(`Initializing upload for product ${productId}...`);
    addLog(`File: ${selectedFile.name} | Size: ${selectedFile.size} bytes | Type: ${selectedFile.type}`);

    const body = {
      fileName: selectedFile.name,
      contentType: selectedFile.type || "application/zip",
      fileSizeBytes: selectedFile.size,
    };

    try {
      const res = await fetch(`${APP_URL}/api/v1/seller/products/${productId}/assets/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      setInitResult(data);

      if (data.success) {
        setAssetId(data.data.assetId);
        setUploadUrl(data.data.uploadUrl);
        addLog(`✅ Upload initialized. assetId=${data.data.assetId}`);
        addLog(`📦 Upload URL: ${data.data.uploadUrl}`);
        addLog(`🔑 Object key (server-generated): ${data.data.objectKey}`);
        addLog(`⏰ Expires at: ${data.data.expiresAt}`);
      } else {
        addLog(`❌ Init failed: ${JSON.stringify(data.error)}`);
      }
    } catch (err) {
      addLog(`❌ Network error: ${err}`);
    }
  };

  const handleUpload = async () => {
    if (!uploadUrl || !selectedFile) {
      addLog("ERROR: Initialize upload first.");
      return;
    }

    addLog(`Uploading file directly to storage via PUT...`);
    setUploading(true);

    try {
      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type || "application/zip",
        },
        body: selectedFile,
      });

      if (res.ok) {
        addLog(`✅ File uploaded to storage. Status: ${res.status}`);
      } else {
        const txt = await res.text();
        addLog(`❌ Upload failed: ${res.status} — ${txt}`);
      }
    } catch (err) {
      addLog(`❌ Upload network error: ${err}`);
    } finally {
      setUploading(false);
    }
  };

  const handleComplete = async () => {
    if (!token || !productId || !assetId) {
      addLog("ERROR: Complete requires token, productId, and assetId.");
      return;
    }

    addLog(`Calling completion endpoint for assetId=${assetId}...`);

    try {
      const res = await fetch(
        `${APP_URL}/api/v1/seller/products/${productId}/assets/${assetId}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      setCompleteResult(data);

      if (data.success) {
        addLog(`✅ Upload VERIFIED. Asset ID: ${data.data.asset.id}`);
        addLog(`📄 Original file: ${data.data.asset.originalFilename}`);
        addLog(`📦 Size (confirmed): ${data.data.asset.fileSizeBytes} bytes`);
        addLog(`🏷️  MIME: ${data.data.asset.mimeType}`);
        addLog(`📌 Product status: ${data.data.product.status} (must be DRAFT)`);
        addLog(`✔️  uploadVerified: ${data.data.asset.uploadVerified}`);
      } else {
        addLog(`❌ Complete failed: ${JSON.stringify(data.error)}`);
      }
    } catch (err) {
      addLog(`❌ Network error: ${err}`);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 font-mono">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-slate-400 hover:text-white text-sm">
            ← Back to home
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-white mb-1">
          🔐 Product File Upload Test
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Feature 07 — Private Digital Asset Upload (LocalStorageProvider)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* ── Inputs ─────────────────────────────────────────── */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
            <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-widest">
              Configuration
            </h2>

            <div>
              <label className="block text-xs text-slate-400 mb-1">JWT Token</label>
              <input
                type="text"
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                placeholder="eyJhbGci..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Product ID (must be DRAFT)</label>
              <input
                type="text"
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                placeholder="cuid..."
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Choose File (.zip, .pdf, .rar, .7z)</label>
              <input
                type="file"
                accept=".zip,.pdf,.rar,.7z"
                className="w-full text-xs text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
              {selectedFile && (
                <p className="text-xs text-emerald-400 mt-1">
                  {selectedFile.name} — {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>
          </div>

          {/* ── Actions ────────────────────────────────────────── */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-3">
            <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-widest mb-2">
              Upload Flow
            </h2>

            <div className="space-y-2">
              <p className="text-xs text-slate-500">Step 1: Initialize</p>
              <button
                onClick={handleInit}
                className="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition-colors"
              >
                🚀 Initialize Upload
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-500">Step 2: Upload file directly to storage</p>
              <button
                onClick={handleUpload}
                disabled={!uploadUrl || uploading}
                className="w-full py-2 rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
              >
                {uploading ? "⏳ Uploading..." : "📤 Upload File to Storage"}
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-500">Step 3: Verify + complete</p>
              <button
                onClick={handleComplete}
                disabled={!assetId}
                className="w-full py-2 rounded bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
              >
                ✅ Complete &amp; Verify
              </button>
            </div>

            {assetId && (
              <div className="text-xs text-slate-400 bg-slate-800 rounded p-2">
                <span className="text-slate-500">assetId: </span>
                <span className="text-indigo-300">{assetId}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── API Results ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {initResult && (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">Init Response</h3>
              <pre className="text-xs text-green-300 whitespace-pre-wrap overflow-auto max-h-48">
                {JSON.stringify(initResult, null, 2)}
              </pre>
            </div>
          )}
          {completeResult && (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">Complete Response</h3>
              <pre className="text-xs text-emerald-300 whitespace-pre-wrap overflow-auto max-h-48">
                {JSON.stringify(completeResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* ── Activity Log ──────────────────────────────────────────── */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase mb-3">Activity Log</h3>
          {log.length === 0 ? (
            <p className="text-xs text-slate-600">No activity yet.</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {log.map((entry, i) => (
                <p key={i} className="text-xs text-slate-300">{entry}</p>
              ))}
            </div>
          )}
          {log.length > 0 && (
            <button
              onClick={() => setLog([])}
              className="mt-3 text-xs text-slate-500 hover:text-slate-300"
            >
              Clear log
            </button>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-600">
          Files stored in <code>storage/private/</code> — never in <code>public/</code>. Not web-accessible.
        </p>
      </div>
    </main>
  );
}
