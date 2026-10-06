"use client";

import React from "react";
import Link from "next/link";
import { Star, ShoppingBag, ArrowRight, Sparkles } from "lucide-react";
import { formatPaise } from "@/lib/utils";

export interface ProductCardData {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  productType?: string;
  pricePaise: number;
  discountPricePaise?: number | null;
  isFree?: boolean;
  ratingAvg?: number;
  reviewsCount?: number;
  salesCount?: number;
  tags?: string[];
  thumbnailUrl?: string | null;
  seller?: {
    storeName: string;
    storeSlug?: string;
  };
  category?: {
    name: string;
    slug?: string;
  };
}

export function ProductCard({
  product,
  compact = false,
}: {
  product: ProductCardData;
  compact?: boolean;
}) {
  const effectivePrice =
    product.discountPricePaise && product.discountPricePaise < product.pricePaise
      ? product.discountPricePaise
      : product.pricePaise;

  const hasDiscount =
    product.discountPricePaise && product.discountPricePaise < product.pricePaise;

  // Fallback high-quality luxury dark mocha gradient
  const defaultGradient =
    "linear-gradient(135deg, #2B201C 0%, #1B101B 100%)";

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-[#3A2930] bg-[#211815] hover:border-[#E8D5B5]/60 hover:-translate-y-1 transition-all duration-300 overflow-hidden h-full shadow-lg shadow-black/40">
      {/* Subtle hover rose ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#F43F5E]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div>
        {/* Preview / Thumbnail Header */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#1B101B] border-b border-[#3A2930]">
          {product.thumbnailUrl ? (
            <img
              src={product.thumbnailUrl}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center p-6 text-center"
              style={{ background: defaultGradient }}
            >
              <div className="w-10 h-10 rounded-full bg-[#120A12]/80 border border-[#3A2930] flex items-center justify-center mb-2 text-[#E8D5B5] group-hover:scale-110 transition-transform">
                <Sparkles className="w-4 h-4 text-[#F43F5E]" />
              </div>
              <span className="text-[10px] tracking-wider uppercase text-[#BBAE9F]">
                {product.category?.name || "Digital Asset"}
              </span>
            </div>
          )}

          {/* Category Tag (as shown in reference cards) */}
          {product.category?.name && (
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase font-mono tracking-wider bg-[#120A12]/85 text-[#E8D5B5] border border-[#3A2930] backdrop-blur-md">
                {product.category.name}
              </span>
            </div>
          )}

          {/* Free or Discount Badge */}
          {product.isFree ? (
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#86A989]/20 text-[#86A989] border border-[#86A989]/40 backdrop-blur-md">
                FREE
              </span>
            </div>
          ) : hasDiscount ? (
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F43F5E]/20 text-[#FB7185] border border-[#F43F5E]/40 backdrop-blur-md">
                SALE
              </span>
            </div>
          ) : null}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-2">
          {/* Title */}
          <Link href={`/products/${product.slug || product.id}`}>
            <h3 className="text-sm font-semibold text-[#F7EFE2] group-hover:text-[#E8D5B5] line-clamp-1 transition-colors">
              {product.title}
            </h3>
          </Link>

          {/* Seller / Creator */}
          <div className="flex items-center justify-between text-xs text-[#BBAE9F]">
            <span className="truncate max-w-[160px]">
              by {product.seller?.storeName || "Verified Creator"}
            </span>

            {/* Rating */}
            <div className="flex items-center gap-1 text-[#E8D5B5]">
              <Star className="w-3 h-3 fill-[#E8D5B5] text-[#E8D5B5]" />
              <span className="text-xs font-medium text-[#F7EFE2]">
                {Number(product.ratingAvg || 4.9).toFixed(1)}
              </span>
              <span className="text-[11px] text-[#BBAE9F]">
                ({product.reviewsCount || 120})
              </span>
            </div>
          </div>

          {/* Short description */}
          {!compact && product.shortDescription && (
            <p className="text-xs text-[#BBAE9F] line-clamp-2 leading-relaxed font-light mt-1">
              {product.shortDescription}
            </p>
          )}

          {/* Tags */}
          {!compact && product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {product.tags.slice(0, 2).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[#1B101B] text-[#BBAE9F] border border-[#3A2930]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Price & Circular Rose Action Button (exact match to reference) */}
      <div className="p-4 sm:p-5 pt-0 mt-auto flex items-center justify-between border-t border-[#3A2930]/70">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-semibold text-[#F7EFE2]">
              {product.isFree ? "Free" : formatPaise(effectivePrice)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-[#BBAE9F] line-through">
                {formatPaise(product.pricePaise)}
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#BBAE9F]/70">Instant Access</span>
        </div>

        {/* Rose Circular Action Button */}
        <Link
          href={`/products/${product.slug || product.id}`}
          className="w-8 h-8 rounded-full bg-[#F43F5E] hover:bg-[#FB7185] active:bg-[#9F1239] text-white flex items-center justify-center shadow-md shadow-[#F43F5E]/30 transition-transform group-hover:scale-105"
          aria-label={`View ${product.title}`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
export default ProductCard;

