"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Layers,
  Package,
  TrendingUp,
  Receipt,
  BarChart3,
  Star,
  Settings,
  LogOut,
  ShoppingBag,
  Search,
  Bell,
  ChevronDown,
  Menu,
  X,
  PlusCircle,
} from "lucide-react";
import { SellerAuthProvider, useSellerAuth } from "./SellerAuthContext";

const SELLER_NAV = [
  { href: "/seller", label: "Dashboard", icon: Layers },
  { href: "/seller/products", label: "Products", icon: Package },
  { href: "/seller/orders", label: "Orders", icon: ShoppingBag },
  { href: "/seller/sales", label: "Sales", icon: TrendingUp },
  { href: "/seller/earnings", label: "Earnings", icon: Receipt },
  { href: "/seller/ledger", label: "Ledger", icon: BarChart3 },
  { href: "/seller/reviews", label: "Reviews", icon: Star },
  { href: "/seller/profile", label: "Profile", icon: Settings },
  { href: "/seller/settings", label: "Settings", icon: Settings },
];

function SellerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isApproved, token, loading, logout, login } = useSellerAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!loading) {
      if (!token) {
        router.push("/login");
      } else if (user && !user.hasSellerProfile) {
        router.push("/seller/signup");
      } else if (user && user.sellerStatus !== "APPROVED" && pathname !== "/seller") {
        router.push("/seller/application-status");
      }
    }
  }, [loading, token, user, pathname, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/seller/products?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const displayName = profile?.storeName || user?.fullName?.split(" ")[0] || "Creator";

  if (loading || !token) {
    return (
      <div className="min-h-screen bg-[#120A12] flex items-center justify-center text-xs text-[#BBAE9F]">
        Authenticating creator workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#120A12] text-[#F7EFE2] flex flex-col md:flex-row relative pb-16 md:pb-0">
      {/* Desktop Sidebar matching reference */}
      <aside className="hidden md:flex flex-col w-60 bg-[#120A12] border-r border-[#3A2930] p-4 lg:p-5 shrink-0">
        {/* Brand: Marketify */}
        <div className="flex items-center justify-between pb-4 border-b border-[#3A2930]">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#211815] border border-[#3A2930]">
              <span className="w-2 h-2 rounded-full bg-[#F43F5E] shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            </div>
            <span className="text-base font-medium tracking-tight text-[#F7EFE2] font-editorial">
              Marketify
            </span>
          </Link>
          <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-[#211815] text-[#F43F5E] border border-[#3A2930]">
            Studio
          </span>
        </div>

        {/* Sidebar Search Input (as shown in reference) */}
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

        {/* Navigation Links with Solid Rose Active Pill */}
        <nav className="flex-1 space-y-1 pt-1">
          {SELLER_NAV.map((item) => {
            const isActive =
              item.href === "/seller"
                ? pathname === "/seller"
                : pathname.startsWith(item.href.split("?")[0]);
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
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#BBAE9F] hover:text-[#F7EFE2] hover:bg-[#211815] transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#E8D5B5]" />
            <span>Switch to Buyer Hub</span>
          </Link>
          {user && (
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#FB7185] hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#120A12]">
        {/* Top Header with Search and Profile */}
        <header className="h-16 border-b border-[#3A2930] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 bg-[#120A12]/95 backdrop-blur-sm sticky top-0 z-30">
          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BBAE9F] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-full bg-[#211815] border border-[#3A2930] text-[#F7EFE2] placeholder-[#BBAE9F]/50 focus:outline-none focus:border-[#E8D5B5] transition-all font-light"
            />
          </form>

          {/* Header Right Actions matching reference: Bell + Sujal ▾ */}
          <div className="flex items-center gap-3">
            <Link
              href="/notifications"
              className="w-8 h-8 rounded-full bg-[#211815] border border-[#3A2930] hover:border-[#E8D5B5]/50 flex items-center justify-center text-[#BBAE9F] hover:text-[#F7EFE2] transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E] absolute top-1.5 right-1.5" />
            </Link>

            {/* Profile Pill */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#211815] border border-[#3A2930] hover:border-[#E8D5B5]/50 text-xs text-[#F7EFE2] transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-[#2B201C] border border-[#3A2930] flex items-center justify-center text-[10px] font-bold text-[#E8D5B5] overflow-hidden">
                  <span>{displayName[0]?.toUpperCase()}</span>
                </div>
                <span className="font-medium text-xs text-[#F7EFE2]">{displayName}</span>
                <ChevronDown className="w-3 h-3 text-[#BBAE9F]" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#211815] border border-[#3A2930] py-2 shadow-2xl z-50 text-xs text-[#F7EFE2]">
                  <div className="px-3.5 py-2 border-b border-[#3A2930]/70">
                    <p className="font-medium truncate">{displayName}</p>
                    <p className="text-[10px] text-[#BBAE9F] truncate">Verified Creator</p>
                  </div>
                  <Link
                    href="/seller/products/new"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-3.5 py-2 text-[#F43F5E] hover:bg-[#2B201C] transition-colors"
                  >
                    + Add New Product
                  </Link>
                  <Link
                    href="/seller/products"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-3.5 py-2 text-[#BBAE9F] hover:text-[#F7EFE2] hover:bg-[#2B201C] transition-colors"
                  >
                    Manage Inventory
                  </Link>
                  <Link
                    href="/seller/earnings"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-3.5 py-2 text-[#BBAE9F] hover:text-[#F7EFE2] hover:bg-[#2B201C] transition-colors"
                  >
                    Earnings & Payouts
                  </Link>
                  <div className="pt-1 mt-1 border-t border-[#3A2930]/70">
                    {user ? (
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-3.5 py-2 text-[#FB7185] hover:bg-rose-500/10 transition-colors"
                      >
                        Sign Out
                      </button>
                    ) : (
                      <Link
                        href="/login"
                        onClick={() => setUserDropdownOpen(false)}
                        className="block px-3.5 py-2 text-[#E8D5B5] hover:bg-[#2B201C]"
                      >
                        Sign In
                      </Link>
                    )}
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
          href="/seller"
          className={`flex flex-col items-center gap-1 ${
            pathname === "/seller" ? "text-[#F43F5E]" : "text-[#BBAE9F] hover:text-[#F7EFE2]"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Home</span>
        </Link>
        <Link
          href="/seller/products"
          className={`flex flex-col items-center gap-1 ${
            pathname.startsWith("/seller/products") ? "text-[#F43F5E]" : "text-[#BBAE9F] hover:text-[#F7EFE2]"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Products</span>
        </Link>
        <Link
          href="/seller/sales"
          className={`flex flex-col items-center gap-1 ${
            pathname === "/seller/sales" ? "text-[#F43F5E]" : "text-[#BBAE9F] hover:text-[#F7EFE2]"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Orders</span>
        </Link>
        <Link
          href="/seller/profile"
          className={`flex flex-col items-center gap-1 ${
            pathname === "/seller/profile" ? "text-[#F43F5E]" : "text-[#BBAE9F] hover:text-[#F7EFE2]"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Studio</span>
        </Link>
      </div>
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
