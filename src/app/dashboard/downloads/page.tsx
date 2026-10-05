"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useDashboardAuth } from "../DashboardAuthContext";
import { BuyerDownloadItemDTO } from "@/lib/services/buyer-dashboard";

export default function BuyerDownloadsPage() {
  const { token, fetchWithAuth } = useDashboardAuth();
  const [downloads, setDownloads] = useState<BuyerDownloadItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Digital Downloads Vault</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Direct, secure access to all software packages, zip archives, and licensed media files.
          </p>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse"></div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-200 text-sm">
          <span>⚠️ {error}</span>
          <button onClick={loadDownloads} className="ml-3 underline hover:text-white">
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && downloads.length === 0 && (
        <div className="py-16 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8">
          <div className="text-4xl mb-3">⬇️</div>
          <h3 className="font-bold text-base text-white">No digital files to download</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            You currently do not have any active product files provisioned. Purchased items will appear here immediately after payment verification.
          </p>
          <Link
            href="/test/catalog"
            className="inline-flex px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Explore Digital Assets
          </Link>
        </div>
      )}

      {/* Downloads list */}
      {!loading && downloads.length > 0 && (
        <div className="divide-y divide-slate-800/80 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {downloads.map((item) => (
            <div
              key={item.productFileId}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">
                    {item.productTitle}
                  </span>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                    v{item.productVersion}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                  <span className="text-slate-200 font-medium">📄 {item.filename}</span>
                  <span>·</span>
                  <span>{(item.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                  <span>·</span>
                  <span className="text-slate-400 font-sans">{item.sellerStoreName}</span>
                </div>

                <div className="text-[11px] text-slate-500">
                  Purchased on {new Date(item.purchasedAt).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={item.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
                >
                  <span>⬇️</span> Download Asset
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
