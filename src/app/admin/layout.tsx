"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminAuthProvider, useAdminAuth } from "./AdminAuthContext";
import NotificationBell from "@/components/notifications/NotificationBell";
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  ShoppingBag,
  CreditCard,
  RotateCcw,
  FileText,
  Star,
  BookOpen,
  Activity,
  History,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  Key,
  ChevronRight,
  Server,
} from "lucide-react";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading, error, isAdmin, token, setAuthToken, logout, login } = useAdminAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const navigation = [
    {
      category: "Platform",
      items: [
        { name: "Overview", href: "/admin", icon: LayoutDashboard },
        { name: "System Health", href: "/admin/health", icon: Activity },
        { name: "Audit Logs", href: "/admin/audit-logs", icon: History },
      ],
    },
    {
      category: "Marketplace",
      items: [
        { name: "Sellers", href: "/admin/sellers", icon: Store },
        { name: "Products", href: "/admin/products", icon: Package },
        { name: "Reviews", href: "/admin/reviews", icon: Star },
      ],
    },
    {
      category: "Commerce & Finance",
      items: [
        { name: "Orders", href: "/admin/orders", icon: ShoppingBag },
        { name: "Payments", href: "/admin/payments", icon: CreditCard },
        { name: "Refunds", href: "/admin/refunds", icon: RotateCcw },
        { name: "Receipts", href: "/admin/receipts", icon: FileText },
        { name: "Platform Ledger", href: "/admin/ledger", icon: BookOpen },
      ],
    },
    {
      category: "Security & Governance",
      items: [
        { name: "User Directory", href: "/admin/users", icon: Users },
      ],
    },
  ];

  const handleManualTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualToken.trim()) {
      setAuthToken(manualToken.trim());
      setTokenModalOpen(false);
      setManualToken("");
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginEmail || !loginPassword) return;
    try {
      await login(loginEmail, loginPassword);
    } catch (err: any) {
      setLoginError(err.message || "Failed to sign in as administrator.");
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#06080d] text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-slate-400">Verifying Admin Governance Privileges...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated or Non-Admin State
  if (!token || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#06080d] text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#090d16] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-light tracking-tight text-white">
              Admin Control Center
            </h1>
            <p className="text-xs text-slate-400 font-light">
              Restricted area. Verified platform administrators only.
            </p>
          </div>

          {(error || loginError) && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{loginError || error}</span>
            </div>
          )}

          {/* Admin Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@marketplace.com"
                className="w-full text-xs font-mono px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full text-xs font-mono px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-mono font-medium text-xs rounded-xl shadow-lg shadow-orange-600/25 transition-all"
            >
              Sign In to Control Center
            </button>
          </form>

          {/* Quick Token Paste Section */}
          <div className="pt-4 border-t border-slate-800/80 text-center">
            <button
              type="button"
              onClick={() => setTokenModalOpen(true)}
              className="text-xs font-mono text-slate-400 hover:text-orange-400 inline-flex items-center gap-1.5 transition-colors"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Direct JWT Token Entry</span>
            </button>
          </div>

          {/* Modal for manual JWT entry */}
          {tokenModalOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#090d16] border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white text-sm font-mono">Enter Admin Bearer Token</h3>
                  <button
                    onClick={() => setTokenModalOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 font-light">
                  Paste a valid JWT token signed with ADMIN role privileges.
                </p>
                <textarea
                  rows={4}
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full text-xs font-mono p-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-orange-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setTokenModalOpen(false)}
                    className="px-3 py-1.5 text-xs font-mono text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleManualTokenSubmit}
                    className="px-4 py-1.5 text-xs font-mono bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg"
                  >
                    Set Token
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Authenticated Admin Dashboard Layout
  return (
    <div className="min-h-screen bg-[#06080d] text-slate-100 flex flex-col lg:flex-row antialiased">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#090d16]/95 border-r border-slate-800/80 shrink-0 backdrop-blur-md">
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-bold shadow-md shadow-orange-600/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-xs text-white tracking-tight font-mono">Aura<span className="text-orange-500">.</span>Core</span>
              <span className="block text-[9px] text-orange-400 font-mono tracking-widest uppercase font-semibold">
                Control Center
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <NotificationBell token={token} accentColor="orange" notificationsPageHref="/notifications" />
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
              ADMIN
            </span>
          </div>
        </div>

        {/* Navigation Categories */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {navigation.map((group) => (
            <div key={group.category} className="space-y-1.5">
              <h3 className="px-3 text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest">
                {group.category}
              </h3>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/admin" && pathname?.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium shadow-md shadow-orange-500/20"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Admin User Footer Card */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-orange-400 font-mono">
                {user?.fullName?.charAt(0).toUpperCase() || "A"}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-slate-200 truncate">{user?.fullName || "Administrator"}</div>
                <div className="text-[10px] text-slate-400 truncate font-mono">{user?.email || "admin@platform.com"}</div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#06080d]">
        {/* Top Navbar */}
        <header className="h-16 px-4 sm:px-6 bg-[#090d16]/80 border-b border-slate-800/80 flex items-center justify-between sticky top-0 z-30 backdrop-blur">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Server className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300 font-medium hidden sm:inline">Engine:</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Operational
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTokenModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition"
            >
              <Key className="w-3.5 h-3.5 text-orange-400" />
              Switch Token
            </button>
            <Link
              href="/products"
              className="inline-flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-orange-400 transition-colors"
            >
              Public Catalog
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#090d16] border-b border-slate-800 p-4 space-y-4">
            {navigation.map((group) => (
              <div key={group.category} className="space-y-1">
                <h4 className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest px-2">
                  {group.category}
                </h4>
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono ${
                        isActive
                          ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Modal for manual JWT entry in admin layout */}
        {tokenModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#090d16] border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white text-sm font-mono">Switch Admin Bearer Token</h3>
                <button
                  onClick={() => setTokenModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400 font-light">
                Paste an active JWT token signed for an ADMIN user to switch sessions.
              </p>
              <textarea
                rows={4}
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full text-xs font-mono p-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-orange-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTokenModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-mono text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleManualTokenSubmit}
                  className="px-4 py-1.5 text-xs font-mono bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg"
                >
                  Apply Token
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminAuthProvider>
  );
}
