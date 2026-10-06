"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2, ShieldCheck, Sparkles, Download, Layers } from "lucide-react";
import { SpatialBackground } from "@/components/ui/SpatialBackground";
import { MarketplaceNavbar } from "@/components/ui/MarketplaceNavbar";
import { MarketplaceFooter } from "@/components/ui/MarketplaceFooter";
import { MarketplaceBrandLogo } from "@/components/ui/MarketplaceBrandLogo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg =
          data.error?.message ||
          (typeof data.error === "string" ? data.error : null) ||
          "Authentication failed. Please verify your email and password.";
        setError(errorMsg);
        setLoading(false);
        return;
      }

      const token = data.data?.token;
      const user = data.data?.user;

      if (token) {
        localStorage.setItem("token", token);
        document.cookie = `auth_token=${token}; path=/; max-age=604800; SameSite=Lax`;

        // Strict Role-Based Redirection Matrix
        if (user?.role === "ADMIN") {
          localStorage.setItem("admin_token", token);
          window.location.href = "/admin";
        } else if (user?.hasSellerProfile) {
          localStorage.setItem("seller_token", token);
          if (user?.sellerStatus === "APPROVED") {
            router.push("/seller");
          } else {
            // PENDING or REJECTED
            router.push("/seller/application-status");
          }
        } else {
          // Standard BUYER
          localStorage.setItem("buyer_token", token);
          router.push("/dashboard");
        }
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setError(msg || "An unexpected network error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 rounded-2xl border border-[#E6DBD1] bg-[#FFFFFF] shadow-sm overflow-hidden">
      {/* ============================================================ */}
      {/* LEFT PANEL: EDITORIAL MARKETPLACE SHOWCASE                   */}
      {/* ============================================================ */}
      <div className="lg:col-span-5 bg-[#F3E9DD] p-8 sm:p-10 border-b lg:border-b-0 lg:border-r border-[#D8BFA5] flex flex-col justify-between">
        <div>
          <div className="mb-8">
            <MarketplaceBrandLogo size="md" />
          </div>

          <span className="text-[10px] font-mono tracking-widest uppercase text-[#B42318] font-bold block mb-2">
            Independent Digital Commerce
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#111111] leading-tight">
            Discover digital assets built by exceptional makers.
          </h2>
          <p className="text-xs text-[#6B4632] mt-3 font-light leading-relaxed">
            Access your purchased source files, license keys, design resources, and digital courses from one unified library.
          </p>

          {/* Mini product preview card */}
          <div className="mt-6 p-4 rounded-xl border border-[#D8BFA5] bg-[#FAF8F4] space-y-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#3B2418] text-[#FAF8F4] flex items-center justify-center font-mono text-xs font-bold">
                <Layers className="w-5 h-5 text-[#D8BFA5]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#111111] truncate">Aura Studio System</p>
                <p className="text-[10px] text-[#6B4632] truncate">Design System & React UI Kit</p>
              </div>
              <span className="text-xs font-mono font-semibold text-[#111111]">₹1,999</span>
            </div>

            <div className="pt-2 border-t border-[#E6DBD1] flex items-center justify-between text-[10px] text-[#6B4632]">
              <span className="inline-flex items-center gap-1">
                <Download className="w-3 h-3 text-[#B42318]" /> Instant access
              </span>
              <span className="font-mono text-[#3B2418]">Verified Seller</span>
            </div>
          </div>
        </div>

        {/* Bottom Trust Highlights */}
        <div className="mt-8 pt-6 border-t border-[#D8BFA5] space-y-2 text-[11px] text-[#6B4632]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#B42318] shrink-0" />
            <span>Encrypted credentials & secure JWT sessions</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#6B4632] shrink-0" />
            <span>Unified customer and creator account system</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT PANEL: AUTHENTICATION FORM                             */}
      {/* ============================================================ */}
      <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
        <div className="mb-6">
          <span className="text-[11px] font-mono tracking-widest uppercase text-[#6B4632] font-semibold block mb-1">
            ACCOUNT ACCESS
          </span>
          <h1 className="font-serif text-3xl font-medium text-[#111111]">
            Welcome back
          </h1>
          <p className="text-xs text-[#6B4632] mt-1 font-light">
            Sign in to continue to your marketplace account.
          </p>
        </div>

        {/* Registration Success Notification */}
        {registered && (
          <div className="mb-6 p-3.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Account created successfully! Please sign in with your credentials.</span>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-3.5 rounded-lg border border-[#B42318]/30 bg-[#FEF3F2] text-[#B42318] text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#B42318]" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#3B2418] font-semibold mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-[#A98165] pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-md border border-[#E6DBD1] bg-[#FAF8F4] text-xs text-[#111111] placeholder-[#A98165] focus:outline-none focus:border-[#3B2418] transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#3B2418] font-semibold">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-[#A98165] pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-9 py-2.5 rounded-md border border-[#E6DBD1] bg-[#FAF8F4] text-xs text-[#111111] placeholder-[#A98165] focus:outline-none focus:border-[#3B2418] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-[#6B4632] hover:text-[#111111] transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-6 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#FFFFFF] bg-[#111111] hover:bg-[#3B2418] active:bg-[#000000] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Log In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Clear Navigation Links */}
        <div className="mt-8 pt-6 border-t border-[#E6DBD1] space-y-3">
          <p className="text-xs text-[#6B4632] flex items-center justify-between">
            <span>Don&apos;t have an account?</span>
            <Link
              href="/signup"
              className="font-medium text-[#111111] hover:text-[#B42318] underline underline-offset-2 transition-colors"
            >
              Create account →
            </Link>
          </p>

          <p className="text-xs text-[#6B4632] flex items-center justify-between">
            <span>Want to sell digital products?</span>
            <Link
              href="/signup/seller"
              className="font-medium text-[#B42318] hover:text-[#3B2418] underline underline-offset-2 transition-colors"
            >
              Become a seller →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <SpatialBackground>
      <MarketplaceNavbar />
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <Suspense fallback={<div className="text-xs font-mono text-[#6B4632]">Loading login portal...</div>}>
          <LoginForm />
        </Suspense>
      </main>
      <MarketplaceFooter />
    </SpatialBackground>
  );
}
