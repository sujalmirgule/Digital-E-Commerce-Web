"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AdminAuthProvider, useAdminAuth } from "./AdminAuthContext";
import NotificationBell from "@/components/notifications/NotificationBell";
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  ShoppingBag,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  ShieldCheck,
  ShieldAlert,
  Key,
  X,
  Star,
  Receipt as ReceiptIcon,
  History,
  CheckCircle2,
} from "lucide-react";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/sellers", label: "Sellers", icon: Store },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/products/moderation", label: "Moderation", icon: ShieldCheck },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/receipts", label: "Receipts", icon: ReceiptIcon },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/ledger", label: "Financial Ledger", icon: FileText },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: History },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading, error, isAdmin, token, setAuthToken, logout, login } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  React.useEffect(() => {
    if (!loading && (!token || !isAdmin)) {
      router.push("/admin/login");
    }
  }, [loading, token, isAdmin, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/admin/products?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // If not logged in as admin yet, show loading while redirecting to /admin/login
  if (loading || !token || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#120A12] text-[#F7EFE2] flex items-center justify-center p-4 text-xs text-[#BBAE9F]">
        Verifying administrator authorization...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#120A12] text-[#F7EFE2] flex flex-col md:flex-row relative pb-16 md:pb-0">
      {/* Desktop Sidebar matching reference */}
      <aside className="hidden md:flex flex-col w-60 bg-[#120A12] border-r border-[#3A2930] p-4 lg:p-5 shrink-0">
        {/* Brand Header matching reference "Admin Dashboard" */}
        <div className="flex items-center justify-between pb-4 border-b border-[#3A2930]">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#211815] border border-[#3A2930]">
              <span className="w-2 h-2 rounded-full bg-[#F43F5E] shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            </div>
            <span className="text-base font-medium tracking-tight text-[#F7EFE2] font-editorial">
              Marketify
            </span>
          </Link>
          <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-[#211815] text-[#E8D5B5] border border-[#3A2930]">
            Admin
          </span>
        </div>

        {/* Sidebar Search Input */}
        <form onSubmit={handleSearch} className="relative my-3.5">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#BBAE9F] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl bg-[#211815] border border-[#3A2930] text-[#F7EFE2] placeholder-[#BBAE9F]/50 focus:outline-none focus:border-[#E8D5B5] transition-all font-light"
          />
        </form>

        {/* Navigation items with Solid Rose Active Pill */}
        <nav className="flex-1 space-y-1 pt-1">
          {ADMIN_NAV.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs tracking-wide transition-all duration-200 ${
                  isActive
                    ? "bg-[#F43F5E] text-white font-medium shadow-md shadow-[#F43F5E]/30"
                    : "text-[#BBAE9F] hover:bg-[#211815] hover:text-[#F7EFE2]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[#BBAE9F]"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#3A2930] space-y-1.5">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#BBAE9F] hover:text-[#F7EFE2] hover:bg-[#211815] transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#E8D5B5]" />
            <span>Storefront</span>
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#FB7185] hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#120A12]">
        {/* Top Header with Search, Bell, and Admin Profile */}
        <header className="h-16 border-b border-[#3A2930] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 bg-[#120A12]/95 backdrop-blur-sm sticky top-0 z-30">
          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BBAE9F] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search platform resources..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-full bg-[#211815] border border-[#3A2930] text-[#F7EFE2] placeholder-[#BBAE9F]/50 focus:outline-none focus:border-[#E8D5B5] transition-all font-light"
            />
          </form>

          {/* Header Right Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/notifications"
              className="w-8 h-8 rounded-full bg-[#211815] border border-[#3A2930] hover:border-[#E8D5B5]/50 flex items-center justify-center text-[#BBAE9F] hover:text-[#F7EFE2] transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E] absolute top-1.5 right-1.5" />
            </Link>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#211815] border border-[#3A2930] hover:border-[#E8D5B5]/50 text-xs text-[#F7EFE2] transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-[#2B201C] border border-[#3A2930] flex items-center justify-center text-[10px] font-bold text-[#E8D5B5] overflow-hidden">
                  <span>A</span>
                </div>
                <span className="font-medium text-xs text-[#F7EFE2]">Admin</span>
                <ChevronDown className="w-3 h-3 text-[#BBAE9F]" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#211815] border border-[#3A2930] py-2 shadow-2xl z-50 text-xs text-[#F7EFE2]">
                  <div className="px-3.5 py-2 border-b border-[#3A2930]/70">
                    <p className="font-medium">Administrator</p>
                    <p className="text-[10px] text-[#BBAE9F] truncate">Platform Control Lead</p>
                  </div>
                  <Link
                    href="/admin/health"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-3.5 py-2 text-[#BBAE9F] hover:text-[#F7EFE2] hover:bg-[#2B201C] transition-colors"
                  >
                    System Health
                  </Link>
                  <Link
                    href="/admin/audit-logs"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-3.5 py-2 text-[#BBAE9F] hover:text-[#F7EFE2] hover:bg-[#2B201C] transition-colors"
                  >
                    Audit Trail
                  </Link>
                  <div className="pt-1 mt-1 border-t border-[#3A2930]/70">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3.5 py-2 text-[#FB7185] hover:bg-rose-500/10 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Children */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex-1">
          {children}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (as shown in reference bottom-right) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-[#120A12]/95 backdrop-blur-xl border-t border-[#3A2930] px-4 flex items-center justify-around text-[10px] font-mono">
        <Link
          href="/admin"
          className={`flex flex-col items-center gap-1 ${
            pathname === "/admin" ? "text-[#F43F5E]" : "text-[#BBAE9F] hover:text-[#F7EFE2]"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Overview</span>
        </Link>
        <Link
          href="/admin/users"
          className={`flex flex-col items-center gap-1 ${
            pathname === "/admin/users" ? "text-[#F43F5E]" : "text-[#BBAE9F] hover:text-[#F7EFE2]"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users</span>
        </Link>
        <Link
          href="/admin/products"
          className={`flex flex-col items-center gap-1 ${
            pathname === "/admin/products" ? "text-[#F43F5E]" : "text-[#BBAE9F] hover:text-[#F7EFE2]"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Products</span>
        </Link>
        <Link
          href="/admin/orders"
          className={`flex flex-col items-center gap-1 ${
            pathname === "/admin/orders" ? "text-[#F43F5E]" : "text-[#BBAE9F] hover:text-[#F7EFE2]"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Orders</span>
        </Link>
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
