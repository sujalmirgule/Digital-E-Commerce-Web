"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { SpatialBackground } from "@/components/ui/SpatialBackground";
import { MarketplaceNavbar } from "@/components/ui/MarketplaceNavbar";
import { MarketplaceFooter } from "@/components/ui/MarketplaceFooter";

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
        setError(data.error?.message || data.error || "Authentication failed. Please check credentials.");
        setLoading(false);
        return;
      }

      const token = data.data?.token;
      const user = data.data?.user;

      if (token) {
        localStorage.setItem("token", token);
        document.cookie = `auth_token=${token}; path=/; max-age=604800; SameSite=Lax`;

        // Role-based routing matrix
        if (user?.role === "ADMIN") {
          localStorage.setItem("admin_token", token);
          router.push("/admin");
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
    } catch (err: any) {
      setError(err.message || "An unexpected network error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Card Container */}
      <div className="relative rounded-3xl border border-[#3A2930] bg-[#211815] p-8 shadow-2xl shadow-black/80 overflow-hidden">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-[11px] font-mono tracking-[0.25em] text-[#E8D5B5] uppercase font-medium block mb-2">
            Marketplace Account
          </span>
          <h1 className="text-3xl font-light text-[#F7EFE2] font-editorial tracking-tight">
            Welcome Back
          </h1>
          <p className="text-xs text-[#BBAE9F] mt-2 font-light">
            Sign in to access your digital library, orders, or creator workspace.
          </p>
        </div>

        {/* Registration Success Banner */}
        {registered && (
          <div className="mb-6 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span className="leading-snug">
              Account created successfully! Please sign in with your credentials.
            </span>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-mono text-[#E8D5B5] uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#BBAE9F]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#3A2930] bg-[#1B101B] text-sm text-[#F7EFE2] placeholder-[#BBAE9F]/40 focus:outline-none focus:border-[#E8D5B5] focus:ring-1 focus:ring-[#E8D5B5]/20 transition-all font-light"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-mono text-[#E8D5B5] uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#BBAE9F]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#3A2930] bg-[#1B101B] text-sm text-[#F7EFE2] placeholder-[#BBAE9F]/40 focus:outline-none focus:border-[#E8D5B5] focus:ring-1 focus:ring-[#E8D5B5]/20 transition-all font-light"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#BBAE9F] hover:text-[#F7EFE2] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-full text-xs font-medium text-white bg-[#F43F5E] hover:bg-[#FB7185] active:bg-[#9F1239] shadow-lg shadow-[#F43F5E]/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 pt-6 border-t border-[#3A2930] text-center space-y-2.5">
          <p className="text-xs text-[#BBAE9F] font-light">
            New customer?{" "}
            <Link
              href="/signup"
              className="text-[#E8D5B5] hover:text-[#F43F5E] font-medium transition-colors"
            >
              Sign up as Customer →
            </Link>
          </p>
          <p className="text-xs text-[#BBAE9F] font-light">
            Creator or publisher?{" "}
            <Link
              href="/seller/signup"
              className="text-[#F43F5E] hover:underline font-medium transition-colors"
            >
              Apply to Become a Seller →
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
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-28 relative">
        <Suspense fallback={<div className="text-xs text-[#BBAE9F]">Loading login form...</div>}>
          <LoginForm />
        </Suspense>
      </main>
      <MarketplaceFooter />
    </SpatialBackground>
  );
}

