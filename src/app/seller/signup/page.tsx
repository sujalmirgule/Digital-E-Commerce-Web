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
} from "lucide-react";
import { SpatialBackground } from "@/components/ui/SpatialBackground";
import { MarketplaceNavbar } from "@/components/ui/MarketplaceNavbar";
import { MarketplaceFooter } from "@/components/ui/MarketplaceFooter";

export default function SellerSignupPage() {
  const router = useRouter();

  // Step state: 1 = Account Credentials (if not logged in), 2 = Store & KYC Identity
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

  // Form Fields - Seller Profile & KYC
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [bio, setBio] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in
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
            // Already applied or approved
            if (authUser.sellerStatus === "APPROVED") {
              router.push("/seller");
            } else {
              router.push("/seller/application-status");
            }
            return;
          }

          // User is authenticated as a buyer, skip step 1 to seller onboarding
          setExistingUser(authUser);
          setToken(storedToken);
          setFullName(authUser.fullName || "");
          setEmail(authUser.email || "");
          setBankAccountHolder(authUser.fullName || "");
          setStep(2);
        }
      } catch {
        // Continue with new user flow
      } finally {
        setCheckingAuth(false);
      }
    }
    checkCurrentSession();
  }, [router]);

  // Auto-generate slug from store name
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
    setError(null);
    setLoading(true);

    try {
      let activeToken = token;

      // 1. If user is NOT logged in, register user account and login first
      if (!existingUser) {
        // Register user
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
              ? signupData.error.details.map((d: any) => d.message).join(", ")
              : null) ||
            "Account registration failed";
          setError(msg);
          setLoading(false);
          return;
        }

        // Login to get token
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
          setError("Failed to authenticate newly created account.");
          setLoading(false);
          return;
        }

        activeToken = loginData.data.token;
        localStorage.setItem("token", activeToken!);
        localStorage.setItem("seller_token", activeToken!);
        document.cookie = `auth_token=${activeToken}; path=/; max-age=604800; SameSite=Lax`;
      }

      // 2. Submit Seller Onboarding application
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
            ? onboardData.error.details.map((d: any) => d.message).join(", ")
            : null) ||
          "Seller application submission failed";
        setError(errorMsg);
        setLoading(false);
        return;
      }

      // Success! Profile created with status = PENDING.
      // Redirect to seller application status page
      router.push("/seller/application-status?applied=true");
    } catch (err: any) {
      setError(err.message || "An unexpected network error occurred.");
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <SpatialBackground>
        <MarketplaceNavbar />
        <main className="flex-1 flex items-center justify-center py-32 text-xs text-[#BBAE9F]">
          Checking creator status...
        </main>
        <MarketplaceFooter />
      </SpatialBackground>
    );
  }

  return (
    <SpatialBackground>
      <MarketplaceNavbar />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-24 relative">
        <div className="w-full max-w-xl">
          <div className="relative rounded-3xl border border-[#3A2930] bg-[#211815] p-6 sm:p-10 shadow-2xl shadow-black/80 overflow-hidden">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#3A2930] bg-[#1B101B] mb-3">
                <Store className="w-3.5 h-3.5 text-[#F43F5E]" />
                <span className="text-[11px] font-mono tracking-widest text-[#E8D5B5] uppercase font-medium">
                  Creator Onboarding
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-light text-[#F7EFE2] font-editorial tracking-tight">
                Become a Seller
              </h1>
              <p className="text-xs text-[#BBAE9F] mt-2 font-light max-w-md mx-auto">
                Sell digital products to an engaged audience. Retain 90% net earnings with verified payout clearance.
              </p>

              {/* Progress Indicator */}
              {!existingUser && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <div
                    className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full transition-colors ${
                      step === 1
                        ? "bg-[#F43F5E] text-white"
                        : "bg-[#1B101B] text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    <span>1. User Account</span>
                    {step === 2 && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <div className="w-4 h-px bg-[#3A2930]" />
                  <div
                    className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full transition-colors ${
                      step === 2
                        ? "bg-[#F43F5E] text-white"
                        : "bg-[#1B101B] text-[#BBAE9F] border border-[#3A2930]"
                    }`}
                  >
                    <span>2. Store & KYC</span>
                  </div>
                </div>
              )}
            </div>

            {/* Error Notification */}
            {error && (
              <div className="mb-6 p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* STEP 1: Account Credentials (only for guest visitors) */}
            {step === 1 && !existingUser && (
              <form onSubmit={handleStep1Next} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-[#E8D5B5] uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BBAE9F]" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Sujal Mirgule"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#3A2930] bg-[#1B101B] text-sm text-[#F7EFE2] placeholder-[#BBAE9F]/40 focus:outline-none focus:border-[#E8D5B5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#E8D5B5] uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BBAE9F]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="creator@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#3A2930] bg-[#1B101B] text-sm text-[#F7EFE2] placeholder-[#BBAE9F]/40 focus:outline-none focus:border-[#E8D5B5]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-[#E8D5B5] uppercase tracking-wider mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BBAE9F]" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-[#3A2930] bg-[#1B101B] text-sm text-[#F7EFE2] placeholder-[#BBAE9F]/40 focus:outline-none focus:border-[#E8D5B5]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#BBAE9F] hover:text-[#F7EFE2]"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#E8D5B5] uppercase tracking-wider mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BBAE9F]" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#3A2930] bg-[#1B101B] text-sm text-[#F7EFE2] placeholder-[#BBAE9F]/40 focus:outline-none focus:border-[#E8D5B5]"
                      />
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-[#BBAE9F]/70 block">
                  Password requires 8+ chars with uppercase, lowercase, digit, and special character.
                </span>

                <button
                  type="submit"
                  className="w-full mt-4 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-full text-xs font-medium text-white bg-[#F43F5E] hover:bg-[#FB7185] shadow-lg shadow-[#F43F5E]/30 transition-all duration-200"
                >
                  <span>Continue to Store Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="mt-6 pt-4 border-t border-[#3A2930] text-center">
                  <p className="text-xs text-[#BBAE9F] font-light">
                    Already registered?{" "}
                    <Link href="/login" className="text-[#E8D5B5] hover:text-[#F43F5E] font-medium">
                      Sign in to apply →
                    </Link>
                  </p>
                </div>
              </form>
            )}

            {/* STEP 2: Store Identity & Payout KYC */}
            {step === 2 && (
              <form onSubmit={handleFinalSubmit} className="space-y-4">
                {existingUser && (
                  <div className="p-3 rounded-xl bg-[#1B101B] border border-[#3A2930] text-xs text-[#E8D5B5] flex items-center justify-between">
                    <div>
                      <span className="text-[#BBAE9F] block text-[10px] uppercase font-mono">Applying as</span>
                      <strong className="text-[#F7EFE2]">{existingUser.fullName}</strong> ({existingUser.email})
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Unified Account
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-[#E8D5B5] uppercase tracking-wider mb-2">
                      Store Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => handleStoreNameChange(e.target.value)}
                      placeholder="PixelCraft Studios"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#3A2930] bg-[#1B101B] text-sm text-[#F7EFE2] placeholder-[#BBAE9F]/40 focus:outline-none focus:border-[#E8D5B5]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#E8D5B5] uppercase tracking-wider mb-2">
                      Store Slug *
                    </label>
                    <input
                      type="text"
                      required
                      value={storeSlug}
                      onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="pixelcraft-studios"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#3A2930] bg-[#1B101B] text-sm text-[#F7EFE2] placeholder-[#BBAE9F]/40 focus:outline-none focus:border-[#E8D5B5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#E8D5B5] uppercase tracking-wider mb-2">
                    Creator Bio / Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Briefly describe the digital templates, assets, or software you create..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#3A2930] bg-[#1B101B] text-xs text-[#F7EFE2] placeholder-[#BBAE9F]/40 focus:outline-none focus:border-[#E8D5B5] resize-none"
                  />
                </div>

                <div className="pt-2 border-t border-[#3A2930]/80">
                  <span className="text-[11px] font-mono tracking-wider text-[#E8D5B5] uppercase block mb-3 font-medium">
                    Tax Identity & Payout Account (KYC)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-[#BBAE9F] uppercase tracking-wider mb-2">
                        PAN Number *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={10}
                        value={panNumber}
                        onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                        placeholder="ABCDE1234F"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#3A2930] bg-[#1B101B] text-sm text-[#F7EFE2] placeholder-[#BBAE9F]/40 focus:outline-none focus:border-[#E8D5B5] uppercase font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-[#BBAE9F] uppercase tracking-wider mb-2">
                        Bank IFSC Code *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={11}
                        value={bankIfsc}
                        onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                        placeholder="HDFC0001234"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#3A2930] bg-[#1B101B] text-sm text-[#F7EFE2] placeholder-[#BBAE9F]/40 focus:outline-none focus:border-[#E8D5B5] uppercase font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-[#BBAE9F] uppercase tracking-wider mb-2">
                        Bank Account Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, ""))}
                        placeholder="987654321012"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#3A2930] bg-[#1B101B] text-sm text-[#F7EFE2] placeholder-[#BBAE9F]/40 focus:outline-none focus:border-[#E8D5B5] font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-[#BBAE9F] uppercase tracking-wider mb-2">
                        Account Holder Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={bankAccountHolder}
                        onChange={(e) => setBankAccountHolder(e.target.value)}
                        placeholder="Account name as per bank"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#3A2930] bg-[#1B101B] text-sm text-[#F7EFE2] placeholder-[#BBAE9F]/40 focus:outline-none focus:border-[#E8D5B5]"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-[#BBAE9F]/60 mt-2 block">
                    Financial credentials are encrypted and securely stored for settlement disbursements.
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  {!existingUser && (
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-5 py-3 rounded-full border border-[#3A2930] text-[#BBAE9F] hover:text-[#F7EFE2] text-xs font-medium transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 inline mr-1" /> Back
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-full text-xs font-medium text-white bg-[#F43F5E] hover:bg-[#FB7185] active:bg-[#9F1239] shadow-lg shadow-[#F43F5E]/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
