"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  User,
  Shield,
  Store,
  Layers,
} from "lucide-react";

export function MarketplaceNavbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [session, setSession] = useState<{ token: string; role?: string } | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("admin_token") ||
        localStorage.getItem("seller_token");
      if (token) {
        setSession({ token });
      }
    } catch {
      // localStorage may not be accessible in private browsing
    }
  }, [pathname]);

  const navLinks = [
    { label: "Explore", href: "/products" },
    { label: "Categories", href: "/products#categories" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Become a Seller", href: "/seller" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#06080d]/85 backdrop-blur-md border-b border-slate-800/60 py-3 shadow-2xl shadow-black/50"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 border border-slate-800/80 group-hover:border-orange-500/40 transition-colors">
              <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.8)]" />
              <div className="absolute inset-0 rounded-lg bg-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-wider text-slate-100 uppercase font-mono">
                Aura<span className="text-orange-500">.</span>Digital
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase hidden sm:block">
                Marketplace
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/40 border border-slate-800/50 rounded-full px-4 py-1.5 backdrop-blur-sm">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`text-xs font-mono tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-200 ${
                    active
                      ? "text-orange-400 bg-orange-500/10"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs font-mono tracking-wider text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800/60 hover:border-slate-700 bg-slate-950/40 transition-all flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/products"
              className="relative inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-mono font-medium tracking-wide text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all duration-200"
            >
              <span>Explore</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200 border border-slate-800/60 bg-slate-900/40"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800/80 bg-[#06080d]/95 backdrop-blur-xl px-4 pt-4 pb-6 mt-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-mono tracking-wider text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-900/60 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="h-px bg-slate-800/60 my-2" />
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center text-xs font-mono tracking-wider text-slate-300 py-2.5 rounded-lg border border-slate-800 bg-slate-900/50"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center text-xs font-mono font-medium tracking-wider text-white py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]"
              >
                Sign Up
              </Link>
            </div>
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center text-xs font-mono tracking-wider text-slate-400 hover:text-slate-200 py-2"
            >
              Buyer Dashboard →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
export default MarketplaceNavbar;
