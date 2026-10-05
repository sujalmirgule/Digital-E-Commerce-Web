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
    } catch (err: any) {
      setError(err.message || "An error occurred");
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sales & Order Fulfillment
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track authorized digital sales, license distributions, and order fulfillment.
          </p>
        </div>
        <button
          onClick={() => fetchSales(pagination.page)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Security Privacy Notice */}
      <div className="flex items-start gap-3 p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-emerald-800 text-xs sm:text-sm">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-emerald-900">Zero Buyer PII Leakage Enforced</p>
          <p className="text-emerald-700 mt-0.5">
            Per data privacy protocols, buyer personal credentials and payment secrets are kept secure. Only fulfillment order items and verified settlement figures are displayed.
          </p>
        </div>
      </div>

      {/* Main Table / Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
            <p className="text-sm font-medium">Loading sales records...</p>
          </div>
        ) : sales.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No Sales Recorded Yet</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              Once buyers purchase your published digital assets, verified fulfillment items will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Order ID & Date</th>
                  <th className="py-3 px-4">Product Title</th>
                  <th className="py-3 px-4">License</th>
                  <th className="py-3 px-4">Gross Sale</th>
                  <th className="py-3 px-4">Platform Fee</th>
                  <th className="py-3 px-4 text-emerald-600">Net Earning</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                      <div className="font-semibold text-slate-700">
                        #{sale.orderId.slice(-8).toUpperCase()}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {formatDate(sale.createdAt)}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-slate-900 truncate">
                        {sale.productTitle}
                      </div>
                      <Link
                        href={`/products/${sale.productSlug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 hover:underline mt-0.5"
                      >
                        <span>View catalog</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        <Tag className="w-3 h-3 text-slate-500" />
                        {sale.licenseType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {formatRupee(sale.pricePaise)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">
                      -{formatRupee(sale.platformFeePaise)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-600 whitespace-nowrap">
                      {formatRupee(sale.sellerEarningsPaise)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
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
          <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
            <span className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} sales)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchSales(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={() => fetchSales(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
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
