"use client";

import React, { useState } from "react";
import Link from "next/link";

interface ReceiptItem {
  id: string;
  orderId: string;
  invoiceNumber: string;
  buyerName: string;
  buyerEmail: string;
  amountPaidPaise: number;
  amountFormatted: string;
  currency: string;
  paymentMethod: string;
  paymentId: string;
  templateVersion: number;
  issuedAt: string;
}

export default function TestReceiptsPage() {
  const [token, setToken] = useState("");
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [buyerReceipt, setBuyerReceipt] = useState<any | null>(null);
  const [adminReceipts, setAdminReceipts] = useState<ReceiptItem[]>([]);
  const [template, setTemplate] = useState<any | null>(null);
  const [previewBase64, setPreviewBase64] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Template Form State
  const [primaryColor, setPrimaryColor] = useState("#4F46E5");
  const [secondaryColor, setSecondaryColor] = useState("#111827");
  const [textColor, setTextColor] = useState("#1F2937");
  const [watermarkText, setWatermarkText] = useState("PAID");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.08);

  // Quick Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Password123!@");

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

  const handleLogin = async (role: "buyer" | "admin") => {
    setLoading(true);
    setError(null);
    try {
      const targetEmail =
        role === "admin"
          ? "admin@marketplace.com"
          : email || "buyer@example.com";
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password }),
      });
      const data = await res.json();
      if (res.ok && data.data?.token) {
        setToken(data.data.token);
        setStatusMessage(`Logged in as ${data.data.user.role} (${data.data.user.email})`);
      } else {
        setError(data.error?.message || "Login failed");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Buyer: Fetch Receipt
  const fetchBuyerReceipt = async () => {
    if (!orderId) {
      setError("Please provide an Order ID");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/buyer/orders/${orderId}/receipt`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setBuyerReceipt(data.data);
        setStatusMessage("Receipt retrieved successfully!");
      } else {
        setError(data.error?.message || "Failed to fetch receipt");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Admin: List Receipts
  const fetchAdminReceipts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/receipts", {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminReceipts(data.data.receipts);
        setStatusMessage(`Fetched ${data.data.receipts.length} receipts.`);
      } else {
        setError(data.error?.message || "Failed to list receipts");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Admin: Fetch Template
  const fetchTemplate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/receipts/template", {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setTemplate(data.data.template);
        setPrimaryColor(data.data.template.primaryColor);
        setSecondaryColor(data.data.template.secondaryColor);
        setTextColor(data.data.template.textColor);
        setWatermarkText(data.data.template.watermarkText || "");
        setWatermarkOpacity(data.data.template.watermarkOpacity || 0.08);
        setStatusMessage(`Template loaded (Version ${data.data.template.version}).`);
      } else {
        setError(data.error?.message || "Failed to get template");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Admin: Update Template
  const updateTemplate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/receipts/template", {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          primaryColor,
          secondaryColor,
          textColor,
          watermarkText,
          watermarkOpacity: Number(watermarkOpacity),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTemplate(data.data.template);
        setStatusMessage(`Template updated to Version ${data.data.template.version}!`);
      } else {
        setError(data.error?.message || "Failed to update template");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Admin: Preview Template
  const previewTemplate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/receipts/template/preview", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          primaryColor,
          secondaryColor,
          textColor,
          watermarkText,
          watermarkOpacity: Number(watermarkOpacity),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPreviewBase64(data.data.pdfBase64);
        setStatusMessage("Template preview generated.");
      } else {
        setError(data.error?.message || "Failed to generate preview");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Receipt System Test Bench (Feature 15)
            </h1>
            <p className="text-sm text-gray-600">
              Automatic receipt generation, PDF rendering, buyer access, and admin template management
            </p>
          </div>
          <Link
            href="/test/download"
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Download Test Bench
          </Link>
        </div>

        {/* Global Alert Messages */}
        {statusMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
            {statusMessage}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Session / Authentication Panel */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">1. Authentication</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                JWT Token (or Login below)
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Bearer eyJhbGciOi..."
                className="w-full text-xs font-mono border rounded p-2"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => handleLogin("buyer")}
                disabled={loading}
                className="bg-indigo-600 text-white text-xs font-medium px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                Login as Buyer
              </button>
              <button
                type="button"
                onClick={() => handleLogin("admin")}
                disabled={loading}
                className="bg-gray-800 text-white text-xs font-medium px-4 py-2 rounded hover:bg-gray-900 disabled:opacity-50"
              >
                Login as Admin
              </button>
            </div>
          </div>
        </div>

        {/* Buyer Receipt Access Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            2. Buyer Receipt Access (GET /api/v1/buyer/orders/:id/receipt)
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="ORD-YYYYMMDD-XXXX"
              className="flex-1 text-sm border rounded p-2 font-mono"
            />
            <button
              type="button"
              onClick={fetchBuyerReceipt}
              disabled={loading || !orderId}
              className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              Get Receipt
            </button>
          </div>

          {buyerReceipt && (
            <div className="mt-4 p-4 bg-gray-50 border rounded-lg space-y-3 text-sm">
              <div className="flex justify-between items-center border-b pb-2">
                <div>
                  <span className="font-bold text-gray-900">
                    {buyerReceipt.receipt.id}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">
                    ({buyerReceipt.receipt.invoiceNumber})
                  </span>
                </div>
                <div className="text-indigo-600 font-bold">
                  {buyerReceipt.receipt.amountFormatted}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>Buyer: {buyerReceipt.receipt.buyerName} ({buyerReceipt.receipt.buyerEmail})</div>
                <div>Payment ID: {buyerReceipt.receipt.paymentId}</div>
                <div>Template Version: v{buyerReceipt.receipt.templateVersion}</div>
                <div>Issued At: {new Date(buyerReceipt.receipt.issuedAt).toLocaleString()}</div>
              </div>
              {buyerReceipt.downloadUrl && (
                <div className="pt-2">
                  <a
                    href={buyerReceipt.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded hover:bg-green-700"
                  >
                    ⬇ Download Official PDF Receipt
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Admin Section: Template Management & Preview */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">
              3. Admin Receipt Template Configuration & Preview
            </h2>
            <button
              type="button"
              onClick={fetchTemplate}
              disabled={loading}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded"
            >
              Load Active Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Primary Color (Hex)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-8 h-8 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-full text-xs font-mono border rounded p-1.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Watermark Text
              </label>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                className="w-full text-xs border rounded p-1.5"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Watermark Opacity ({watermarkOpacity})
              </label>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                value={watermarkOpacity}
                onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={previewTemplate}
              disabled={loading}
              className="bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Preview Template (No DB records)
            </button>
            <button
              type="button"
              onClick={updateTemplate}
              disabled={loading}
              className="bg-indigo-600 text-white text-xs font-medium px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              Save New Template Version
            </button>
          </div>

          {previewBase64 && (
            <div className="mt-4 border rounded p-2 bg-gray-100">
              <iframe
                src={`data:application/pdf;base64,${previewBase64}`}
                className="w-full h-96 border rounded"
                title="Receipt Preview"
              />
            </div>
          )}
        </div>

        {/* Admin Section: Receipts Register */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">
              4. Admin Receipts Register (GET /api/v1/admin/receipts)
            </h2>
            <button
              type="button"
              onClick={fetchAdminReceipts}
              disabled={loading}
              className="text-xs bg-gray-800 text-white font-medium px-3 py-1.5 rounded hover:bg-gray-900"
            >
              Fetch Register
            </button>
          </div>

          {adminReceipts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Receipt ID</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Invoice No</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Order ID</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Buyer</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Amount</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500">Version</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adminReceipts.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 font-mono font-bold text-gray-900">{r.id}</td>
                      <td className="px-3 py-2 font-mono text-gray-600">{r.invoiceNumber}</td>
                      <td className="px-3 py-2 font-mono text-gray-600">{r.orderId}</td>
                      <td className="px-3 py-2 text-gray-800">{r.buyerName}</td>
                      <td className="px-3 py-2 text-right font-bold text-indigo-600">{r.amountFormatted}</td>
                      <td className="px-3 py-2 text-center text-gray-500">v{r.templateVersion}</td>
                      <td className="px-3 py-2 text-right">
                        <a
                          href={`/api/v1/admin/receipts/${r.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-500">No receipts listed. Click &apos;Fetch Register&apos;.</p>
          )}
        </div>
      </div>
    </div>
  );
}
