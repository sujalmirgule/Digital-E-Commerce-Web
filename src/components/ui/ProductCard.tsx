"use client";

import React from "react";
import Link from "next/link";
import { Star, ArrowRight, Sparkles, Layers } from "lucide-react";
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
  badge?: string;
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

  // Curated editorial background gradients for products without thumbnail
  const editorialGradients = [
    "linear-gradient(135deg, #F3E9DD 0%, #D8BFA5 100%)",
    "linear-gradient(135deg, #E6DBD1 0%, #C8AE94 100%)",
    "linear-gradient(135deg, #3B2418 0%, #6B4632 100%)",
    "linear-gradient(135deg, #1A1715 0%, #3B2418 100%)",
  ];

  // Pick deterministic gradient by slug hash
  const gradientIndex = Math.abs(
    product.slug.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % editorialGradients.length;
  const isDarkGradient = gradientIndex >= 2;

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-[#E6DBD1] bg-[#FFFFFF] hover:border-[#3B2418] hover:-translate-y-1 transition-all duration-200 overflow-hidden h-full shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_rgba(59,36,24,0.08)]">
      <div>
        {/* Thumbnail Container */}
        <Link
          href={`/products/${product.slug}`}
          className="relative aspect-[16/10] w-full overflow-hidden bg-[#F3E9DD] block border-b border-[#E6DBD1]"
          tabIndex={-1}
        >
          {product.thumbnailUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={product.thumbnailUrl}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div
              className={`w-full h-full flex flex-col items-center justify-center p-6 text-center select-none ${
                isDarkGradient ? "text-[#FAF8F4]" : "text-[#3B2418]"
              }`}
              style={{ background: editorialGradients[gradientIndex] }}
            >
              <div
                className={`w-10 h-10 rounded-full border flex items-center justify-center mb-2 shadow-sm ${
                  isDarkGradient
                    ? "border-[#D8BFA5]/30 bg-[#3B2418]/60 text-[#D8BFA5]"
                    : "border-[#6B4632]/20 bg-[#FAF8F4]/80 text-[#6B4632]"
                }`}
              >
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-[10px] tracking-wider uppercase font-mono font-medium line-clamp-1">
                {product.category?.name || "Digital Good"}
              </span>
            </div>
          )}

          {/* Badges / Category pill */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            {product.category?.name && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider font-semibold bg-[#FAF8F4]/95 text-[#3B2418] border border-[#E6DBD1] shadow-xs backdrop-blur-xs">
                {product.category.name}
              </span>
            )}
            {product.badge && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider font-semibold bg-[#3B2418] text-[#FAF8F4] border border-[#3B2418] shadow-xs">
                {product.badge}
              </span>
            )}
          </div>

          {/* Price Tag Pill */}
          <div className="absolute top-3 right-3">
            {product.isFree ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]">
                FREE
              </span>
            ) : hasDiscount ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#B42318] text-[#FFFFFF]">
                SALE
              </span>
            ) : null}
          </div>
        </Link>

        {/* Content Details */}
        <div className="p-4 sm:p-5 flex flex-col gap-2">
          {/* Creator Store Name */}
          <div className="flex items-center justify-between text-xs text-[#6B4632]">
            <span className="font-mono text-[11px] truncate">
              by{" "}
              <span className="text-[#3B2418] font-medium">
                {product.seller?.storeName || "Verified Creator"}
              </span>
            </span>

            {/* Rating */}
            {product.ratingAvg !== undefined && product.ratingAvg > 0 ? (
              <div className="flex items-center gap-1 font-mono text-[11px] text-[#111111] shrink-0">
                <Star className="w-3 h-3 fill-[#B42318] text-[#B42318]" />
                <span className="font-semibold">{Number(product.ratingAvg).toFixed(1)}</span>
                {product.reviewsCount ? (
                  <span className="text-[#6B4632]">({product.reviewsCount})</span>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Title */}
          <h3 className="font-serif text-base sm:text-lg font-medium text-[#111111] group-hover:text-[#6B4632] transition-colors line-clamp-1 leading-snug">
            <Link href={`/products/${product.slug}`}>
              {product.title}
            </Link>
          </h3>

          {/* Description */}
          {product.shortDescription && !compact && (
            <p className="text-xs text-[#6B4632] line-clamp-2 leading-relaxed font-light">
              {product.shortDescription}
            </p>
          )}
        </div>
      </div>

      {/* Footer Strip */}
      <div className="px-4 sm:px-5 py-3.5 border-t border-[#E6DBD1] bg-[#FAF8F4]/50 flex items-center justify-between">
        <div>
          {product.isFree ? (
            <span className="text-sm font-mono font-bold text-[#137333]">₹0</span>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-base font-mono font-bold text-[#111111]">
                {formatPaise(effectivePrice)}
              </span>
              {hasDiscount && (
                <span className="text-xs font-mono text-[#A98165] line-through">
                  {formatPaise(product.pricePaise)}
                </span>
              )}
            </div>
          )}
        </div>

        <Link
          href={`/products/${product.slug}`}
          className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-[#3B2418] group-hover:text-[#B42318] font-semibold transition-colors"
        >
          <span>View</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

export default ProductCard;
