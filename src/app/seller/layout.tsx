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
  Plus,
  Store,
  User,
} from "lucide-react";
import { SellerAuthProvider, useSellerAuth } from "./SellerAuthContext";
import { MarketplaceBrandLogo } from "@/components/ui/MarketplaceBrandLogo";

const SELLER_NAV = [
  { href: "/seller", label: "Overview", icon: Layers },
  { href: "/seller/products", label: "Products", icon: Package },
  { href: "/seller/sales", label: "Sales", icon: TrendingUp },
  { href: "/seller/earnings", label: "Earnings", icon: Receipt },
  { href: "/seller/orders", label: "Orders", icon: ShoppingBag },
  { href: "/seller/reviews", label: "Reviews", icon: Star },
  { href: "/seller/profile", label: "Profile", icon: User },
  { href: "/seller/settings", label: "Settings", icon: Settings },
];

function SellerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isApproved, token, loading, logout } = useSellerAuth();
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
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center text-sm font-bold text-[#8A6048]">
        Authenticating creator workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#151311] flex flex-col md:flex-row relative">
      {/* ============================================================== */}
      {/* DESKTOP SIDEBAR (Deep Brown / Cream / Off-White)                */}
      {/* ============================================================== */}
      <aside className="hidden md:flex flex-col w-64 bg-[#FFFFFF] border-r border-[#C8AA91]/50 p-5 shrink-0 min-h-screen">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-5 border-b border-[#E6DBD1]">
          <MarketplaceBrandLogo size="sm" />
          <span className="text-[10px] font-sans font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#F2E7DB] text-[#3B261C]">
            CREATOR
          </span>
        </div>

        {/* Sidebar Search Input */}
        <form onSubmit={handleSearch} className="relative my-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A6048] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#C8AA91]/50 text-[#151311] placeholder-[#8A6048]/70 focus:outline-none focus:border-[#3B261C] transition-all font-medium"
          />
        </form>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 pt-1">
          {SELLER_NAV.map((item) => {
            const isActive =
              item.href === "/seller"
                ? pathname === "/seller"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold tracking-wide transition-all duration-200 ${
                  isActive
                    ? "bg-[#3B261C] text-[#FAF7F2] shadow-sm"
                    : "text-[#684332] hover:bg-[#F2E7DB] hover:text-[#151311]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#C46A4A]" : "text-[#8A6048]"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#E6DBD1] space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#684332] hover:text-[#151311] hover:bg-[#F2E7DB] transition-colors"
          >
            <ShoppingBag className="w-4 h-4 text-[#8A6048]" />
            <span>Switch to Buyer Hub</span>
          </Link>
          {user && (
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#A94432] hover:bg-[#A94432]/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* ============================================================== */}
      {/* MAIN CONTENT AREA                                              */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#FAF7F2]">
        {/* Top Header */}
        <header className="h-16 border-b border-[#C8AA91]/50 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 bg-[#FFFFFF] sticky top-0 z-30 shadow-xs">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-[#3B261C] border border-[#C8AA91]/60"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Search bar on tablet/desktop */}
          <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-sm relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A6048] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your inventory..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#C8AA91]/60 text-[#151311] placeholder-[#8A6048]/70 focus:outline-none focus:border-[#3B261C] transition-all font-medium"
            />
          </form>

          {/* Header Right Actions: + New Product, Bell, Profile */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Visual Prominent Action: + New Product */}
            <Link
              href="/seller/products/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider text-[#FAF7F2] bg-[#3B261C] hover:bg-[#684332] active:bg-[#211D1A] transition-all shadow-sm"
            >
              <Plus className="w-4 h-4 text-[#C46A4A]" />
              <span>New Product</span>
            </Link>

            {/* Notifications */}
            <Link
              href="/notifications"
              className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-[#C8AA91]/60 hover:border-[#3B261C] flex items-center justify-center text-[#684332] hover:text-[#151311] transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-[#A94432] absolute top-2 right-2" />
            </Link>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#C8AA91]/60 hover:border-[#3B261C] text-xs text-[#151311] font-bold transition-all"
              >
                <div className="w-6 h-6 rounded-lg bg-[#3B261C] text-[#FAF7F2] flex items-center justify-center text-[11px] font-bold">
                  {displayName[0]?.toUpperCase()}
                </div>
                <span className="truncate max-w-[120px]">{displayName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#8A6048]" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-[#FFFFFF] border border-[#C8AA91] py-2 shadow-2xl z-50 text-xs">
                  <div className="px-3.5 py-2 border-b border-[#E6DBD1]">
                    <p className="font-bold text-[#151311] truncate">{displayName}</p>
                    <p className="text-[11px] text-[#8A6048] font-medium">Verified Creator Store</p>
                  </div>
                  <Link
                    href="/seller/products/new"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-3.5 py-2 font-bold text-[#A94432] hover:bg-[#F2E7DB] transition-colors"
                  >
                    + New Product
                  </Link>
                  <Link
                    href="/seller/products"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-3.5 py-2 text-[#3B261C] hover:bg-[#F2E7DB] transition-colors"
                  >
                    Product Inventory
                  </Link>
                  <Link
                    href="/seller/earnings"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-3.5 py-2 text-[#3B261C] hover:bg-[#F2E7DB] transition-colors"
                  >
                    Earnings & Payouts
                  </Link>
                  <div className="pt-1 mt-1 border-t border-[#E6DBD1]">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3.5 py-2 font-bold text-[#A94432] hover:bg-[#A94432]/10 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#FFFFFF] border-b border-[#C8AA91] p-4 space-y-2 z-40">
            {SELLER_NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-[#3B261C] hover:bg-[#F2E7DB]"
              >
                <item.icon className="w-4 h-4 text-[#8A6048]" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Page Children Container */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex-1">
          {children}
        </div>
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
