"use client";

import React, { useState } from "react";

export default function TestLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responsePayload, setResponsePayload] = useState<unknown>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Protected endpoint test states
  const [meLoading, setMeLoading] = useState(false);
  const [meStatus, setMeStatus] = useState<number | null>(null);
  const [mePayload, setMePayload] = useState<unknown>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponseStatus(null);
    setResponsePayload(null);
    setAuthToken(null);
    setMeStatus(null);
    setMePayload(null);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      setResponseStatus(res.status);
      const data = await res.json();
      setResponsePayload(data);

      if (res.ok && data.data?.token) {
        setAuthToken(data.data.token);
      }
    } catch (err: unknown) {
      setResponsePayload({ error: err instanceof Error ? err.message : "Network error" });
    } finally {
      setLoading(false);
    }
  };

  const handleTestProtected = async () => {
    setMeLoading(true);
    setMeStatus(null);
    setMePayload(null);

    try {
      const res = await fetch("/api/v1/auth/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken || ""}`,
        },
      });

      setMeStatus(res.status);
      const data = await res.json();
      setMePayload(data);
    } catch (err: unknown) {
      setMePayload({ error: err instanceof Error ? err.message : "Network error" });
    } finally {
      setMeLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 font-sans">
      <div className="mb-6 pb-4 border-b border-slate-700">
        <h1 className="text-2xl font-bold tracking-tight text-white">LOGIN TEST</h1>
        <p className="text-xs text-slate-400 mt-1">
          Temporary verification UI for Feature 02 (Login & Token Verification). Not the final marketplace UI.
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4 bg-slate-900/60 p-6 rounded-xl border border-slate-800">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="rahul@example.com"
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors"
        >
          {loading ? "Authenticating..." : "LOGIN"}
        </button>
      </form>

      {responseStatus !== null && (
        <div className="mt-6 p-4 rounded-xl border border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Login Status: {responseStatus === 200 ? "Authenticated" : "Failed"}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                responseStatus === 200
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}
            >
              HTTP {responseStatus}
            </span>
          </div>
          <pre className="text-xs font-mono text-slate-300 overflow-x-auto p-2 bg-slate-900 rounded mb-4">
            {JSON.stringify(responsePayload, null, 2)}
          </pre>

          {authToken && (
            <div className="pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-emerald-400">
                  ✓ Token Generated (Stored in Session Memory)
                </span>
                <button
                  type="button"
                  onClick={handleTestProtected}
                  disabled={meLoading}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                >
                  {meLoading ? "Verifying..." : "Test Protected GET /api/v1/auth/me"}
                </button>
              </div>

              {meStatus !== null && (
                <div className="p-3 rounded bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-800">
                    <span className="text-xs font-bold text-slate-300">Protected Endpoint Result</span>
                    <span className="text-xs font-mono text-emerald-400">HTTP {meStatus}</span>
                  </div>
                  <pre className="text-xs font-mono text-slate-300 overflow-x-auto">
                    {JSON.stringify(mePayload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
