"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";
import { SpatialBackground } from "@/components/ui/SpatialBackground";

export default function AdminLoginPage() {
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
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error?.message || data.error || "Authentication failed. Access denied.");
        setLoading(false);
        return;
      }

      const user = data.data?.user;
      const token = data.data?.token;

      // Strict server-validated administrative check
      if (user?.role !== "ADMIN") {
        setError("Access Denied: Your account does not possess administrative privileges.");
        setLoading(false);
        return;
      }

      if (token) {
        localStorage.setItem("admin_token", token);
        localStorage.setItem("token", token);
        document.cookie = `auth_token=${token}; path=/; max-age=604800; SameSite=Lax`;
        router.push("/admin");
      } else {
        setError("Invalid authentication token received.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected network error occurred.");
      setLoading(false);
    }
  };

  return (
    <SpatialBackground>
      <main className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 relative">
        <div className="w-full max-w-md">
          <div className="relative rounded-3xl border border-[#3A2930] bg-[#211815] p-8 sm:p-10 shadow-2xl shadow-black/90 overflow-hidden">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-[#1B101B] border border-[#3A2930] flex items-center justify-center text-[#F43F5E] mx-auto mb-4 shadow-lg shadow-[#F43F5E]/20">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <span className="text-[11px] font-mono tracking-[0.25em] text-[#E8D5B5] uppercase font-medium block mb-1">
                Restricted Access
              </span>
              <h1 className="text-2xl sm:text-3xl font-light text-[#F7EFE2] font-editorial tracking-tight">
                Platform Control Center
              </h1>
              <p className="text-xs text-[#BBAE9F] mt-2 font-light">
                Secure administrative authentication portal. Authorized personnel only.
              </p>
            </div>

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
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BBAE9F]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@marketplace.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#3A2930] bg-[#1B101B] text-sm text-[#F7EFE2] placeholder-[#BBAE9F]/40 focus:outline-none focus:border-[#E8D5B5] font-light"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#E8D5B5] uppercase tracking-wider mb-2">
                  Security Passkey
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BBAE9F]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#3A2930] bg-[#1B101B] text-sm text-[#F7EFE2] placeholder-[#BBAE9F]/40 focus:outline-none focus:border-[#E8D5B5] font-light"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#BBAE9F] hover:text-[#F7EFE2]"
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
                  <span>Verifying Credentials...</span>
                ) : (
                  <>
                    <span>Enter Platform Control</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Back link */}
            <div className="mt-8 pt-6 border-t border-[#3A2930] text-center">
              <Link href="/" className="text-xs text-[#BBAE9F] hover:text-[#E8D5B5] transition-colors">
                ← Return to Public Marketplace
              </Link>
            </div>
          </div>
        </div>
      </main>
    </SpatialBackground>
  );
}
