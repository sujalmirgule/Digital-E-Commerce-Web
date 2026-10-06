"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSellerAuth } from "../SellerAuthContext";
import {
  ShoppingBag,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  ShieldCheck,
  Tag,
  AlertCircle,
} from "lucide-react";

interface SaleItem {
  id: string;
  orderId: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  pricePaise: number;
  platformFeePaise: number;
  sellerEarningsPaise: number;
  licenseType: string;
  orderStatus: string;
  createdAt: string;
}

interface SalesPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function SellerSalesPage() {
  const { token } = useSellerAuth();
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [pagination, setPagination] = useState<SalesPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSales = async (page = 1) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/seller/sales?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load sales transactions");
      }
      setSales(data.data.sales || []);
      setPagination(data.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSales(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const formatRupee = (paise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(paise / 100);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-velvet-border/80">
        <div>
          <h1 className="text-3xl font-serif font-normal text-velvet-cream-soft tracking-tight">
            Sales & Order Fulfillment
          </h1>
          <p className="text-velvet-cream-muted text-xs mt-1">
            Track authorized digital sales, license allocations, and verified creator earnings.
          </p>
        </div>
        <button
          onClick={() => fetchSales(pagination.page)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-velvet-cream bg-velvet-mocha border border-velvet-border rounded-xl hover:border-velvet-cream/40 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Activity
        </button>
      </div>

      {/* Security Privacy Notice */}
      <div className="flex items-start gap-3 p-4 bg-velvet-mocha border border-velvet-border/80 rounded-2xl text-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-serif font-medium text-velvet-cream-soft">Zero Buyer PII Leakage Enforced</p>
          <p className="text-velvet-cream-muted mt-0.5">
            Per marketplace cryptography protocols, buyer personal credentials and payment secrets are kept secure. Only order license tokens and verified settlement figures are displayed.
          </p>
        </div>
      </div>

      {/* Main Table / Content */}
      <div className="bg-velvet-mocha rounded-2xl border border-velvet-border/80 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-950/40 border-b border-rose-900/50 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-velvet-cream-muted">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-velvet-rose" />
            <p className="text-xs font-medium">Loading sales records...</p>
          </div>
        ) : sales.length === 0 ? (
          <div className="py-20 text-center text-velvet-cream-muted">
            <ShoppingBag className="w-12 h-12 text-velvet-cream-muted/40 mx-auto mb-3" />
            <h3 className="font-serif text-base text-velvet-cream-soft">No Sales Recorded Yet</h3>
            <p className="text-xs text-velvet-cream-muted mt-1 max-w-sm mx-auto">
              Once collectors purchase your verified digital assets, fulfillment orders and settlements will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-velvet-plum/60 border-b border-velvet-border/80 text-[10px] font-medium text-velvet-cream-muted uppercase tracking-wider">
                  <th className="py-3 px-4">Order ID & Date</th>
                  <th className="py-3 px-4">Product Title</th>
                  <th className="py-3 px-4">License</th>
                  <th className="py-3 px-4">Gross Sale</th>
                  <th className="py-3 px-4">Platform Fee</th>
                  <th className="py-3 px-4 text-emerald-400">Net Earning</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-velvet-border/50 text-xs">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-velvet-plum/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs text-velvet-cream-muted whitespace-nowrap">
                      <div className="font-medium text-velvet-cream-soft">
                        #{sale.orderId.slice(-8).toUpperCase()}
                      </div>
                      <div className="text-[10px] text-velvet-cream-muted/70 flex items-center gap-1 mt-0.5 font-sans">
                        <Clock className="w-3 h-3 text-velvet-cream-muted/50" />
                        {formatDate(sale.createdAt)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-serif font-medium text-velvet-cream-soft truncate">
                        {sale.productTitle}
                      </div>
                      <Link
                        href={`/products/${sale.productSlug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-[11px] text-velvet-rose hover:text-velvet-rose-soft mt-0.5"
                      >
                        <span>View catalog</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-medium rounded-full bg-velvet-plum text-velvet-cream border border-velvet-border">
                        <Tag className="w-3 h-3 text-velvet-cream-muted" />
                        {sale.licenseType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-velvet-cream-soft whitespace-nowrap">
                      {formatRupee(sale.pricePaise)}
                    </td>
                    <td className="py-3.5 px-4 text-velvet-cream-muted text-xs whitespace-nowrap font-mono">
                      -{formatRupee(sale.platformFeePaise)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-emerald-400 whitespace-nowrap">
                      {formatRupee(sale.sellerEarningsPaise)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                        {sale.orderStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-velvet-border/80 flex items-center justify-between bg-velvet-plum/40">
            <span className="text-xs text-velvet-cream-muted">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} sales)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchSales(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-velvet-plum border border-velvet-border rounded-xl text-velvet-cream hover:border-velvet-cream/40 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={() => fetchSales(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-velvet-plum border border-velvet-border rounded-xl text-velvet-cream hover:border-velvet-cream/40 disabled:opacity-40 transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
