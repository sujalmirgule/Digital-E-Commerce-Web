"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers,
  Package,
  PlusCircle,
  TrendingUp,
  Receipt,
  Star,
  Settings,
  LogOut,
  ShoppingBag,
  ArrowRight,
  Shield,
  Menu,
  X,
  Lock,
} from "lucide-react";
import { SellerAuthProvider, useSellerAuth } from "./SellerAuthContext";
import NotificationBell from "@/components/notifications/NotificationBell";

const SELLER_NAV = [
  { href: "/seller", label: "Overview", icon: Layers },
  { href: "/seller/products", label: "My Products", icon: Package },
  { href: "/seller/products/new", label: "New Product", icon: PlusCircle },
  { href: "/seller/sales", label: "Sales & Orders", icon: TrendingUp },
  { href: "/seller/earnings", label: "Earnings & Ledger", icon: Receipt },
  { href: "/seller/reviews", label: "Reviews", icon: Star },
  { href: "/seller/profile", label: "Store Settings", icon: Settings },
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
    <div className="min-h-screen bg-[#06080d] text-slate-100 flex flex-col md:flex-row relative">
      {/* Mobile Topbar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#090d16] border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Link href="/" className="font-bold text-base text-white flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
            <span>Aura</span>
          </Link>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 font-medium border border-orange-500/20">
            {profile?.status || user?.sellerStatus || "Creator Portal"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell token={token} accentColor="orange" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#090d16] border-b border-slate-800 px-4 py-3 flex flex-col gap-1">
          {SELLER_NAV.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                  isActive
                    ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium shadow-md shadow-orange-500/20"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
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
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono text-rose-400 hover:bg-rose-500/10"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#090d16]/95 border-r border-slate-800/80 p-5 shrink-0 backdrop-blur-md">
        {/* Brand */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800/80">
          <Link href="/" className="font-semibold text-sm text-white flex items-center gap-2 font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
            <span>Aura<span className="text-orange-500">.</span>Digital</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <NotificationBell token={token} accentColor="orange" />
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 font-medium border border-orange-500/30">
              Seller
            </span>
          </div>
        </div>

        {/* Store Mini Profile */}
        <div className="my-5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
          {loading ? (
            <div className="animate-pulse flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800"></div>
              <div className="space-y-1.5 flex-1">
                <div className="h-3 bg-slate-800 rounded w-3/4"></div>
                <div className="h-2 bg-slate-800 rounded w-1/2"></div>
              </div>
            </div>
          ) : profile ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-orange-500/20">
                {profile.storeName ? profile.storeName[0].toUpperCase() : "S"}
              </div>
              <div className="overflow-hidden">
                <div className="font-semibold text-xs text-white truncate">{profile.storeName}</div>
                <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <span>●</span> APPROVED CREATOR
                </div>
              </div>
            </div>
          ) : user ? (
            <div className="space-y-1 text-xs font-mono">
              <div className="font-semibold text-white truncate">{user.fullName}</div>
              <div className="text-[10px] text-amber-400">
                Status: {user.sellerStatus || "NOT_ONBOARDED"}
              </div>
            </div>
          ) : (
            <div className="text-xs font-mono text-amber-400 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>Not signed in</span>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1">
          {SELLER_NAV.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium shadow-md shadow-orange-500/20"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
            <span>Switch to Buyer Hub</span>
          </Link>
          {user && (
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#06080d]">
        {/* Unauthenticated or Non-Approved Banner */}
        {!loading && (!token || !isApproved) && (
          <div className="bg-amber-950/20 border-b border-amber-800/40 p-4 md:p-5 text-amber-200">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-xs text-amber-100 flex items-center gap-1.5 font-mono">
                  <Lock className="w-3.5 h-3.5 text-orange-400" />
                  <span>Approved Seller Authorization Required</span>
                </h3>
                <p className="text-[11px] text-amber-300/80 mt-0.5 font-light">
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
              <form onSubmit={handleLoginSubmit} className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <input
                  type="email"
                  placeholder="seller@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={passInput}
                  onChange={(e) => setPassInput(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  required
                />
                <button
                  type="submit"
                  disabled={loginSubmitting}
                  className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-medium disabled:opacity-50 transition-colors"
                >
                  {loginSubmitting ? "..." : "Sign In"}
                </button>
              </form>
            </div>

            {/* Paste JWT option */}
            <div className="max-w-4xl mx-auto mt-2 pt-2 border-t border-amber-800/20 flex items-center gap-2">
              <span className="text-[10px] font-mono text-amber-400/80">Or use Bearer Token:</span>
              <form onSubmit={handleTokenPaste} className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="flex-1 px-2 py-1 text-[10px] rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-mono"
                />
                <button
                  type="submit"
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-mono border border-slate-700"
                >
                  Set Token
                </button>
              </form>
            </div>

            {error && (
              <div className="max-w-4xl mx-auto mt-2 text-xs text-rose-400 font-medium">
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
