"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle, Sparkles } from "lucide-react";
import { SpatialBackground } from "@/components/ui/SpatialBackground";
import { MarketplaceNavbar } from "@/components/ui/MarketplaceNavbar";
import { MarketplaceFooter } from "@/components/ui/MarketplaceFooter";

export default function LoginPage() {
  const router = useRouter();
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
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error?.message || data.error || "Authentication failed. Please check credentials.");
        setLoading(false);
        return;
      }

      // Store token across portals
      const token = data.data?.token;
      const user = data.data?.user;

      if (token) {
        localStorage.setItem("token", token);
        // Also set standard cookie so server requests receive auth
        document.cookie = `auth_token=${token}; path=/; max-age=604800; SameSite=Lax`;

        if (user?.role === "ADMIN") {
          localStorage.setItem("admin_token", token);
          router.push("/admin");
        } else if (user?.role === "SELLER") {
          localStorage.setItem("seller_token", token);
          router.push("/seller");
        } else {
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
    <SpatialBackground>
      <MarketplaceNavbar />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-28 relative">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="relative rounded-2xl border border-slate-800/90 bg-slate-900/40 p-8 backdrop-blur-xl shadow-2xl overflow-hidden">
            {/* Corner Decorative Dots */}
            <div className="corner-element-animate -top-2 -left-2" style={{ animationDelay: "0.2s" }}>
              <div className="w-1.5 h-1.5 bg-orange-500/60 rounded-full" />
            </div>
            <div className="corner-element-animate -top-2 -right-2" style={{ animationDelay: "0.4s" }}>
              <div className="w-1.5 h-1.5 bg-orange-500/60 rounded-full" />
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <span className="text-[11px] font-mono tracking-[0.25em] text-orange-400 uppercase font-medium block mb-2">
                Secure Authentication
              </span>
              <h1 className="text-2xl sm:text-3xl font-light text-slate-100 tracking-tight">
                Welcome Back
              </h1>
              <p className="text-xs text-slate-400 mt-2 font-light">
                Sign in to manage purchases, digital assets, or store earnings.
              </p>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="mb-6 p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="creator@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/80 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/40 transition-all font-light"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-800 bg-slate-950/80 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/40 transition-all font-light"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-mono font-medium tracking-wider text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In to Marketplace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Links */}
            <div className="mt-8 pt-6 border-t border-slate-800/60 text-center">
              <p className="text-xs text-slate-400 font-light">
                Don&apos;t have an account yet?{" "}
                <Link
                  href="/signup"
                  className="font-mono text-orange-400 hover:text-orange-300 font-medium transition-colors"
                >
                  Create an account →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <MarketplaceFooter />
    </SpatialBackground>
  );
}
