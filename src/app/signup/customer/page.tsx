"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Package,
  Layers,
  Sparkles,
} from "lucide-react";
import { SpatialBackground } from "@/components/ui/SpatialBackground";
import { MarketplaceNavbar } from "@/components/ui/MarketplaceNavbar";
import { MarketplaceFooter } from "@/components/ui/MarketplaceFooter";

export default function CustomerSignupPage() {
  const router = useRouter();

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double submission

    setError(null);
    setFieldErrors({});

    // Client-side validations
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please ensure both passwords match.");
      setFieldErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setFieldErrors({ password: "Minimum 8 characters required" });
      return;
    }

    setLoading(true);

    try {
      // Connects to EXISTING authoritative POST /api/v1/auth/signup
      // Note: Never sending role from client - server assigns BUYER role
      const res = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.error?.code === "DUPLICATE_EMAIL" || res.status === 409) {
          setError("An account with this email address already exists. Please log in.");
          setFieldErrors({ email: "Email is already registered" });
        } else if (Array.isArray(data.error?.details)) {
          const mapped: Record<string, string> = {};
          data.error.details.forEach((d: { field?: string; message: string }) => {
            if (d.field) mapped[d.field] = d.message;
          });
          setFieldErrors(mapped);
          setError(data.error?.message || "Please fix the validation errors below.");
        } else {
          setError(
            data.error?.message ||
            data.error ||
            "Unable to create account. Please verify your details."
          );
        }
        setLoading(false);
        return;
      }

      // Success state
      setIsSuccess(true);
      const token = data.data?.token;

      if (token) {
        // Authenticated session established
        localStorage.setItem("token", token);
        localStorage.setItem("buyer_token", token);
        document.cookie = `auth_token=${token}; path=/; max-age=604800; SameSite=Lax`;
        setTimeout(() => {
          router.push("/dashboard");
        }, 1200);
      } else {
        // Follow existing architecture: Signup -> Login
        setTimeout(() => {
          router.push("/login?registered=true");
        }, 1200);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setError(msg || "A connection error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <SpatialBackground>
      <MarketplaceNavbar />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="w-full max-w-5xl mx-auto rounded-2xl border border-[#E6DBD1] bg-[#FFFFFF] shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* ============================================================ */}
          {/* LEFT: Editorial Contextual Visual & Product Collage (5 Cols) */}
          {/* ============================================================ */}
          <div className="lg:col-span-5 bg-[#F3E9DD] p-8 sm:p-12 border-b lg:border-b-0 lg:border-r border-[#E6DBD1] flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D8BFA5] bg-[#FAF8F4] mb-6">
                <Sparkles className="w-3.5 h-3.5 text-[#B42318]" />
                <span className="text-[11px] font-mono tracking-widest text-[#3B2418] uppercase font-semibold">
                  Buyer Account
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-serif font-medium text-[#111111] leading-tight">
                Your portal to independent digital goods.
              </h2>

              <p className="text-xs text-[#6B4632] font-light mt-3 leading-relaxed">
                Join our marketplace to purchase verified boilerplates, Figma systems, e-books, and developer assets with instant delivery.
              </p>

              {/* Editorial mini collage representation */}
              <div className="mt-8 space-y-3">
                <div className="p-3.5 rounded-lg border border-[#D8BFA5] bg-[#FFFFFF]/90 shadow-2xs flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-[#3B2418] text-[#FAF8F4] flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-serif font-medium text-[#111111] block">
                      Lifetime Digital Library
                    </span>
                    <span className="text-[11px] text-[#6B4632] font-light">
                      All your purchases stored securely in one vault.
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-[#D8BFA5] bg-[#FFFFFF]/90 shadow-2xs flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-[#6B4632] text-[#FAF8F4] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-serif font-medium text-[#111111] block">
                      Verified Files & Invoices
                    </span>
                    <span className="text-[11px] text-[#6B4632] font-light">
                      Moderated assets with instant GST tax receipts.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-8 border-t border-[#D8BFA5]/80 text-[11px] font-mono text-[#6B4632]">
              <span>Looking to sell digital products instead?</span>{" "}
              <Link
                href="/signup/seller"
                className="text-[#111111] font-semibold underline underline-offset-2 hover:text-[#B42318]"
              >
                Become a Seller →
              </Link>
            </div>
          </div>

          {/* ============================================================ */}
          {/* RIGHT: Customer Signup Form (7 Cols)                        */}
          {/* ============================================================ */}
          <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
            <div className="max-w-md w-full mx-auto">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-serif font-medium text-[#111111] tracking-tight">
                  Create your account
                </h1>
                <p className="text-xs text-[#6B4632] mt-1.5 font-light">
                  Join the marketplace and start discovering digital products.
                </p>
              </div>

              {/* Success Notification */}
              {isSuccess && (
                <div className="mb-6 p-4 rounded-lg border border-[#137333]/30 bg-[#E6F4EA] text-[#137333] text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Account created successfully! Redirecting you to your account...</span>
                </div>
              )}

              {/* Error Notification */}
              {error && (
                <div className="mb-6 p-4 rounded-lg border border-[#B42318]/30 bg-[#FEF3F2] text-[#B42318] text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#3B2418] font-semibold mb-1.5">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-[#A98165] pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Sujal Mirgule"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-md border text-xs text-[#111111] placeholder-[#A98165] focus:outline-none focus:ring-1 transition-all ${
                        fieldErrors.fullName
                          ? "border-[#B42318] focus:border-[#B42318] focus:ring-[#B42318]/20 bg-[#FEF3F2]/30"
                          : "border-[#E6DBD1] bg-[#FAF8F4] focus:border-[#3B2418] focus:ring-[#3B2418]/20"
                      }`}
                    />
                  </div>
                  {fieldErrors.fullName && (
                    <span className="text-[11px] text-[#B42318] font-mono mt-1 block">
                      {fieldErrors.fullName}
                    </span>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#3B2418] font-semibold mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-[#A98165] pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-md border text-xs text-[#111111] placeholder-[#A98165] focus:outline-none focus:ring-1 transition-all ${
                        fieldErrors.email
                          ? "border-[#B42318] focus:border-[#B42318] focus:ring-[#B42318]/20 bg-[#FEF3F2]/30"
                          : "border-[#E6DBD1] bg-[#FAF8F4] focus:border-[#3B2418] focus:ring-[#3B2418]/20"
                      }`}
                    />
                  </div>
                  {fieldErrors.email && (
                    <span className="text-[11px] text-[#B42318] font-mono mt-1 block">
                      {fieldErrors.email}
                    </span>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#3B2418] font-semibold mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-[#A98165] pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className={`w-full pl-9 pr-10 py-2.5 rounded-md border text-xs text-[#111111] placeholder-[#A98165] focus:outline-none focus:ring-1 transition-all ${
                        fieldErrors.password
                          ? "border-[#B42318] focus:border-[#B42318] focus:ring-[#B42318]/20 bg-[#FEF3F2]/30"
                          : "border-[#E6DBD1] bg-[#FAF8F4] focus:border-[#3B2418] focus:ring-[#3B2418]/20"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-[#6B4632] hover:text-[#111111]"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-[#A98165] font-mono mt-1 block">
                    At least 8 characters with upper, lower, number, and symbol.
                  </span>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#3B2418] font-semibold mb-1.5">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-[#A98165] pointer-events-none" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className={`w-full pl-9 pr-10 py-2.5 rounded-md border text-xs text-[#111111] placeholder-[#A98165] focus:outline-none focus:ring-1 transition-all ${
                        fieldErrors.confirmPassword
                          ? "border-[#B42318] focus:border-[#B42318] focus:ring-[#B42318]/20 bg-[#FEF3F2]/30"
                          : "border-[#E6DBD1] bg-[#FAF8F4] focus:border-[#3B2418] focus:ring-[#3B2418]/20"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-[#6B4632] hover:text-[#111111]"
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <span className="text-[11px] text-[#B42318] font-mono mt-1 block">
                      {fieldErrors.confirmPassword}
                    </span>
                  )}
                </div>

                {/* Primary CTA */}
                <button
                  type="submit"
                  disabled={loading || isSuccess}
                  className="w-full mt-4 inline-flex items-center justify-center gap-2 py-3 px-6 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#FFFFFF] bg-[#111111] hover:bg-[#3B2418] active:bg-[#000000] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {loading ? (
                    <span>Creating Customer Account...</span>
                  ) : (
                    <>
                      <span>Create Customer Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Secondary links */}
              <div className="mt-8 pt-6 border-t border-[#E6DBD1] text-center space-y-2">
                <p className="text-xs text-[#6B4632] font-light">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="text-[#111111] hover:text-[#B42318] font-medium underline underline-offset-2 transition-colors"
                  >
                    Log in here →
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <MarketplaceFooter />
    </SpatialBackground>
  );
}
