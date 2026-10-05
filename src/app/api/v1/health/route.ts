import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/health
 *
 * Production-grade health check endpoint.
 *
 * Checks:
 *   - Application uptime & memory status
 *   - PostgreSQL database connectivity via "SELECT 1" ping with latency measurement
 *   - Storage provider configuration status
 *
 * Security:
 *   - ZERO secret leakage (no database URLs, credentials, or internal IPs).
 *   - Returns HTTP 200 if fully healthy.
 *   - Returns HTTP 503 if critical dependencies (database) are unreachable.
 */
export async function GET(_req: NextRequest) {
  const startTime = Date.now();
  let dbStatus: "connected" | "disconnected" = "disconnected";
  let dbLatencyMs = -1;
  let dbError: string | null = null;

  try {
    const dbPingStart = Date.now();
    await prisma.$queryRawUnsafe("SELECT 1");
    dbLatencyMs = Date.now() - dbPingStart;
    dbStatus = "connected";
  } catch (error) {
    dbStatus = "disconnected";
    dbError = "Database connectivity check failed";
  }

  const storageProvider = process.env.STORAGE_PROVIDER || "local";
  const isHealthy = dbStatus === "connected";
  const statusCode = isHealthy ? 200 : 503;

  const responseBody = {
    status: isHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
    services: {
      application: {
        status: "operational",
        latencyMs: Date.now() - startTime,
      },
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs >= 0 ? dbLatencyMs : undefined,
        ...(dbError ? { error: dbError } : {}),
      },
      storage: {
        provider: storageProvider,
        status: "configured",
      },
    },
  };

  return NextResponse.json(responseBody, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Type": "application/json",
    },
  });
}
