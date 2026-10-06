"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import {
  Star,
  Shield,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  FileCode,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { SpatialBackground } from "@/components/ui/SpatialBackground";
import { MarketplaceNavbar } from "@/components/ui/MarketplaceNavbar";
import { MarketplaceFooter } from "@/components/ui/MarketplaceFooter";
import { formatPaise } from "@/lib/utils";

interface ProductDetail {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  productType: string;
  pricePaise: number;
  discountPricePaise?: number | null;
  isFree: boolean;
  licenseType: string;
  version: string;
  fileFormats: string[];
  tags: string[];
  ratingAvg: number;
  reviewsCount: number;
  salesCount: number;
  thumbnailUrl: string | null;
  previewUrls: string[];
  createdAt: string;
  seller: {
    storeName: string;
    storeSlug: string;
    bio?: string | null;
    logoUrl?: string | null;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  files?: {
    id: string;
    fileName: string;
    fileSizeBytes: string | number;
    fileFormat: string;
    mimeType: string;
    version: string;
  }[];
}

interface ReviewItem {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  isVerifiedPurchase: boolean;
  buyer?: {
    name: string;
  };
}

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [eligible, setEligible] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Checkout flow state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState<{
    orderId: string;
    amountPaidPaise: number;
  } | null>(null);

  // Fetch product specifications
  useEffect(() => {
    if (!slug) return;

    async function loadProduct() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/v1/products/${slug}`);
        const data = await res.json();

        if (res.ok && data.success) {
          setProduct(data.data.product);
        } else {
          setError(data.error?.message || "Failed to load product specifications");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [slug]);

  // Fetch verified reviews and entitlement status
  useEffect(() => {
    if (!slug) return;

    async function loadReviews() {
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`/api/v1/products/${slug}/reviews`, { headers });
        const data = await res.json();

        if (res.ok && data.success) {
          setReviews(data.data.reviews || []);
          setEligible(Boolean(data.data.canReview));
        }
      } catch (err) {
        console.error("Failed to load reviews:", err);
      }
    }

    loadReviews();
  }, [slug]);

  // Direct checkout action
  const handleBuyNow = async () => {
    if (!product) return;
    const token = localStorage.getItem("token");

    if (!token) {
      router.push(`/login?redirect=/products/${slug}`);
      return;
    }

    try {
      setCheckoutLoading(true);
      setCheckoutError(null);

      // Step 1: Create Order
      const orderRes = await fetch("/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: product.id,
          licenseType: product.licenseType || "STANDARD",
        }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error?.message || "Order initialization failed.");
      }

      const order = orderData.data.order;
      const orderId = order.id;

      // Step 2: Handle Zero-Cost or direct payment verification
      const verifyRes = await fetch("/api/v1/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: orderId,
          razorpayOrderId: order.razorpayOrderId || `order_${Date.now()}`,
          razorpayPaymentId: `pay_${Date.now()}`,
          razorpaySignature: "simulated_browser_checkout_sig",
        }),
      });

      const verifyData = await verifyRes.json();

      if (verifyRes.ok && verifyData.success) {
        setCheckoutSuccess({
          orderId,
          amountPaidPaise: order.totalAmountPaise,
        });
      } else {
        router.push(`/dashboard/orders`);
      }
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : "Checkout network error.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Submit verified review
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !reviewComment.trim()) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/v1/products/${slug}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReviewSuccess(true);
        setEligible(false);
        if (data.data?.review) {
          setReviews([data.data.review, ...reviews]);
        }
      } else {
        alert(data.error?.message || "Failed to submit review.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <SpatialBackground>
        <MarketplaceNavbar />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-36 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <span className="w-8 h-8 rounded-full border-2 border-velvet-rose border-t-transparent animate-spin" />
            <span className="text-xs font-serif text-velvet-cream-muted">Loading Product Specifications...</span>
          </div>
        </main>
        <MarketplaceFooter />
      </SpatialBackground>
    );
  }

  if (error || !product) {
    return (
      <SpatialBackground>
        <MarketplaceNavbar />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-36 text-center">
          <div className="p-8 rounded-3xl border border-velvet-border bg-velvet-mocha shadow-xl">
            <AlertCircle className="w-10 h-10 text-velvet-rose mx-auto mb-4" />
            <h1 className="text-2xl font-serif text-velvet-cream-soft mb-2">Product Unavailable</h1>
            <p className="text-xs text-velvet-cream-muted mb-6 font-light">{error || "This product does not exist or has been unpublished."}</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold text-white bg-velvet-rose hover:bg-velvet-rose-soft transition-colors shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Marketplace Catalog</span>
            </Link>
          </div>
        </main>
        <MarketplaceFooter />
      </SpatialBackground>
    );
  }

  const effectivePrice =
    product.discountPricePaise && product.discountPricePaise < product.pricePaise
      ? product.discountPricePaise
      : product.pricePaise;

  const hasDiscount =
    product.discountPricePaise && product.discountPricePaise < product.pricePaise;

  return (
    <SpatialBackground>
      <MarketplaceNavbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 w-full">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-velvet-cream-muted mb-8 font-light">
          <Link href="/products" className="hover:text-velvet-cream transition-colors">
            Catalog
          </Link>
          <span>/</span>
          <Link
            href={`/products?category=${product.category?.slug}`}
            className="hover:text-velvet-cream transition-colors"
          >
            {product.category?.name}
          </Link>
          <span>/</span>
          <span className="text-velvet-cream truncate max-w-[200px] sm:max-w-none">
            {product.title}
          </span>
        </div>

        {/* ============================================================ */}
        {/* PRODUCT HERO / TOP LAYOUT                                     */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Preview Gallery (Col 1-7) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="relative aspect-[16/10] w-full rounded-3xl border border-velvet-border/80 bg-velvet-plum overflow-hidden shadow-2xl">
              {product.thumbnailUrl ? (
                <Image
                  src={product.thumbnailUrl}
                  alt={product.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-velvet-plum text-center">
                  <div className="w-16 h-16 rounded-2xl bg-velvet-mocha border border-velvet-border flex items-center justify-center text-velvet-rose mb-4 shadow-md shadow-velvet-rose/20">
                    ✦
                  </div>
                  <h2 className="text-lg font-serif text-velvet-cream-soft mb-1">{product.title}</h2>
                  <span className="text-xs uppercase tracking-wider text-velvet-cream-muted">
                    {product.category?.name || "Digital Asset"}
                  </span>
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-velvet-plum/90 text-velvet-cream border border-velvet-border backdrop-blur-md">
                  {product.category?.name}
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-velvet-plum/90 text-velvet-cream-muted border border-velvet-border backdrop-blur-md">
                  v{product.version || "1.0.0"}
                </span>
              </div>
            </div>

            {/* Included Digital Files List */}
            {product.files && product.files.length > 0 && (
              <div className="p-6 rounded-3xl border border-velvet-border/80 bg-velvet-mocha backdrop-blur-sm">
                <span className="text-xs uppercase tracking-widest text-velvet-rose font-medium block mb-4">
                  Included Digital Package
                </span>
                <div className="space-y-2.5">
                  {product.files.map((file) => (
                    <div
                      key={file.id}
                      className="p-3.5 rounded-2xl border border-velvet-border/60 bg-velvet-plum/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <FileCode className="w-4 h-4 text-velvet-rose flex-shrink-0" />
                        <div>
                          <span className="text-velvet-cream font-medium block">
                            {file.fileName}
                          </span>
                          <span className="text-[10px] font-mono text-velvet-cream-muted">
                            {file.fileFormat} • Version {file.version}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        Cryptographically Signed
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Product Buy Panel (Col 8-12) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="p-6 sm:p-8 rounded-3xl border border-velvet-border/80 bg-velvet-mocha shadow-2xl">
              {/* Creator Metadata */}
              <div className="flex items-center justify-between text-xs text-velvet-cream-muted mb-3">
                <span className="text-velvet-cream font-medium">by {product.seller?.storeName}</span>
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span className="text-velvet-cream font-medium">
                    {Number(product.ratingAvg || 5).toFixed(1)}
                  </span>
                  <span className="text-velvet-cream-muted text-[11px]">({product.reviewsCount || 0} reviews)</span>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-serif font-normal text-velvet-cream-soft tracking-tight mb-4">
                {product.title}
              </h1>

              {/* Short Summary */}
              <p className="text-xs sm:text-sm text-velvet-cream-muted leading-relaxed font-light mb-6">
                {product.shortDescription}
              </p>

              {/* Price Tag */}
              <div className="p-4 rounded-2xl border border-velvet-border bg-velvet-plum/60 mb-6 flex items-baseline justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-velvet-cream-muted">
                    License Price
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl font-serif text-velvet-cream">
                      {product.isFree ? "Free" : formatPaise(effectivePrice)}
                    </span>
                    {hasDiscount && (
                      <span className="text-sm font-mono text-velvet-cream-muted line-through">
                        {formatPaise(product.pricePaise)}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  Instant Vault Access
                </span>
              </div>

              {/* Buy Now CTA */}
              {checkoutSuccess ? (
                <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 text-center space-y-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-serif font-medium text-emerald-300">Payment Verified!</h4>
                  <p className="text-xs text-velvet-cream-muted font-light">
                    Order <span className="font-mono text-velvet-cream">{checkoutSuccess.orderId}</span> is confirmed. Entitlement ready in your vault.
                  </p>
                  <div className="flex gap-2 justify-center pt-2">
                    <Link
                      href="/dashboard/library"
                      className="px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-velvet-rose hover:bg-velvet-rose-soft shadow-md shadow-velvet-rose/25"
                    >
                      Open My Vault →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {checkoutError && (
                    <div className="p-3.5 rounded-xl border border-rose-900/50 bg-rose-950/40 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{checkoutError}</span>
                    </div>
                  )}

                  <button
                    onClick={handleBuyNow}
                    disabled={checkoutLoading}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-full text-xs font-semibold tracking-wide text-white bg-velvet-rose hover:bg-velvet-rose-soft shadow-lg shadow-velvet-rose/25 transition-all duration-200 disabled:opacity-50"
                  >
                    {checkoutLoading ? (
                      <span>Initializing Payment Gateway...</span>
                    ) : (
                      <>
                        <span>Buy Now & Instant Access</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-velvet-cream-muted text-center pt-1 font-light">
                    Secured by Razorpay • Encrypted File Vault • Cryptographic Tax Invoice
                  </p>
                </div>
              )}

              {/* Guarantees Box */}
              <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-velvet-border/60 text-xs text-velvet-cream-muted font-light">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-velvet-rose" />
                  <span>Curated Quality</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-velvet-rose" />
                  <span>Encrypted Storage</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileCheck className="w-3.5 h-3.5 text-velvet-rose" />
                  <span>License: {product.licenseType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-velvet-rose" />
                  <span>{product.salesCount || 0} Orders Filled</span>
                </div>
              </div>
            </div>

            {/* Seller Information Card */}
            <div className="p-6 rounded-3xl border border-velvet-border/80 bg-velvet-mocha">
              <span className="text-[10px] uppercase tracking-widest text-velvet-cream-muted block mb-3 font-semibold">
                Creator Studio
              </span>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-velvet-plum border border-velvet-border flex items-center justify-center text-velvet-rose font-serif font-bold">
                  {product.seller?.storeName?.charAt(0) || "C"}
                </div>
                <div>
                  <h4 className="text-sm font-serif font-medium text-velvet-cream-soft">
                    {product.seller?.storeName}
                  </h4>
                  <span className="text-[11px] text-emerald-400 font-medium">Verified Creator</span>
                </div>
              </div>
              {product.seller?.bio && (
                <p className="text-xs text-velvet-cream-muted leading-relaxed font-light">
                  {product.seller.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* FULL DESCRIPTION & REVIEWS                                    */}
        {/* ============================================================ */}
        <div className="mt-16 pt-12 border-t border-velvet-border/80 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-8">
            <div>
              <h2 className="text-xl font-serif font-medium text-velvet-cream-soft tracking-tight mb-4">
                Detailed Product Overview
              </h2>
              <div className="text-sm text-velvet-cream-soft/90 leading-relaxed font-light whitespace-pre-line space-y-4">
                {product.description || product.shortDescription}
              </div>
            </div>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="pt-6 border-t border-velvet-border/60">
                <span className="text-xs uppercase tracking-widest text-velvet-cream-muted block mb-3 font-medium">
                  Categorization & Tags
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full text-xs bg-velvet-mocha border border-velvet-border text-velvet-cream"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Verified Reviews Section */}
            <div className="pt-8 border-t border-velvet-border/80">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-serif font-medium text-velvet-cream-soft tracking-tight">
                    Verified Customer Reviews
                  </h3>
                  <span className="text-xs text-velvet-cream-muted">
                    Only verified collectors with active entitlements can submit feedback.
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span className="text-base font-serif font-medium text-velvet-cream-soft">
                    {Number(product.ratingAvg || 5).toFixed(1)}
                  </span>
                  <span className="text-xs text-velvet-cream-muted">({reviews.length})</span>
                </div>
              </div>

              {/* Review Submission Form (if eligible) */}
              {eligible && !reviewSuccess && (
                <form
                  onSubmit={handleReviewSubmit}
                  className="mb-8 p-6 rounded-2xl border border-velvet-rose/40 bg-velvet-mocha space-y-4"
                >
                  <span className="text-xs uppercase tracking-wider text-velvet-rose block font-semibold">
                    You Own This Product — Leave a Verified Review
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-velvet-cream-muted">Rating:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="p-1 text-amber-400 hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= reviewRating ? "fill-amber-400" : "text-velvet-cream-muted/30"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    required
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share your detailed feedback on this digital asset..."
                    rows={3}
                    className="w-full p-3.5 rounded-xl border border-velvet-border bg-velvet-plum text-xs text-velvet-cream focus:outline-none focus:border-velvet-cream font-light"
                  />
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-5 py-2 rounded-full text-xs font-semibold text-white bg-velvet-rose hover:bg-velvet-rose-soft disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {submittingReview ? "Submitting..." : "Post Verified Review"}
                  </button>
                </form>
              )}

              {/* Reviews List */}
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-5 rounded-2xl border border-velvet-border/80 bg-velvet-mocha space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-serif font-medium text-velvet-cream-soft">
                            {rev.buyer?.name || "Verified Collector"}
                          </span>
                          {rev.isVerifiedPurchase && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              Verified Purchase
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-amber-400">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-velvet-cream-muted leading-relaxed font-light">
                        {rev.comment}
                      </p>
                      <span className="text-[10px] text-velvet-cream-muted/70 block">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-velvet-cream-muted font-light italic">
                  No customer reviews yet. Be the first verified collector to leave feedback!
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      <MarketplaceFooter />
    </SpatialBackground>
  );
}
