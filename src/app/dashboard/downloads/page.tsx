"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useDashboardAuth } from "../DashboardAuthContext";
import { BuyerDownloadItemDTO } from "@/lib/services/buyer-dashboard";
import { Download, Search, AlertCircle, FileText, Loader2 } from "lucide-react";

export default function BuyerDownloadsPage() {
  const { token, fetchWithAuth } = useDashboardAuth();
  const [downloads, setDownloads] = useState<BuyerDownloadItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadDownloads = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithAuth("/api/v1/buyer/downloads");
      const json = await res.json();

      if (res.ok && Array.isArray(json.data)) {
        setDownloads(json.data);
      } else {
        setError(json.error?.message || "Failed to load downloads");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [token, fetchWithAuth]);

  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  const handleDownload = async (fileId: string, directUrl: string) => {
    try {
      setDownloadingId(fileId);
      const res = await fetchWithAuth(`/api/v1/buyer/downloads/${fileId}/url`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.data?.downloadUrl) {
        window.open(json.data.downloadUrl, "_blank");
      } else {
        const fallbackUrl = token ? `${directUrl}?token=${encodeURIComponent(token)}` : directUrl;
        window.open(fallbackUrl, "_blank");
      }
    } catch {
      const fallbackUrl = token ? `${directUrl}?token=${encodeURIComponent(token)}` : directUrl;
      window.open(fallbackUrl, "_blank");
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredDownloads = downloads.filter(
    (item) =>
      item.productTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sellerStoreName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3A2930]">
        <div>
          <h1 className="text-3xl font-serif font-normal text-[#F7EFE2] tracking-tight">
            Digital Downloads Vault
          </h1>
          <p className="text-[#BBAE9F] text-xs mt-1">
            Direct, cryptographic access to all software packages, zip archives, and licensed media files.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#BBAE9F]" />
          <input
            type="text"
            placeholder="Search files or products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl bg-[#211815] border border-[#3A2930] text-[#F7EFE2] placeholder-[#BBAE9F]/50 focus:outline-none focus:border-[#E8D5B5] transition-all font-light"
          />
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3.5 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-[#211815] border border-[#3A2930] rounded-2xl p-4"></div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-[#211815] border border-rose-900/50 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadDownloads}
            className="px-3 py-1 rounded-lg bg-[#F43F5E] text-white text-xs font-medium hover:bg-[#F43F5E]/90"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredDownloads.length === 0 && (
        <div className="py-20 text-center bg-[#211815]/40 border border-[#3A2930] rounded-3xl p-8 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-[#120A12] border border-[#3A2930] flex items-center justify-center text-xl mx-auto mb-3">
            <Download className="w-5 h-5 text-[#BBAE9F]" />
          </div>
          <h3 className="font-serif text-base text-[#F7EFE2]">
            {searchQuery ? "No matching files found" : "No digital files to download"}
          </h3>
          <p className="text-xs text-[#BBAE9F] max-w-sm mx-auto mt-1 mb-6">
            {searchQuery
              ? `No downloadable assets matched query "${searchQuery}".`
              : "You currently do not have any active product files provisioned. Purchased items will appear here immediately after payment verification."}
          </p>
          {!searchQuery && (
            <Link
              href="/products"
              className="inline-flex px-5 py-2.5 rounded-full bg-[#F43F5E] hover:bg-[#F43F5E]/90 text-white text-xs font-semibold shadow-md transition-colors"
            >
              Explore Digital Assets →
            </Link>
          )}
        </div>
      )}

      {/* Downloads list */}
      {!loading && filteredDownloads.length > 0 && (
        <div className="divide-y divide-[#3A2930] bg-[#211815] border border-[#3A2930] rounded-2xl overflow-hidden shadow-sm">
          {filteredDownloads.map((item) => (
            <div
              key={item.productFileId}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#211815]/70 transition-colors"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-[#F7EFE2] text-sm truncate">
                    {item.productTitle}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#120A12] border border-[#3A2930] text-[#E8D5B5]">
                    v{item.productVersion}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-[#BBAE9F] font-mono">
                  <span className="text-[#E8D5B5] font-medium flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    {item.filename}
                  </span>
                  <span>·</span>
                  <span>{(item.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                  <span>·</span>
                  <span className="text-[#BBAE9F] font-sans">Seller: {item.sellerStoreName}</span>
                </div>

                <div className="text-[11px] text-[#BBAE9F]/70 font-mono">
                  Purchased on {new Date(item.purchasedAt).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => handleDownload(item.productFileId, item.downloadUrl)}
                  disabled={downloadingId === item.productFileId}
                  className="px-4 py-2 rounded-xl bg-[#F43F5E] hover:bg-[#F43F5E]/90 text-white text-xs font-medium flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
                >
                  {downloadingId === item.productFileId ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Authorizing...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download File</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
