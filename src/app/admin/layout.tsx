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
    const ok = await login(loginEmail, loginPassword);
    if (!ok) {
      setLoginError("Invalid admin credentials or account is not an administrator.");
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium tracking-wide">Verifying Administrator Privileges...</p>
      </div>
    );
  }

  // 2. Unauthenticated or Non-Admin State
  if (!token || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Admin Control Center
            </h1>
            <p className="text-xs text-slate-400">
              Restricted area. Only verified platform administrators may enter.
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
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@marketplace.com"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-rose-600/25 transition-colors"
            >
              Sign In to Control Center
            </button>
          </form>

          {/* Quick Token Paste Section */}
          <div className="pt-4 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={() => setTokenModalOpen(true)}
              className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1.5 underline underline-offset-4"
            >
              <Key className="w-3.5 h-3.5" />
              Direct JWT Token Entry
            </button>
          </div>

          {/* Modal for manual JWT entry */}
          {tokenModalOpen && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white text-sm">Enter Admin Bearer Token</h3>
                  <button
                    onClick={() => setTokenModalOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Paste a valid JWT token signed with ADMIN role privileges.
                </p>
                <textarea
                  rows={4}
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full text-xs font-mono p-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setTokenModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleManualTokenSubmit}
                    className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg"
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row">
      {/* Desktop Left Navigation Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-72 bg-slate-900/90 border-r border-slate-800 shrink-0 select-none">
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white font-bold shadow-md shadow-rose-600/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-tight">Marketplace Core</span>
              <span className="block text-[10px] text-rose-400 font-mono tracking-widest uppercase font-semibold">
                Control Center
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <NotificationBell token={token} accentColor="violet" notificationsPageHref="/notifications" />
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              ADMIN
            </span>
          </div>
        </div>

        {/* Navigation Categories */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {navigation.map((group) => (
            <div key={group.category} className="space-y-1.5">
              <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {group.category}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/admin" && pathname?.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-rose-500/15 text-rose-400 border border-rose-500/20 shadow-sm"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-rose-400" : "text-slate-400"}`} />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Admin User Footer Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-rose-400">
                {user?.fullName?.charAt(0).toUpperCase() || "A"}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-slate-200 truncate">{user?.fullName || "Administrator"}</div>
                <div className="text-[11px] text-slate-400 truncate">{user?.email || "admin@platform.com"}</div>
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 px-4 sm:px-6 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between sticky top-0 z-30 backdrop-blur">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Server className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300 font-medium hidden sm:inline">Platform Status:</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Operational
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTokenModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              Switch Token
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
            >
              Public Catalog
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-4">
            {navigation.map((group) => (
              <div key={group.category} className="space-y-1">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                  {group.category}
                </h4>
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                        isActive
                          ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
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
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white text-sm">Switch Admin Bearer Token</h3>
                <button
                  onClick={() => setTokenModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Paste an active JWT token signed for an ADMIN user to switch sessions.
              </p>
              <textarea
                rows={4}
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full text-xs font-mono p-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-rose-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTokenModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleManualTokenSubmit}
                  className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg"
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
