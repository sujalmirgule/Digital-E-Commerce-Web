"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  Search,
  ChevronDown,
  ArrowRight,
  User,
  Store,
  Shield,
  LogOut,
  Sparkles,
} from "lucide-react";
import { MarketplaceBrandLogo } from "@/components/ui/MarketplaceBrandLogo";
import { MARKETPLACE_CATEGORIES } from "@/lib/categories";

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
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const categoriesMenuRef = useRef<HTMLDivElement>(null);

  // Handle scroll shadow & border
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown on outside click or ESC key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoriesMenuRef.current &&
        !categoriesMenuRef.current.contains(event.target as Node)
      ) {
        setCategoriesOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCategoriesOpen(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setCategoriesOpen(false);
  }, [pathname]);

  // Auth session check
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
      router.push(`/discover?query=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/discover");
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
      return "Application Status";
    }
    return "My Library";
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isScrolled
          ? "bg-[#FAF8F4]/95 backdrop-blur-md border-b border-[#E6DBD1] py-3 shadow-sm"
          : "bg-[#FAF8F4] border-b border-[#E6DBD1]/80 py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          {/* LEFT: Brand Logo */}
          <MarketplaceBrandLogo size="md" />

          {/* CENTER: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            <Link
              href="/discover"
              className={`text-xs uppercase font-mono tracking-wider px-3 py-1.5 rounded-md transition-colors ${
                pathname === "/discover" || pathname === "/products"
                  ? "bg-[#F3E9DD] text-[#3B2418] font-bold"
                  : "text-[#3B2418] hover:bg-[#F3E9DD]/60 hover:text-[#111111]"
              }`}
            >
              Discover
            </Link>

            {/* Categories Mega Dropdown Trigger */}
            <div className="relative" ref={categoriesMenuRef}>
              <button
                type="button"
                onClick={() => setCategoriesOpen(!categoriesOpen)}
                className={`text-xs uppercase font-mono tracking-wider px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors ${
                  categoriesOpen || pathname.startsWith("/categories")
                    ? "bg-[#F3E9DD] text-[#3B2418] font-bold"
                    : "text-[#3B2418] hover:bg-[#F3E9DD]/60 hover:text-[#111111]"
                }`}
                aria-expanded={categoriesOpen}
              >
                <span>Categories</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    categoriesOpen ? "rotate-180 text-[#B42318]" : "text-[#6B4632]"
                  }`}
                />
              </button>

              {/* Fast Accessible Mega Menu */}
              {categoriesOpen && (
                <div className="absolute top-full left-0 mt-2 w-[680px] rounded-xl border border-[#E6DBD1] bg-[#FFFFFF] p-6 shadow-xl shadow-black/5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E6DBD1]">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-[#6B4632] font-semibold">
                      Explore Categories
                    </span>
                    <Link
                      href="/categories"
                      onClick={() => setCategoriesOpen(false)}
                      className="text-xs font-mono uppercase tracking-wider text-[#B42318] hover:underline font-medium"
                    >
                      View All Categories →
                    </Link>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    {MARKETPLACE_CATEGORIES.slice(0, 6).map((cat) => (
                      <div key={cat.id} className="space-y-2">
                        <Link
                          href={`/discover?category=${cat.slug}`}
                          onClick={() => setCategoriesOpen(false)}
                          className="font-serif font-medium text-sm text-[#111111] hover:text-[#B42318] flex items-center gap-1.5 transition-colors"
                        >
                          <span>{cat.name}</span>
                        </Link>
                        <ul className="space-y-1">
                          {cat.subCategories.slice(0, 4).map((sub) => (
                            <li key={sub.slug}>
                              <Link
                                href={`/discover?category=${cat.slug}&sub=${sub.slug}`}
                                onClick={() => setCategoriesOpen(false)}
                                className="text-xs text-[#6B4632] hover:text-[#111111] transition-colors block"
                              >
                                {sub.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#E6DBD1] flex items-center justify-between text-xs text-[#6B4632]">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#B42318]" />
                      Thousands of independent digital assets and verified resources.
                    </span>
                    <Link
                      href="/signup/seller"
                      onClick={() => setCategoriesOpen(false)}
                      className="text-[#111111] hover:text-[#B42318] font-mono uppercase text-[11px] font-semibold"
                    >
                      List in these categories →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link
              href="/#customer-benefits"
              className="text-xs uppercase font-mono tracking-wider px-3 py-1.5 rounded-md text-[#3B2418] hover:bg-[#F3E9DD]/60 hover:text-[#111111] transition-colors"
            >
              For Buyers
            </Link>

            <Link
              href="/#seller-benefits"
              className="text-xs uppercase font-mono tracking-wider px-3 py-1.5 rounded-md text-[#3B2418] hover:bg-[#F3E9DD]/60 hover:text-[#111111] transition-colors"
            >
              For Sellers
            </Link>
          </nav>

          {/* Search Bar (Fast & Compact) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex items-center flex-1 max-w-xs relative ml-auto mr-2"
          >
            <Search className="w-3.5 h-3.5 absolute left-3 text-[#6B4632] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates, kits, assets..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#E6DBD1] text-[#111111] placeholder-[#A98165] focus:outline-none focus:border-[#3B2418] focus:ring-1 focus:ring-[#3B2418]/20 transition-all"
            />
          </form>

          {/* RIGHT: Auth & Seller CTAs */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href={getDashboardLink()}
                  className="text-xs font-mono uppercase tracking-wider text-[#3B2418] hover:text-[#111111] px-3 py-2 rounded-lg border border-[#E6DBD1] bg-[#FFFFFF] hover:border-[#3B2418] transition-all flex items-center gap-1.5"
                >
                  {user.role === "ADMIN" ? (
                    <Shield className="w-3.5 h-3.5 text-[#B42318]" />
                  ) : user.hasSellerProfile ? (
                    <Store className="w-3.5 h-3.5 text-[#6B4632]" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-[#6B4632]" />
                  )}
                  <span>{getDashboardLabel()}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-[#6B4632] hover:text-[#B42318] hover:bg-[#F3E9DD] transition-colors"
                  title="Log out"
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-xs font-mono uppercase tracking-wider text-[#3B2418] hover:text-[#111111] px-3 py-2 rounded-md transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="text-xs font-mono uppercase tracking-wider text-[#111111] hover:text-[#3B2418] px-3.5 py-2 rounded-md border border-[#E6DBD1] bg-[#FFFFFF] hover:border-[#6B4632] transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Dedicated Strong Seller CTA */}
            <Link
              href="/signup/seller"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#FFFFFF] bg-[#111111] hover:bg-[#3B2418] active:bg-[#000000] transition-colors shadow-sm"
            >
              <span>Start Selling</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-md text-[#3B2418] hover:text-[#111111] border border-[#E6DBD1] bg-[#FFFFFF]"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-[#E6DBD1] bg-[#FAF8F4] px-4 pt-4 pb-6 mt-3 shadow-lg animate-in fade-in slide-in-from-top-3 duration-150">
          <form onSubmit={handleSearchSubmit} className="mb-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6B4632]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full text-sm pl-9 pr-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#E6DBD1] text-[#111111] placeholder-[#A98165] focus:outline-none focus:border-[#3B2418]"
            />
          </form>

          <div className="flex flex-col gap-1.5">
            <Link
              href="/discover"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-[#111111] py-2 px-3 rounded-md hover:bg-[#F3E9DD]"
            >
              Discover Products
            </Link>
            <Link
              href="/categories"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-[#111111] py-2 px-3 rounded-md hover:bg-[#F3E9DD]"
            >
              Browse Categories
            </Link>
            <Link
              href="/#customer-benefits"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-[#111111] py-2 px-3 rounded-md hover:bg-[#F3E9DD]"
            >
              For Buyers
            </Link>
            <Link
              href="/#seller-benefits"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-[#111111] py-2 px-3 rounded-md hover:bg-[#F3E9DD]"
            >
              For Sellers
            </Link>

            <div className="h-px bg-[#E6DBD1] my-3" />

            {user ? (
              <div className="flex flex-col gap-2">
                <Link
                  href={getDashboardLink()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center text-xs font-mono uppercase tracking-wider text-[#FAF8F4] bg-[#3B2418] py-2.5 rounded-md"
                >
                  {getDashboardLabel()} →
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="text-center text-xs font-mono uppercase text-[#B42318] py-2 rounded-md hover:bg-[#F3E9DD]"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center text-xs font-mono uppercase tracking-wider text-[#3B2418] py-2.5 rounded-md border border-[#E6DBD1] bg-[#FFFFFF]"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center text-xs font-mono uppercase tracking-wider text-[#111111] py-2.5 rounded-md border border-[#3B2418] bg-[#F3E9DD]"
                >
                  Sign Up
                </Link>
              </div>
            )}

            <Link
              href="/signup/seller"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center text-xs font-mono uppercase tracking-wider font-semibold text-[#FFFFFF] py-3 mt-2 rounded-md bg-[#111111] hover:bg-[#3B2418]"
            >
              Start Selling
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export default MarketplaceNavbar;
