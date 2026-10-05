"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAdminAuth } from "../AdminAuthContext";

interface HealthData {
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  database: {
    status: string;
    latencyMs: number;
    connected: boolean;
  };
  server: {
    uptimeSeconds: number;
    timestamp: string;
    nodeVersion: string;
    environment: string;
  };
}

export default function AdminHealthPage() {
  const { adminToken } = useAdminAuth();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealth = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/health", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch health");
      setHealth(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error querying health status");
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchHealth();
    if (!autoRefresh) return;
    const interval = setInterval(fetchHealth, 10000); // 10s auto ping
    return () => clearInterval(interval);
  }, [fetchHealth, autoRefresh]);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d > 0 ? `${d}d ` : ""}${h}h ${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-indigo-400 uppercase tracking-widest font-mono mb-1">
            <Link href="/admin" className="hover:underline">Admin</Link>
            <span>/</span>
            <span>Diagnostics</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Health & Telemetry</h1>
          <p className="text-sm text-slate-400">
            Real-time infrastructure health, database connectivity, and runtime metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
            />
            Auto-refresh (10s)
          </label>
          <button
            onClick={() => fetchHealth()}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition"
          >
            {loading ? "Pinging..." : "↻ Ping Now"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
          {error}
        </div>
      )}

      {health && (
        <>
          {/* Top Status Banner */}
          <div
            className={`p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              health.status === "HEALTHY"
                ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
                : health.status === "DEGRADED"
                ? "bg-amber-950/20 border-amber-500/30 text-amber-400"
                : "bg-rose-950/20 border-rose-500/30 text-rose-400"
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold border ${
                  health.status === "HEALTHY"
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    : health.status === "DEGRADED"
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-rose-500/20 border-rose-500/40 text-rose-300"
                }`}
              >
                {health.status === "HEALTHY" ? "✓" : "!"}
              </div>
              <div>
                <div className="text-xl font-bold tracking-tight">
                  Platform Core: {health.status}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Last verified at {new Date(health.server.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Uptime
              </span>
              <div className="text-base font-mono font-bold text-white">
                {formatUptime(health.server.uptimeSeconds)}
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Database Diagnostics */}
            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm">PostgreSQL Cluster</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${
                    health.database.connected
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`}
                >
                  {health.database.status}
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Connection:</span>
                  <span className="text-slate-200">
                    {health.database.connected ? "Active & Healthy" : "Disconnected"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Query Latency:</span>
                  <span
                    className={`font-bold ${
                      health.database.latencyMs < 50
                        ? "text-emerald-400"
                        : health.database.latencyMs < 150
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}
                  >
                    {health.database.latencyMs} ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ORM / Driver:</span>
                  <span className="text-slate-200">Prisma Client v6.4.1</span>
                </div>
              </div>
            </div>

            {/* Application Environment */}
            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm">Runtime Environment</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {health.server.environment}
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Node Runtime:</span>
                  <span className="text-slate-200">{health.server.nodeVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Framework:</span>
                  <span className="text-slate-200">Next.js 14.2.3 App Router</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Timezone / Host:</span>
                  <span className="text-slate-200">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
