"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SellerAuthProvider, useSellerAuth } from "./SellerAuthContext";
import NotificationBell from "@/components/notifications/NotificationBell";

const SELLER_NAV = [
  { href: "/seller", label: "Overview", icon: "📊" },
  { href: "/seller/products", label: "My Products", icon: "📦" },
  { href: "/seller/products/new", label: "New Product", icon: "➕" },
  { href: "/seller/sales", label: "Sales & Orders", icon: "💰" },
  { href: "/seller/earnings", label: "Earnings & Ledger", icon: "🧾" },
  { href: "/seller/reviews", label: "Reviews", icon: "⭐" },
  { href: "/seller/profile", label: "Store Settings", icon: "⚙️" },
];

function SellerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, profile, isApproved, token, loading, login, logout, setAuthToken, error } = useSellerAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Quick login state for testing
  const [emailInput, setEmailInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passInput) return;
    setLoginSubmitting(true);
    await login(emailInput, passInput);
    setLoginSubmitting(false);
  };

  const handleTokenPaste = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      setAuthToken(tokenInput.trim());
      setTokenInput("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Link href="/seller" className="font-bold text-lg text-white flex items-center gap-1.5">
            <span className="text-emerald-400">🏪</span> Seller Hub
          </Link>
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
            {profile?.status || user?.sellerStatus || "Portal"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <NotificationBell token={token} accentColor="emerald" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-col gap-1">
          {SELLER_NAV.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          {user && (
            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10"
            >
              <span>🚪</span> Sign Out
            </button>
          )}
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-5 shrink-0">
        {/* Brand */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <Link href="/seller" className="font-extrabold text-xl text-white flex items-center gap-2">
            <span className="text-emerald-400 text-2xl">🏪</span>
            <span>Creator Hub</span>
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell token={token} accentColor="emerald" />
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
              Seller Studio
            </span>
          </div>
        </div>

        {/* Store Mini Profile */}
        <div className="my-5 p-3 rounded-xl bg-slate-800/60 border border-slate-800">
          {loading ? (
            <div className="animate-pulse flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-700"></div>
              <div className="space-y-1.5 flex-1">
                <div className="h-3 bg-slate-700 rounded w-3/4"></div>
                <div className="h-2 bg-slate-700 rounded w-1/2"></div>
              </div>
            </div>
          ) : profile ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                {profile.storeName ? profile.storeName[0].toUpperCase() : "S"}
              </div>
              <div className="overflow-hidden">
                <div className="font-semibold text-xs text-white truncate">{profile.storeName}</div>
                <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                  <span>●</span> APPROVED SELLER
                </div>
              </div>
            </div>
          ) : user ? (
            <div className="space-y-1 text-xs">
              <div className="font-semibold text-white">{user.fullName}</div>
              <div className="text-[11px] text-amber-400">
                Seller Status: {user.sellerStatus || "NOT_ONBOARDED"}
              </div>
            </div>
          ) : (
            <div className="text-xs text-amber-400 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>Not signed in</span>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1">
          {SELLER_NAV.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-500/20"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <span>🛍️</span> Switch to Buyer Hub
          </Link>
          {user && (
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            >
              <span>🚪</span> Sign Out
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Unauthenticated or Non-Approved Banner */}
        {!loading && (!token || !isApproved) && (
          <div className="bg-amber-950/40 border-b border-amber-800/50 p-4 md:p-6 text-amber-200">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-sm text-amber-100 flex items-center gap-1.5">
                  <span>🔒</span> Approved Seller Authorization Required
                </h3>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  {!token
                    ? "Sign in with your approved seller account or provide a seller JWT."
                    : user?.sellerStatus === "PENDING"
                    ? "Your seller application is currently pending admin moderation. You will receive access once approved."
                    : user?.sellerStatus === "REJECTED"
                    ? "Your seller application was rejected. Please contact marketplace operations."
                    : "This account has not onboarded as a seller yet."}
                </p>
              </div>

              {/* Quick Login Form */}
              <form onSubmit={handleLoginSubmit} className="flex flex-wrap items-center gap-2 text-xs">
                <input
                  type="email"
                  placeholder="seller@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={passInput}
                  onChange={(e) => setPassInput(e.target.value)}
                  className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
                <button
                  type="submit"
                  disabled={loginSubmitting}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50"
                >
                  {loginSubmitting ? "..." : "Sign In"}
                </button>
              </form>
            </div>

            {/* Paste JWT option */}
            <div className="max-w-4xl mx-auto mt-2 pt-2 border-t border-amber-800/30 flex items-center gap-2">
              <span className="text-[11px] text-amber-400/80">Or use Bearer Token:</span>
              <form onSubmit={handleTokenPaste} className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="flex-1 px-2 py-1 text-[11px] rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono"
                />
                <button
                  type="submit"
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-medium border border-slate-700"
                >
                  Set Token
                </button>
              </form>
            </div>

            {error && (
              <div className="max-w-4xl mx-auto mt-2 text-xs text-red-400 font-medium">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Page Children */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <SellerAuthProvider>
      <SellerShell>{children}</SellerShell>
    </SellerAuthProvider>
  );
}
