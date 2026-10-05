"use client";

import React from "react";
import Link from "next/link";
import { Star, Download, Sparkles, ArrowRight, ShieldCheck, Tag } from "lucide-react";
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

  // Fallback high-quality digital aesthetic gradient background if no thumbnail
  const defaultGradient =
    "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)";

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/70 hover:border-orange-500/40 transition-all duration-300 backdrop-blur-sm overflow-hidden h-full">
      {/* Subtle hover gradient illumination */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div>
        {/* Preview / Thumbnail Header */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950 border-b border-slate-800/60">
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
              <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-2 text-orange-400 group-hover:scale-110 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono text-slate-400 tracking-wider uppercase">
                {product.category?.name || "Digital Asset"}
              </span>
            </div>
          )}

          {/* Category Tag */}
          {product.category?.name && (
            <div className="absolute top-2.5 left-2.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#06080d]/80 text-slate-300 border border-slate-700/60 backdrop-blur-md">
                {product.category.name}
              </span>
            </div>
          )}

          {/* Free or Discount Badge */}
          {product.isFree ? (
            <div className="absolute top-2.5 right-2.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 backdrop-blur-md">
                FREE
              </span>
            </div>
          ) : hasDiscount ? (
            <div className="absolute top-2.5 right-2.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40 backdrop-blur-md">
                SALE
              </span>
            </div>
          ) : null}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-2">
          {/* Seller / Creator */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="truncate max-w-[180px]">
              by {product.seller?.storeName || "Verified Creator"}
            </span>
            <div className="flex items-center gap-1 text-amber-400">
              <Star className="w-3 h-3 fill-amber-400" />
              <span className="text-slate-200 font-medium">
                {Number(product.ratingAvg || 5).toFixed(1)}
              </span>
              {Boolean(product.reviewsCount) && (
                <span className="text-slate-400">({product.reviewsCount})</span>
              )}
            </div>
          </div>

          {/* Title */}
          <Link href={`/products/${product.slug || product.id}`}>
            <h3 className="text-sm font-semibold text-slate-100 hover:text-orange-400 line-clamp-1 transition-colors">
              {product.title}
            </h3>
          </Link>

          {/* Short description */}
          {!compact && product.shortDescription && (
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {product.shortDescription}
            </p>
          )}

          {/* Tags */}
          {!compact && product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {product.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/40 text-slate-400 border border-slate-800"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Price & Action */}
      <div className="p-4 sm:p-5 pt-0 mt-auto flex items-center justify-between border-t border-slate-800/40">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-orange-400">
              {product.isFree ? "Free" : formatPaise(effectivePrice)}
            </span>
            {hasDiscount && (
              <span className="text-xs font-mono text-slate-400 line-through">
                {formatPaise(product.pricePaise)}
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-slate-400">Instant Access</span>
        </div>

        <Link
          href={`/products/${product.slug || product.id}`}
          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-white bg-slate-800 hover:bg-orange-600 transition-colors border border-slate-700/60 hover:border-orange-500/80 shadow-sm"
        >
          <span>View</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
export default ProductCard;
