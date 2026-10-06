"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAdminAuth } from "../../AdminAuthContext";
import {
  FileText,
  Download,
  RefreshCw,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  ShoppingBag,
  User,
  CreditCard,
  Building,
} from "lucide-react";

interface AdminReceiptDetail {
  id: string;
  orderId: string;
  invoiceNumber: string;
  amountPaidPaise: number;
  currency: string;
  issuedAt: string;
  templateVersion: number;
  buyerNameSnapshot?: string;
  buyerEmailSnapshot?: string;
  order?: {
    id: string;
    status: string;
    totalAmountPaise: number;
    platformFeePaise: number;
    items: Array<{
      id: string;
      productTitle: string;
      pricePaise: number;
      licenseType: string;
    }>;
  };
}

export default function AdminReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAdminAuth();

  const [receipt, setReceipt] = useState<AdminReceiptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchReceipt = async () => {
    if (!token || !id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/admin/receipts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load receipt details");
      }
      setReceipt(data.data.receipt || data.data);
    } catch (err: any) {
      setError(err.message || "Failed to load receipt");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && id) {
      fetchReceipt();
    }
  }, [token, id]);

  const handleRegenerate = async () => {
    if (!token || !receipt) return;
    try {
      setRegenerating(true);
      setError(null);
      const res = await fetch(`/api/v1/admin/receipts/${receipt.id}/regenerate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to regenerate receipt");
      }
      setSuccess("Receipt regenerated successfully.");
      await fetchReceipt();
    } catch (err: any) {
      setError(err.message || "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  };

  const handleDownload = () => {
    if (!token || !receipt) return;
    window.open(`/api/v1/admin/receipts/${receipt.id}/download?token=${encodeURIComponent(token)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-[#BBAE9F]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#F43F5E] mb-3" />
        <p className="text-xs font-mono">Retrieving secure fiscal receipt record...</p>
      </div>
    );
  }

  if (error && !receipt) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Link
          href="/admin/receipts"
          className="inline-flex items-center gap-2 text-xs text-[#BBAE9F] hover:text-[#F7EFE2] transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Receipts Directory
        </Link>
        <div className="p-6 bg-rose-950/40 border border-rose-900/50 rounded-2xl text-rose-300 space-y-2">
          <div className="flex items-center gap-2 font-medium text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <span>Receipt Retrieval Error</span>
          </div>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (!receipt) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/receipts"
          className="inline-flex items-center gap-2 text-xs text-[#BBAE9F] hover:text-[#E8D5B5] transition mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Receipts Directory
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif text-[#F7EFE2] flex items-center gap-3">
              <span>Receipt {receipt.invoiceNumber}</span>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#1B101B] text-[#E8D5B5] border border-[#3A2930]">
                Template v{receipt.templateVersion || 1}
              </span>
            </h1>
            <p className="text-xs text-[#BBAE9F] font-mono mt-1">
              Receipt ID: {receipt.id} • Issued: {new Date(receipt.issuedAt).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="px-3.5 py-2 rounded-xl text-xs bg-[#211815] hover:bg-[#2B201C] border border-[#3A2930] text-[#E8D5B5] flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
              <span>Regenerate</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-[#F43F5E] hover:bg-[#FB7185] text-white flex items-center gap-1.5 shadow-lg transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Receipt Visual Container */}
      <div className="bg-[#211815] border border-[#3A2930] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-[#3A2930] gap-4">
          <div>
            <span className="font-editorial text-lg text-[#F7EFE2]">Marketify</span>
            <p className="text-xs text-[#BBAE9F] mt-0.5">Authoritative Fiscal Invoice</p>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-2xl font-serif text-[#F7EFE2]">
              ₹{(receipt.amountPaidPaise / 100).toLocaleString()}
            </div>
            <span className="text-[10px] font-mono text-emerald-400">Paid in Full ({receipt.currency})</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase text-[#BBAE9F]">Order Reference</span>
            <p className="font-mono text-[#F7EFE2]">
              <Link href={`/admin/orders/${receipt.orderId}`} className="text-[#FB7185] hover:underline">
                {receipt.orderId}
              </Link>
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase text-[#BBAE9F]">Invoice Number</span>
            <p className="font-mono text-[#F7EFE2]">{receipt.invoiceNumber}</p>
          </div>
        </div>

        {receipt.order?.items && (
          <div className="space-y-3 pt-4 border-t border-[#3A2930]">
            <span className="text-[11px] font-mono uppercase text-[#BBAE9F] block">Purchased Items</span>
            <div className="space-y-2">
              {receipt.order.items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-[#1B101B] border border-[#3A2930] rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-medium text-[#F7EFE2]">{item.productTitle}</span>
                    <span className="text-[10px] font-mono text-[#BBAE9F] ml-2">({item.licenseType})</span>
                  </div>
                  <span className="font-serif text-[#F7EFE2]">
                    ₹{(item.pricePaise / 100).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
