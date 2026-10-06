"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  Search,
  ArrowRight,
  User,
  ShoppingBag,
  Sparkles,
  Store,
  LogOut,
  Shield,
} from "lucide-react";

interface CurrentUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  hasSellerProfile: boolean;
  sellerStatus: string | null;
}

export function MarketplaceNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        const token =
          localStorage.getItem("token") ||
          localStorage.getItem("buyer_token") ||
          localStorage.getItem("seller_token") ||
          localStorage.getItem("admin_token");

        if (!token) {
          setUser(null);
          setLoadingUser(false);
          return;
        }

        const res = await fetch("/api/v1/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.data?.user || data.data);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    }
    checkAuth();
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("buyer_token");
    localStorage.removeItem("seller_token");
    localStorage.removeItem("admin_token");
    document.cookie = "auth_token=; path=/; max-age=0;";
    setUser(null);
    router.push("/login");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/products");
    }
  };

  const getDashboardLink = () => {
    if (!user) return "/dashboard";
    if (user.role === "ADMIN") return "/admin";
    if (user.hasSellerProfile) {
      if (user.sellerStatus === "APPROVED") return "/seller";
      return "/seller/application-status";
    }
    return "/dashboard";
  };

  const getDashboardLabel = () => {
    if (!user) return "Dashboard";
    if (user.role === "ADMIN") return "Admin Control";
    if (user.hasSellerProfile) {
      if (user.sellerStatus === "APPROVED") return "Seller Studio";
      return "Seller Status";
    }
    return "Buyer Hub";
  };

  const navLinks = [
    { label: "Marketplace", href: "/products" },
    { label: "Categories", href: "/products#categories" },
    { label: "Become a Seller", href: "/seller/signup" },
    { label: "How it works", href: "/#how-it-works" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#120A12]/92 backdrop-blur-md border-b border-[#3A2930] py-3 shadow-2xl shadow-black/60"
          : "bg-transparent py-4 sm:py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Logo: Marketify */}
          <Link href="/" className="group flex items-center gap-2.5 shrink-0">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-[#211815] border border-[#3A2930] group-hover:border-[#F43F5E]/60 transition-colors shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E] shadow-[0_0_10px_rgba(244,63,94,0.7)]" />
              <div className="absolute inset-0 rounded-lg bg-[#F43F5E]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-base font-medium tracking-tight text-[#F7EFE2] font-editorial">
              Marketify
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`text-xs tracking-wide px-3.5 py-1.5 rounded-full transition-all duration-200 ${
                    active
                      ? "text-[#F43F5E] bg-[#F43F5E]/10 font-medium"
                      : "text-[#BBAE9F] hover:text-[#F7EFE2] hover:bg-[#211815]/80"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex items-center flex-1 max-w-xs relative"
          >
            <Search className="w-3.5 h-3.5 absolute left-3 text-[#BBAE9F] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, creators..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-full bg-[#211815]/90 border border-[#3A2930] text-[#F7EFE2] placeholder-[#BBAE9F]/60 focus:outline-none focus:border-[#E8D5B5] focus:ring-1 focus:ring-[#E8D5B5]/20 transition-all"
            />
          </form>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href={getDashboardLink()}
                  className="text-xs tracking-wide text-[#E8D5B5] hover:text-[#F7EFE2] px-3.5 py-1.5 rounded-full border border-[#3A2930] hover:border-[#E8D5B5]/50 bg-[#211815]/60 transition-all flex items-center gap-1.5"
                >
                  {user.role === "ADMIN" ? (
                    <Shield className="w-3.5 h-3.5 text-[#F43F5E]" />
                  ) : user.hasSellerProfile ? (
                    <Store className="w-3.5 h-3.5 text-[#F43F5E]" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-[#F43F5E]" />
                  )}
                  <span>{getDashboardLabel()}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-xs tracking-wide text-[#BBAE9F] hover:text-rose-400 px-2.5 py-1.5 rounded-full border border-[#3A2930] hover:border-rose-500/30 bg-[#211815]/60 transition-all flex items-center gap-1"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-xs tracking-wide text-[#BBAE9F] hover:text-[#F7EFE2] px-3.5 py-1.5 rounded-full transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="text-xs tracking-wide text-[#E8D5B5] hover:text-[#F7EFE2] px-3.5 py-1.5 rounded-full border border-[#3A2930] hover:border-[#E8D5B5]/40 bg-[#211815]/80 transition-colors"
                >
                  Customer Sign Up
                </Link>
              </div>
            )}

            <Link
              href="/seller/signup"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium text-white bg-[#F43F5E] hover:bg-[#FB7185] active:bg-[#9F1239] shadow-[0_0_18px_rgba(244,63,94,0.35)] transition-all duration-200"
            >
              <span>Start Selling</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#BBAE9F] hover:text-[#F7EFE2] border border-[#3A2930] bg-[#211815]"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#3A2930] bg-[#120A12]/98 backdrop-blur-xl px-4 pt-3 pb-5 mt-3 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200">
          <form onSubmit={handleSearchSubmit} className="mb-3 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#BBAE9F]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, creators..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-lg bg-[#211815] border border-[#3A2930] text-[#F7EFE2] placeholder-[#BBAE9F]/60 focus:outline-none focus:border-[#E8D5B5]"
            />
          </form>

          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs tracking-wide text-[#BBAE9F] hover:text-[#F7EFE2] px-3 py-2 rounded-lg hover:bg-[#211815] transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="h-px bg-[#3A2930] my-2" />
            {user ? (
              <div className="flex flex-col gap-2">
                <Link
                  href={getDashboardLink()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center text-xs tracking-wide text-[#E8D5B5] hover:text-white py-2 rounded-lg border border-[#3A2930] bg-[#211815]"
                >
                  {getDashboardLabel()} →
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="text-center text-xs tracking-wide text-rose-400 py-2 rounded-lg border border-rose-500/20 bg-rose-500/10"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center text-xs tracking-wide text-[#BBAE9F] hover:text-[#F7EFE2] py-2 rounded-lg border border-[#3A2930] bg-[#211815]"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center text-xs tracking-wide text-[#E8D5B5] hover:text-[#F7EFE2] py-2 rounded-lg border border-[#3A2930] bg-[#211815]"
                >
                  Sign Up
                </Link>
              </div>
            )}
            <Link
              href="/seller/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center text-xs font-medium text-white py-2 mt-2 rounded-lg bg-[#F43F5E] hover:bg-[#FB7185] shadow-md shadow-[#F43F5E]/20"
            >
              Become a Seller
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
export default MarketplaceNavbar;

