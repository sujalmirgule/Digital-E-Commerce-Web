import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  getClientIp,
  getRateLimitTier,
} from "@/lib/rate-limiter";

/**
 * Production Security & Rate Limiting Middleware
 *
 * Responsibilities:
 *   1. CORS policy enforcement (approved origins, explicit preflight handling, credentials security)
 *   2. HTTP Security Headers (CSP, nosniff, DENY, Referrer-Policy, Permissions-Policy, HSTS)
 *   3. Distributed Request Tracing (x-request-id)
 *   4. Sensitive endpoint sliding-window rate limiting with standard RFC headers
 */

// Approved CORS origins
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim().toLowerCase())
    : [];

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").toLowerCase();

  const set = new Set(["http://localhost:3000", "http://127.0.0.1:3000", appUrl, ...envOrigins]);
  return Array.from(set);
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();

  // 1. Handle CORS
  const origin = req.headers.get("origin");
  const allowedOrigins = getAllowedOrigins();
  const isAllowedOrigin = origin && (allowedOrigins.includes(origin.toLowerCase()) || process.env.NODE_ENV !== "production");

  // Handle preflight OPTIONS requests
  if (req.method === "OPTIONS") {
    const preflightHeaders = new Headers();
    if (isAllowedOrigin && origin) {
      preflightHeaders.set("Access-Control-Allow-Origin", origin);
      preflightHeaders.set("Access-Control-Allow-Credentials", "true");
    }
    preflightHeaders.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, PATCH, OPTIONS"
    );
    preflightHeaders.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, X-Razorpay-Signature, x-request-id"
    );
    preflightHeaders.set("Access-Control-Max-Age", "86400");
    preflightHeaders.set("x-request-id", requestId);

    return new NextResponse(null, {
      status: 204,
      headers: preflightHeaders,
    });
  }

  // 2. Rate Limiting for API routes
  let rateLimitHeaders: Record<string, string> = {};
  if (pathname.startsWith("/api/")) {
    const ip = getClientIp(req);
    const tier = getRateLimitTier(pathname, req.method);
    const rateLimit = checkRateLimit(ip, tier);

    rateLimitHeaders = {
      "X-RateLimit-Limit": String(rateLimit.limit),
      "X-RateLimit-Remaining": String(rateLimit.remaining),
      "X-RateLimit-Reset": String(rateLimit.resetSeconds),
    };

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
          },
        },
        {
          status: 429,
          headers: {
            ...rateLimitHeaders,
            "Retry-After": String(rateLimit.retryAfterSeconds || 60),
            "x-request-id": requestId,
          },
        }
      );
    }
  }

  // 3. Forward request and apply security headers to response
  const response = NextResponse.next({
    request: {
      headers: new Headers(req.headers),
    },
  });

  // Attach request ID for downstream tracing
  response.headers.set("x-request-id", requestId);

  // Apply rate limit headers if applicable
  for (const [key, value] of Object.entries(rateLimitHeaders)) {
    response.headers.set(key, value);
  }

  // Apply CORS headers on response
  if (isAllowedOrigin && origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  // 4. HTTP Security Headers
  // Strict Content-Security-Policy with Razorpay checkout support
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com",
    "frame-src 'self' https://api.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self)"
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  return response;
}

export const config = {
  // Apply middleware to API routes and page requests, excluding static assets
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
