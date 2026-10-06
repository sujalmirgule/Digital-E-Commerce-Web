"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  Search,
} from "lucide-react";

interface OrderItemRow {
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

interface OrderPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function SellerOrdersPage() {
  const { token, fetchWithAuth } = useSellerAuth();
  const [orders, setOrders] = useState<OrderItemRow[]>([]);
  const [pagination, setPagination] = useState<OrderPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadOrders = useCallback(
    async (page = 1) => {
      if (!token) return;
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", "10");

        const res = await fetchWithAuth(`/api/v1/seller/sales?${params.toString()}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error?.message || "Failed to load seller orders");
        }

        setOrders(data.data.sales || []);
        setPagination(data.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    [token, fetchWithAuth]
  );

  useEffect(() => {
    loadOrders(1);
  }, [loadOrders]);

  const formatRupee = (paise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(paise / 100);
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      searchQuery === "" ||
      o.productTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.orderId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "" || o.orderStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-velvet-border/80">
        <div>
          <h1 className="text-3xl font-serif font-normal text-velvet-cream-soft tracking-tight">
            Order Fulfillment & Transactions
          </h1>
          <p className="text-velvet-cream-muted text-xs mt-1">
            Orders containing your digital assets, license allocations, and verified payout calculations.
          </p>
        </div>
        <button
          onClick={() => loadOrders(pagination.page)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-velvet-cream bg-velvet-mocha border border-velvet-border rounded-xl hover:border-velvet-cream/40 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Orders
        </button>
      </div>

      {/* Security Notice */}
      <div className="flex items-start gap-3 p-4 bg-velvet-mocha border border-velvet-border/80 rounded-2xl text-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-serif font-medium text-velvet-cream-soft">Strict Privacy Isolation</p>
          <p className="text-velvet-cream-muted mt-0.5">
            Only orders containing your products are accessible. Buyer personal information (passwords, payment cards, sensitive PII) is completely masked per PCI-DSS and privacy architecture.
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {["", "PAID", "PENDING", "CANCELLED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                statusFilter === st
                  ? "bg-velvet-rose text-white"
                  : "bg-velvet-mocha border border-velvet-border text-velvet-cream-muted hover:text-velvet-cream"
              }`}
            >
              {st === "" ? "All Statuses" : st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-velvet-cream-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID or Product..."
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl bg-velvet-mocha border border-velvet-border text-velvet-cream placeholder-velvet-cream-muted/50 focus:outline-none focus:border-velvet-cream font-light"
          />
        </div>
      </div>

      {/* Main Table */}
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
            <p className="text-xs font-mono">Loading order records...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center text-velvet-cream-muted space-y-2">
            <ShoppingBag className="w-12 h-12 text-velvet-cream-muted/40 mx-auto" />
            <h3 className="font-serif text-base text-velvet-cream-soft">No Orders Found</h3>
            <p className="text-xs text-velvet-cream-muted max-w-sm mx-auto">
              When buyers purchase products from your catalog, fulfillments will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-velvet-border/60 text-velvet-cream-muted uppercase text-[10px] tracking-wider font-mono">
                  <th className="py-3 px-4 font-medium">Order ID</th>
                  <th className="py-3 px-4 font-medium">Product</th>
                  <th className="py-3 px-4 font-medium">License</th>
                  <th className="py-3 px-4 font-medium">Gross</th>
                  <th className="py-3 px-4 font-medium">Net Earnings</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-velvet-border/50 text-velvet-cream-soft">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-velvet-plum/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-velvet-cream">
                      #{order.orderId.substring(0, 10)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/seller/products/${order.productId}`}
                        className="font-medium text-velvet-cream-soft hover:text-velvet-rose transition-colors"
                      >
                        {order.productTitle}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-velvet-plum border border-velvet-border text-[10px] font-mono text-velvet-cream-muted">
                        {order.licenseType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-velvet-cream-muted">
                      {formatRupee(order.pricePaise)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-emerald-400">
                      {formatRupee(order.sellerEarningsPaise)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                          order.orderStatus === "PAID"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {order.orderStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-velvet-cream-muted font-mono">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-velvet-border/60 flex items-center justify-between text-xs">
            <span className="text-velvet-cream-muted font-mono text-[11px]">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadOrders(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg bg-velvet-plum border border-velvet-border text-velvet-cream disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => loadOrders(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 rounded-lg bg-velvet-plum border border-velvet-border text-velvet-cream disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
