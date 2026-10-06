"use client";

import React from "react";
import Link from "next/link";
import { Star, ArrowRight, Layers } from "lucide-react";
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

  // Curated fallback editorial gradients if thumbnail is absent
  const editorialGradients = [
    "linear-gradient(135deg, #F2E7DB 0%, #C8AA91 100%)",
    "linear-gradient(135deg, #3B261C 0%, #684332 100%)",
    "linear-gradient(135deg, #FAF7F2 0%, #E6DBD1 100%)",
    "linear-gradient(135deg, #211D1A 0%, #3B261C 100%)",
  ];

  const gradientIndex = Math.abs(
    product.slug.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % editorialGradients.length;
  const isDarkGradient = gradientIndex === 1 || gradientIndex === 3;

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-[#C8AA91]/50 bg-[#FFFFFF] hover:border-[#3B261C] transition-all duration-300 overflow-hidden h-full shadow-[0_4px_16px_rgba(59,38,28,0.06)] hover:shadow-[0_16px_36px_-8px_rgba(59,38,28,0.16)] hover:-translate-y-1.5 cursor-pointer">
      <div>
        {/* Thumbnail Container */}
        <Link
          href={`/products/${product.slug}`}
          className="relative aspect-[16/10] w-full overflow-hidden bg-[#F2E7DB] block border-b border-[#C8AA91]/40"
          tabIndex={-1}
        >
          {product.thumbnailUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={product.thumbnailUrl}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div
              className={`w-full h-full flex flex-col items-center justify-center p-6 text-center select-none ${
                isDarkGradient ? "text-[#FAF7F2]" : "text-[#3B261C]"
              }`}
              style={{ background: editorialGradients[gradientIndex] }}
            >
              <div
                className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-2.5 shadow-sm ${
                  isDarkGradient
                    ? "border-[#C8AA91]/40 bg-[#3B261C]/80 text-[#F2E7DB]"
                    : "border-[#8A6048]/30 bg-[#FAF7F2]/90 text-[#3B261C]"
                }`}
              >
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-[11px] tracking-wider uppercase font-sans font-bold line-clamp-1">
                {product.category?.name || "Digital Asset"}
              </span>
            </div>
          )}

          {/* Badges / Category pill */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            {product.category?.name && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] uppercase font-sans tracking-wider font-bold bg-[#FAF7F2]/95 text-[#3B261C] border border-[#C8AA91]/70 shadow-xs backdrop-blur-xs">
                {product.category.name}
              </span>
            )}
            {product.badge && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] uppercase font-sans tracking-wider font-extrabold bg-[#A94432] text-[#FFFFFF] shadow-xs">
                {product.badge}
              </span>
            )}
          </div>

          {/* Price Tag Pill */}
          <div className="absolute top-3 right-3">
            {product.isFree ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-sans font-extrabold bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]">
                FREE
              </span>
            ) : hasDiscount ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-sans font-extrabold bg-[#A94432] text-[#FFFFFF]">
                SALE
              </span>
            ) : null}
          </div>
        </Link>

        {/* Content Details */}
        <div className="p-4 sm:p-5 flex flex-col gap-2.5">
          {/* Creator Store Name & Rating */}
          <div className="flex items-center justify-between text-xs text-[#8A6048]">
            <span className="text-[12px] truncate font-medium">
              by{" "}
              <span className="text-[#3B261C] font-bold hover:underline">
                {product.seller?.storeName || "Verified Creator"}
              </span>
            </span>

            {/* Rating */}
            {product.ratingAvg !== undefined && product.ratingAvg > 0 ? (
              <div className="flex items-center gap-1 text-[12px] text-[#151311] shrink-0 font-bold">
                <Star className="w-3.5 h-3.5 fill-[#C46A4A] text-[#C46A4A]" />
                <span>{Number(product.ratingAvg).toFixed(1)}</span>
                {product.reviewsCount ? (
                  <span className="text-[#8A6048] font-normal">({product.reviewsCount})</span>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Title */}
          <h3 className="font-sans text-lg sm:text-[19px] font-bold text-[#151311] group-hover:text-[#684332] transition-colors line-clamp-1 leading-snug">
            <Link href={`/products/${product.slug}`} className="hover:underline">
              {product.title}
            </Link>
          </h3>

          {/* Description */}
          {product.shortDescription && !compact && (
            <p className="text-[13px] text-[#684332] line-clamp-2 leading-relaxed font-normal">
              {product.shortDescription}
            </p>
          )}
        </div>
      </div>

      {/* Footer Strip */}
      <div className="px-4 sm:p-5 py-3.5 border-t border-[#E6DBD1] bg-[#FAF7F2]/60 flex items-center justify-between">
        <div>
          {product.isFree ? (
            <span className="text-base font-sans font-extrabold text-[#137333]">₹0</span>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-sans font-extrabold text-[#151311]">
                {formatPaise(effectivePrice)}
              </span>
              {hasDiscount && (
                <span className="text-xs font-sans text-[#8A6048] line-through font-medium">
                  {formatPaise(product.pricePaise)}
                </span>
              )}
            </div>
          )}
        </div>

        <Link
          href={`/products/${product.slug}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-[#3B261C] bg-[#F2E7DB] hover:bg-[#3B261C] hover:text-[#FFFFFF] transition-all shadow-xs"
        >
          <span>View</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

export default ProductCard;
