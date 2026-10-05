"use client";

import React, { useState } from "react";

export default function TestSignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responsePayload, setResponsePayload] = useState<unknown>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);
    setResponseStatus(null);
    setResponsePayload(null);

    if (password !== confirmPassword) {
      setClientError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
        }),
      });

      setResponseStatus(res.status);
      const data = await res.json();
      setResponsePayload(data);
    } catch (err: unknown) {
      setClientError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 font-sans">
      <div className="mb-6 pb-4 border-b border-slate-700">
        <h1 className="text-2xl font-bold tracking-tight text-white">TEST SIGNUP</h1>
        <p className="text-xs text-slate-400 mt-1">
          Temporary verification UI for Feature 01 (User Signup). Not the final marketplace UI.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900/60 p-6 rounded-xl border border-slate-800">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1" htmlFor="name">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Rahul Sharma"
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="rahul@example.com"
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1" htmlFor="password">
            Password (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special)
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        {clientError && (
          <div className="p-3 text-xs rounded bg-rose-500/10 border border-rose-500/20 text-rose-400">
            {clientError}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors"
        >
          {loading ? "Processing..." : "Create Account"}
        </button>
      </form>

      {responseStatus !== null && (
        <div className="mt-6 p-4 rounded-xl border border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              API Response
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                responseStatus >= 200 && responseStatus < 300
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}
            >
              HTTP {responseStatus}
            </span>
          </div>
          <pre className="text-xs font-mono text-slate-300 overflow-x-auto p-2 bg-slate-900 rounded">
            {JSON.stringify(responsePayload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
