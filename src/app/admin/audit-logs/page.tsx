"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAdminAuth } from "../AdminAuthContext";

interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string | null;
  adminName: string | null;
  action: string;
  targetEntity: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export default function AdminAuditLogsPage() {
  const { adminToken } = useAdminAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [targetEntityFilter, setTargetEntityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "25",
        ...(actionFilter && { action: actionFilter }),
        ...(targetEntityFilter && { targetEntity: targetEntityFilter }),
      });
      const res = await fetch(`/api/v1/admin/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load audit logs");
      setLogs(data.auditLogs);
      setTotal(data.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching audit logs");
    } finally {
      setLoading(false);
    }
  }, [adminToken, page, actionFilter, targetEntityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionBadgeColor = (action: string) => {
    if (action.includes("APPROVE")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (action.includes("REJECT") || action.includes("DELETE") || action.includes("DEACTIVATE"))
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    if (action.includes("ACTIVATE") || action.includes("RESTORE"))
      return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-indigo-400 uppercase tracking-widest font-mono mb-1">
            <Link href="/admin" className="hover:underline">Admin</Link>
            <span>/</span>
            <span>Security & Governance</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Audit Logs</h1>
          <p className="text-sm text-slate-400">
            Immutable chronological record of administrative actions and moderation events
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition"
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1">Action Type</label>
          <input
            type="text"
            placeholder="e.g. APPROVE_SELLER, REJECT_PRODUCT"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1">Target Entity</label>
          <input
            type="text"
            placeholder="e.g. SellerProfile, Product, User"
            value={targetEntityFilter}
            onChange={(e) => {
              setTargetEntityFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={() => {
              setActionFilter("");
              setTargetEntityFilter("");
              setPage(1);
            }}
            className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Admin</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Target ID</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-mono text-xs">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-sm">
                    No audit records found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white text-xs font-medium">
                        {log.adminName || "Administrator"}
                      </div>
                      <div className="text-slate-500 font-mono text-[11px]">
                        {log.adminEmail || log.adminId}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-300">
                      {log.targetEntity}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-400 max-w-[150px] truncate">
                      {log.targetId}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 text-xs font-medium rounded border border-slate-700 transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800/80 text-xs text-slate-400 font-mono">
          <div>
            Showing {logs.length} of {total} events
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 bg-slate-800 disabled:opacity-40 hover:bg-slate-700 text-white rounded transition"
            >
              Previous
            </button>
            <span className="py-1 px-2 text-slate-300">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 25 >= total}
              className="px-3 py-1 bg-slate-800 disabled:opacity-40 hover:bg-slate-700 text-white rounded transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Inspect Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Audit Event Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white font-mono text-sm"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Event ID:</span>
                <span className="text-white">{selectedLog.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Action:</span>
                <span className="text-indigo-400 font-bold">{selectedLog.action}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Admin Email:</span>
                <span className="text-white">{selectedLog.adminEmail || "N/A"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Admin ID:</span>
                <span className="text-slate-300">{selectedLog.adminId}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Target Entity:</span>
                <span className="text-white">{selectedLog.targetEntity}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Target ID:</span>
                <span className="text-slate-300">{selectedLog.targetId}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Recorded At:</span>
                <span className="text-slate-300">{new Date(selectedLog.createdAt).toISOString()}</span>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Metadata:</span>
                <pre className="p-3 bg-slate-950 rounded-lg text-emerald-400 border border-slate-800 overflow-x-auto text-[11px]">
                  {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
