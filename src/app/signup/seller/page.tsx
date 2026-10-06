"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Store,
  CreditCard,
  Building,
  User,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Clock,
  ShieldCheck,
  Check,
} from "lucide-react";
import { SpatialBackground } from "@/components/ui/SpatialBackground";
import { MarketplaceNavbar } from "@/components/ui/MarketplaceNavbar";
import { MarketplaceFooter } from "@/components/ui/MarketplaceFooter";

export default function SellerSignupPage() {
  const router = useRouter();

  // Multi-step form state: 1 = Account Credentials (if guest), 2 = Store & Banking KYC
  const [step, setStep] = useState<1 | 2>(1);
  const [existingUser, setExistingUser] = useState<{ id: string; email: string; fullName: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Form Fields - User Account
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields - Store Profile & KYC
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [bio, setBio] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if session already exists
  useEffect(() => {
    async function checkCurrentSession() {
      try {
        const storedToken =
          localStorage.getItem("token") ||
          localStorage.getItem("buyer_token") ||
          localStorage.getItem("seller_token");

        if (!storedToken) {
          setCheckingAuth(false);
          return;
        }

        const res = await fetch("/api/v1/auth/me", {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        if (res.ok) {
          const json = await res.json();
          const authUser = json.data?.user || json.data;

          if (authUser.hasSellerProfile) {
            // If already seller, route appropriately
            if (authUser.sellerStatus === "APPROVED") {
              router.push("/seller");
            } else {
              router.push("/seller/application-status");
            }
            return;
          }

          // User is authenticated buyer, skip step 1 to store details
          setExistingUser(authUser);
          setToken(storedToken);
          setFullName(authUser.fullName || "");
          setEmail(authUser.email || "");
          setBankAccountHolder(authUser.fullName || "");
          setStep(2);
        }
      } catch {
        // Continue with guest flow
      } finally {
        setCheckingAuth(false);
      }
    }
    checkCurrentSession();
  }, [router]);

  const handleStoreNameChange = (val: string) => {
    setStoreName(val);
    if (!existingUser || !storeSlug) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setStoreSlug(generatedSlug);
    }
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!bankAccountHolder) {
      setBankAccountHolder(fullName.trim());
    }

    setStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      let activeToken = token;

      // 1. If not logged in, register customer user first, then login
      if (!existingUser) {
        const signupRes = await fetch("/api/v1/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            password,
          }),
        });

        const signupData = await signupRes.json();
        if (!signupRes.ok || !signupData.success) {
          const msg =
            signupData.error?.message ||
            (Array.isArray(signupData.error?.details)
              ? signupData.error.details.map((d: { message: string }) => d.message).join(", ")
              : null) ||
            "Account registration failed. Email might already exist.";
          setError(msg);
          setLoading(false);
          return;
        }

        // Authenticate new user
        const loginRes = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        });

        const loginData = await loginRes.json();
        if (!loginRes.ok || !loginData.success || !loginData.data?.token) {
          setError("Failed to authenticate account. Please log in.");
          setLoading(false);
          return;
        }

        activeToken = loginData.data.token;
        localStorage.setItem("token", activeToken!);
        localStorage.setItem("seller_token", activeToken!);
        document.cookie = `auth_token=${activeToken}; path=/; max-age=604800; SameSite=Lax`;
      }

      // 2. Submit Seller Onboarding application to existing backend
      const onboardPayload = {
        storeName: storeName.trim(),
        storeSlug: storeSlug.trim().toLowerCase(),
        bio: bio.trim() || undefined,
        panNumber: panNumber.trim().toUpperCase(),
        bankAccount: bankAccount.trim(),
        bankIfsc: bankIfsc.trim().toUpperCase(),
        bankAccountHolder: bankAccountHolder.trim(),
      };

      const onboardRes = await fetch("/api/v1/seller/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify(onboardPayload),
      });

      const onboardData = await onboardRes.json();

      if (!onboardRes.ok || !onboardData.success) {
        const errorMsg =
          onboardData.error?.message ||
          (Array.isArray(onboardData.error?.details)
            ? onboardData.error.details.map((d: { message: string }) => d.message).join(", ")
            : null) ||
          "Seller application submission failed. Please verify required fields.";
        setError(errorMsg);
        setLoading(false);
        return;
      }

      // Application submitted! Status is PENDING.
      // Redirect to seller status tracking page
      router.push("/seller/application-status?applied=true");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection error";
      setError(msg || "An unexpected network error occurred.");
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <SpatialBackground>
        <MarketplaceNavbar />
        <main className="flex-1 flex items-center justify-center py-32 text-xs font-mono text-[#6B4632]">
          Checking creator session...
        </main>
        <MarketplaceFooter />
      </SpatialBackground>
    );
  }

  return (
    <SpatialBackground>
      <MarketplaceNavbar />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="w-full max-w-3xl mx-auto space-y-8">
          {/* ============================================================ */}
          {/* VISUAL WORKFLOW EXPLANATION BANNER                           */}
          {/* ============================================================ */}
          <div className="rounded-2xl border border-[#D8BFA5] bg-[#F3E9DD] p-6 sm:p-8 shadow-xs">
            <div className="text-center max-w-xl mx-auto mb-6">
              <span className="text-[11px] font-mono tracking-widest text-[#B42318] uppercase font-bold block mb-1">
                SELLER ONBOARDING PROCESS
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-medium text-[#111111]">
                Start selling digital products
              </h1>
              <p className="text-xs text-[#6B4632] mt-1 font-light">
                Create your seller profile and start building your digital storefront.
              </p>
            </div>

            {/* Visual Workflow Steps */}
            <div className="grid grid-cols-5 gap-2 text-center items-center">
              <div className="flex flex-col items-center">
                <span className="w-7 h-7 rounded-full bg-[#111111] text-[#FFFFFF] font-mono text-xs font-bold flex items-center justify-center mb-1">
                  1
                </span>
                <span className="text-[10px] font-mono uppercase font-semibold text-[#111111] leading-tight">
                  Create Account
                </span>
              </div>
              <div className="h-0.5 bg-[#D8BFA5] w-full" />
              <div className="flex flex-col items-center">
                <span className="w-7 h-7 rounded-full bg-[#3B2418] text-[#FAF8F4] font-mono text-xs font-bold flex items-center justify-center mb-1">
                  2
                </span>
                <span className="text-[10px] font-mono uppercase font-semibold text-[#111111] leading-tight">
                  Store & KYC
                </span>
              </div>
              <div className="h-0.5 bg-[#D8BFA5] w-full" />
              <div className="flex flex-col items-center">
                <span className="w-7 h-7 rounded-full bg-[#FAF8F4] border border-[#6B4632] text-[#6B4632] font-mono text-xs font-bold flex items-center justify-center mb-1">
                  3
                </span>
                <span className="text-[10px] font-mono uppercase font-semibold text-[#6B4632] leading-tight">
                  Admin Review
                </span>
              </div>
            </div>

            <div className="mt-4 p-2.5 rounded-lg border border-[#D8BFA5] bg-[#FAF8F4]/80 text-[11px] text-[#6B4632] text-center font-light">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B42318] inline mr-1" />
              Note: To maintain marketplace quality, sellers are reviewed by our team prior to storefront publishing.
            </div>
          </div>

          {/* ============================================================ */}
          {/* MAIN FORM CARD                                               */}
          {/* ============================================================ */}
          <div className="rounded-2xl border border-[#E6DBD1] bg-[#FFFFFF] p-8 sm:p-10 shadow-sm">
            {error && (
              <div className="mb-6 p-4 rounded-lg border border-[#B42318]/30 bg-[#FEF3F2] text-[#B42318] text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: Account Credentials (only if guest) */}
            {step === 1 && !existingUser && (
              <form onSubmit={handleStep1Next} className="space-y-4">
                <div className="pb-3 mb-2 border-b border-[#E6DBD1]">
                  <h2 className="font-serif text-lg font-medium text-[#111111]">
                    Step 1: Creator Account Credentials
                  </h2>
                  <p className="text-xs text-[#6B4632] font-light">
                    Your login credentials for managing products and sales.
                  </p>
                </div>

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
                      className="w-full pl-9 pr-3 py-2.5 rounded-md border border-[#E6DBD1] bg-[#FAF8F4] text-xs text-[#111111] placeholder-[#A98165] focus:outline-none focus:border-[#3B2418]"
                    />
                  </div>
                </div>

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
                      placeholder="creator@example.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-md border border-[#E6DBD1] bg-[#FAF8F4] text-xs text-[#111111] placeholder-[#A98165] focus:outline-none focus:border-[#3B2418]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        className="w-full pl-9 pr-9 py-2.5 rounded-md border border-[#E6DBD1] bg-[#FAF8F4] text-xs text-[#111111] placeholder-[#A98165] focus:outline-none focus:border-[#3B2418]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-[#6B4632] hover:text-[#111111]"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[#3B2418] font-semibold mb-1.5">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-3 text-[#A98165] pointer-events-none" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-3 py-2.5 rounded-md border border-[#E6DBD1] bg-[#FAF8F4] text-xs text-[#111111] placeholder-[#A98165] focus:outline-none focus:border-[#3B2418]"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 inline-flex items-center justify-center gap-2 py-3 px-6 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#FFFFFF] bg-[#111111] hover:bg-[#3B2418] transition-colors shadow-sm"
                >
                  <span>Continue to Store Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="mt-4 text-center">
                  <p className="text-xs text-[#6B4632]">
                    Already have an account?{" "}
                    <Link href="/login" className="text-[#111111] font-semibold underline underline-offset-2 hover:text-[#B42318]">
                      Sign in to apply →
                    </Link>
                  </p>
                </div>
              </form>
            )}

            {/* STEP 2: Store Identity & Payout Account (KYC) */}
            {step === 2 && (
              <form onSubmit={handleFinalSubmit} className="space-y-5">
                <div className="pb-3 mb-2 border-b border-[#E6DBD1] flex items-center justify-between">
                  <div>
                    <h2 className="font-serif text-lg font-medium text-[#111111]">
                      Step 2: Store Identity & Banking Details
                    </h2>
                    <p className="text-xs text-[#6B4632] font-light">
                      Define your storefront handle and link your verified payout account.
                    </p>
                  </div>
                  {existingUser && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F3E9DD] text-[#3B2418] border border-[#D8BFA5]">
                      Logged in: {existingUser.email}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[#3B2418] font-semibold mb-1.5">
                      Store Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => handleStoreNameChange(e.target.value)}
                      placeholder="e.g. PixelCraft Studios"
                      className="w-full px-3 py-2.5 rounded-md border border-[#E6DBD1] bg-[#FAF8F4] text-xs text-[#111111] placeholder-[#A98165] focus:outline-none focus:border-[#3B2418]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[#3B2418] font-semibold mb-1.5">
                      Store Slug (Handle) *
                    </label>
                    <input
                      type="text"
                      required
                      value={storeSlug}
                      onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="pixelcraft-studios"
                      className="w-full px-3 py-2.5 rounded-md border border-[#E6DBD1] bg-[#FAF8F4] text-xs text-[#111111] placeholder-[#A98165] focus:outline-none focus:border-[#3B2418]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#3B2418] font-semibold mb-1.5">
                    Creator Bio (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Briefly describe what you build (e.g. Next.js SaaS boilerplates, design systems, Notion planners)..."
                    className="w-full px-3 py-2 rounded-md border border-[#E6DBD1] bg-[#FAF8F4] text-xs text-[#111111] placeholder-[#A98165] focus:outline-none focus:border-[#3B2418] resize-none"
                  />
                </div>

                {/* Financial KYC Section */}
                <div className="pt-4 border-t border-[#E6DBD1]">
                  <span className="text-xs font-mono uppercase tracking-widest text-[#3B2418] font-bold block mb-3">
                    Payout & Settlement Banking (India)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-[#6B4632] mb-1">
                        PAN Number *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={10}
                        value={panNumber}
                        onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                        placeholder="ABCDE1234F"
                        className="w-full px-3 py-2.5 rounded-md border border-[#E6DBD1] bg-[#FAF8F4] text-xs font-mono uppercase text-[#111111] focus:outline-none focus:border-[#3B2418]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-[#6B4632] mb-1">
                        Bank IFSC Code *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={11}
                        value={bankIfsc}
                        onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                        placeholder="HDFC0001234"
                        className="w-full px-3 py-2.5 rounded-md border border-[#E6DBD1] bg-[#FAF8F4] text-xs font-mono uppercase text-[#111111] focus:outline-none focus:border-[#3B2418]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-[#6B4632] mb-1">
                        Bank Account Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, ""))}
                        placeholder="987654321012"
                        className="w-full px-3 py-2.5 rounded-md border border-[#E6DBD1] bg-[#FAF8F4] text-xs font-mono text-[#111111] focus:outline-none focus:border-[#3B2418]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-[#6B4632] mb-1">
                        Account Holder Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={bankAccountHolder}
                        onChange={(e) => setBankAccountHolder(e.target.value)}
                        placeholder="Name as per bank records"
                        className="w-full px-3 py-2.5 rounded-md border border-[#E6DBD1] bg-[#FAF8F4] text-xs text-[#111111] focus:outline-none focus:border-[#3B2418]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  {!existingUser && (
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-3 rounded-md border border-[#E6DBD1] text-[#6B4632] hover:text-[#111111] text-xs font-mono uppercase tracking-wider transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 inline mr-1" /> Back
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-6 rounded-md text-xs font-mono uppercase tracking-wider font-semibold text-[#FFFFFF] bg-[#111111] hover:bg-[#3B2418] active:bg-[#000000] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {loading ? (
                      <span>Submitting Application...</span>
                    ) : (
                      <>
                        <span>Submit Seller Application</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      <MarketplaceFooter />
    </SpatialBackground>
  );
}
