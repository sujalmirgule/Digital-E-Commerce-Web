/**
 * Rate Limiter — In-memory sliding-window rate limiter for sensitive endpoints.
 *
 * Protects against:
 *   - Brute-force credential stuffing (login/signup)
 *   - Payment fraud & card testing (checkout/payment verify)
 *   - Asset denial-of-service (uploads)
 *   - Unauthorized file scraping (downloads)
 *   - Refund abuse & administrative brute-force
 *
 * Features:
 *   - Sliding-window algorithm for smooth traffic shaping.
 *   - Per-tier customizable limits and window durations.
 *   - Standard RFC-compliant rate limit response headers (X-RateLimit-*).
 *   - Memory auto-cleanup to prevent leaks.
 *   - In-memory reset for test isolation.
 */

import { NextRequest } from "next/server";

export type RateLimitTier =
  | "auth"
  | "checkout"
  | "payment"
  | "upload"
  | "download"
  | "refund"
  | "admin"
  | "general";

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export const RATE_LIMIT_TIERS: Record<RateLimitTier, RateLimitConfig> = {
  auth: { limit: 15, windowMs: 60 * 1000 },       // 15 req/min (brute force protection)
  checkout: { limit: 30, windowMs: 60 * 1000 },   // 30 req/min
  payment: { limit: 60, windowMs: 60 * 1000 },    // 60 req/min
  upload: { limit: 30, windowMs: 60 * 1000 },     // 30 req/min
  download: { limit: 60, windowMs: 60 * 1000 },   // 60 req/min
  refund: { limit: 20, windowMs: 60 * 1000 },     // 20 req/min
  admin: { limit: 120, windowMs: 60 * 1000 },    // 120 req/min
  general: { limit: 300, windowMs: 60 * 1000 },  // 300 req/min
};

interface WindowEntry {
  timestamps: number[];
}

// Global in-memory storage for sliding windows: Map<key, WindowEntry>
const memoryStore = new Map<string, WindowEntry>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
let cleanupInterval: NodeJS.Timeout | null = null;
if (typeof setInterval !== "undefined") {
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of Array.from(memoryStore.entries())) {
      // Remove timestamps older than 10 minutes
      entry.timestamps = entry.timestamps.filter((ts: number) => now - ts < 10 * 60 * 1000);
      if (entry.timestamps.length === 0) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);


  // Prevent interval from blocking Node.js process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  retryAfterSeconds?: number;
}

/**
 * Extracts client IP address safely from headers, with localhost fallback.
 */
export function getClientIp(req: NextRequest | Request): string {
  const headers = req.headers;
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  return "127.0.0.1";
}

/**
 * Maps a URL pathname and HTTP method to a rate-limiting tier.
 */
export function getRateLimitTier(pathname: string, method = "GET"): RateLimitTier {
  const normalizedPath = pathname.toLowerCase();
  const normalizedMethod = method.toUpperCase();

  // 1. Auth routes (POST)
  if (
    normalizedPath.startsWith("/api/v1/auth/login") ||
    normalizedPath.startsWith("/api/v1/auth/signup") ||
    normalizedPath.startsWith("/api/v1/auth/reset")
  ) {
    return "auth";
  }

  // 2. Checkout
  if (normalizedPath.startsWith("/api/v1/checkout") && normalizedMethod === "POST") {
    return "checkout";
  }

  // 3. Payment verification & webhook
  if (normalizedPath.startsWith("/api/v1/payments/verify")) {
    return "payment";
  }
  if (normalizedPath.startsWith("/api/v1/payments/webhook")) {
    return "payment";
  }

  // 4. Uploads
  if (
    normalizedPath.includes("/assets/upload") ||
    normalizedPath.includes("/receipts/template/upload")
  ) {
    return "upload";
  }

  // 5. Downloads
  if (
    normalizedPath.startsWith("/api/v1/downloads") ||
    normalizedPath.includes("/receipt")
  ) {
    return "download";
  }

  // 6. Refunds
  if (normalizedPath.includes("/refund") && normalizedMethod === "POST") {
    return "refund";
  }

  // 7. Admin routes
  if (normalizedPath.startsWith("/api/v1/admin")) {
    return "admin";
  }

  return "general";
}

/**
 * Checks and records a request against sliding window rate limit.
 */
export function checkRateLimit(
  identifier: string,
  tier: RateLimitTier = "general",
  customConfig?: Partial<RateLimitConfig>
): RateLimitResult {
  // If rate limiting is disabled via env var, allow immediately
  if (process.env.ENABLE_RATE_LIMITING === "false") {
    return {
      success: true,
      limit: 999999,
      remaining: 999999,
      resetSeconds: 0,
    };
  }

  const config = {
    ...RATE_LIMIT_TIERS[tier],
    ...customConfig,
  };

  const key = `${tier}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let entry = memoryStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    memoryStore.set(key, entry);
  }

  // Filter timestamps within active sliding window
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

  const count = entry.timestamps.length;
  const oldestTimestamp = entry.timestamps[0] || now;
  const resetMs = Math.max(0, oldestTimestamp + config.windowMs - now);
  const resetSeconds = Math.ceil(resetMs / 1000);

  if (count >= config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetSeconds,
      retryAfterSeconds: Math.max(1, resetSeconds),
    };
  }

  // Record this request
  entry.timestamps.push(now);

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.timestamps.length,
    resetSeconds,
  };
}

/**
 * Resets rate limit store (used in tests to ensure clean state).
 */
export function resetRateLimiter(): void {
  memoryStore.clear();
}
