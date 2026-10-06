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
      router.push(`/discover?q=${encodeURIComponent(searchQuery.trim())}`);
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
          ? "bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#C8AA91]/60 py-3 shadow-[0_2px_12px_rgba(59,38,28,0.06)]"
          : "bg-[#FAF7F2] border-b border-[#C8AA91]/40 py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          {/* LEFT: Brand Logo */}
          <MarketplaceBrandLogo size="md" />

          {/* CENTER: Strong Typography Navigation */}
          <nav className="hidden lg:flex items-center gap-2 xl:gap-3">
            <Link
              href="/discover"
              className={`text-[15px] font-bold px-3.5 py-1.5 rounded-lg transition-colors ${
                pathname === "/discover" || pathname === "/products"
                  ? "bg-[#F2E7DB] text-[#3B261C]"
                  : "text-[#3B261C] hover:bg-[#F2E7DB]/60 hover:text-[#151311]"
              }`}
            >
              Discover
            </Link>

            {/* Categories Mega Dropdown Trigger */}
            <div className="relative" ref={categoriesMenuRef}>
              <button
                type="button"
                onClick={() => setCategoriesOpen(!categoriesOpen)}
                className={`text-[15px] font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                  categoriesOpen || pathname.startsWith("/categories")
                    ? "bg-[#F2E7DB] text-[#3B261C]"
                    : "text-[#3B261C] hover:bg-[#F2E7DB]/60 hover:text-[#151311]"
                }`}
                aria-expanded={categoriesOpen}
              >
                <span>Categories</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    categoriesOpen ? "rotate-180 text-[#C46A4A]" : "text-[#8A6048]"
                  }`}
                />
              </button>

              {/* Accessible Mega Menu */}
              {categoriesOpen && (
                <div className="absolute top-full left-0 mt-3 w-[720px] rounded-2xl border border-[#C8AA91]/70 bg-[#FFFFFF] p-6 shadow-2xl shadow-[#3B261C]/15 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#E6DBD1]">
                    <span className="text-[12px] uppercase font-bold tracking-wider text-[#8A6048]">
                      Marketplace Categories
                    </span>
                    <Link
                      href="/discover"
                      onClick={() => setCategoriesOpen(false)}
                      className="text-xs font-bold text-[#A94432] hover:underline"
                    >
                      View All in Catalog →
                    </Link>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    {MARKETPLACE_CATEGORIES.slice(0, 9).map((cat) => (
                      <div key={cat.id} className="space-y-1.5">
                        <Link
                          href={`/discover?category=${cat.slug}`}
                          onClick={() => setCategoriesOpen(false)}
                          className="font-bold text-sm text-[#151311] hover:text-[#A94432] flex items-center gap-1.5 transition-colors"
                        >
                          <span>{cat.name}</span>
                        </Link>
                        <p className="text-[12px] text-[#8A6048] line-clamp-1 font-normal">
                          {cat.description}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-[#E6DBD1] flex items-center justify-between text-xs text-[#8A6048]">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-[#C46A4A]" />
                      Thousands of verified digital products by independent creators.
                    </span>
                    <Link
                      href="/signup/seller"
                      onClick={() => setCategoriesOpen(false)}
                      className="text-[#3B261C] hover:text-[#A94432] uppercase text-[11px] font-bold"
                    >
                      List in these categories →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link
              href="/#features"
              className="text-[15px] font-bold px-3.5 py-1.5 rounded-lg text-[#3B261C] hover:bg-[#F2E7DB]/60 hover:text-[#151311] transition-colors"
            >
              Why Folio
            </Link>

            <Link
              href="/#seller-spotlight"
              className="text-[15px] font-bold px-3.5 py-1.5 rounded-lg text-[#3B261C] hover:bg-[#F2E7DB]/60 hover:text-[#151311] transition-colors"
            >
              Creators
            </Link>
          </nav>

          {/* Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex items-center flex-1 max-w-xs relative ml-auto mr-2"
          >
            <Search className="w-4 h-4 absolute left-3.5 text-[#8A6048] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search digital products..."
              className="w-full text-[13px] pl-9 pr-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#C8AA91]/70 text-[#151311] placeholder-[#8A6048]/70 focus:outline-none focus:border-[#3B261C] focus:ring-1 focus:ring-[#3B261C]/30 transition-all font-medium"
            />
          </form>

          {/* RIGHT: Auth & Seller CTAs */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href={getDashboardLink()}
                  className="text-xs font-bold uppercase tracking-wider text-[#3B261C] hover:text-[#151311] px-3.5 py-2 rounded-xl border border-[#C8AA91]/70 bg-[#FFFFFF] hover:border-[#3B261C] transition-all flex items-center gap-1.5 shadow-xs"
                >
                  {user.role === "ADMIN" ? (
                    <Shield className="w-3.5 h-3.5 text-[#A94432]" />
                  ) : user.hasSellerProfile ? (
                    <Store className="w-3.5 h-3.5 text-[#8A6048]" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-[#8A6048]" />
                  )}
                  <span>{getDashboardLabel()}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-[#8A6048] hover:text-[#A94432] hover:bg-[#F2E7DB] transition-colors"
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
                  className="text-[14px] font-bold text-[#3B261C] hover:text-[#151311] px-3.5 py-2 rounded-lg transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="text-[14px] font-bold text-[#151311] hover:text-[#3B261C] px-4 py-2 rounded-xl border border-[#C8AA91]/70 bg-[#FFFFFF] hover:border-[#3B261C] transition-colors shadow-xs"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Dedicated Start Selling CTA */}
            <Link
              href="/signup/seller"
              className="inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-xl text-[14px] font-extrabold text-[#FFFFFF] bg-[#3B261C] hover:bg-[#684332] active:bg-[#211D1A] transition-all shadow-md shadow-[#3B261C]/20"
            >
              <span>Start Selling</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-[#3B261C] hover:text-[#151311] border border-[#C8AA91]/70 bg-[#FFFFFF]"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[73px] bg-[#FAF7F2] border-b border-[#C8AA91] p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto z-50">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#8A6048]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search digital products..."
              className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#C8AA91] text-[#151311] font-medium"
            />
          </form>

          <nav className="flex flex-col space-y-2 pt-2">
            <Link
              href="/discover"
              className="text-base font-bold text-[#3B261C] py-2 px-3 rounded-lg hover:bg-[#F2E7DB]"
            >
              Discover Products
            </Link>
            <div className="py-2 px-3">
              <span className="text-xs uppercase font-bold text-[#8A6048] tracking-wider block mb-2">
                Popular Categories
              </span>
              <div className="grid grid-cols-2 gap-2">
                {MARKETPLACE_CATEGORIES.slice(0, 8).map((c) => (
                  <Link
                    key={c.id}
                    href={`/discover?category=${c.slug}`}
                    className="text-sm font-semibold text-[#151311] hover:text-[#A94432] py-1"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
            <Link
              href="/signup/seller"
              className="text-base font-bold text-[#A94432] py-2 px-3 rounded-lg hover:bg-[#F2E7DB]"
            >
              Start Selling Digital Products
            </Link>
          </nav>

          <div className="pt-4 border-t border-[#E6DBD1] flex flex-col gap-2.5">
            {user ? (
              <>
                <Link
                  href={getDashboardLink()}
                  className="w-full py-2.5 text-center rounded-xl bg-[#3B261C] text-[#FFFFFF] font-bold text-sm"
                >
                  {getDashboardLabel()}
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full py-2 text-center text-xs font-bold text-[#A94432]"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="w-full py-2.5 text-center rounded-xl border border-[#C8AA91] bg-[#FFFFFF] text-[#3B261C] font-bold text-sm"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="w-full py-2.5 text-center rounded-xl bg-[#3B261C] text-[#FFFFFF] font-bold text-sm"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default MarketplaceNavbar;
