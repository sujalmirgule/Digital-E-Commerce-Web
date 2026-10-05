import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { authorizeProductFileDownload } from "@/lib/services/download";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    productFileId: string;
  };
}

/**
 * POST /api/v1/buyer/downloads/:productFileId/url
 *
 * Validates ownership, checks fraud/rate limits, increments download counter,
 * and returns a time-limited signed download URL (15-minute expiration).
 *
 * Security & Invariants:
 *   - Authentication required (Bearer JWT).
 *   - Entitlement must be ACTIVE and belong to authenticated buyer.
 *   - ProductFile must belong to entitled Product.
 *   - Download records and audit logs are recorded in PostgreSQL.
 *   - Never exposes storageKey, private file paths, or credentials.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.user) {
      return apiError(
        auth.error?.code || "UNAUTHORIZED",
        auth.error?.message || "Authentication is required",
        auth.status || 401
      );
    }

    const { productFileId } = params;
    if (!productFileId || productFileId.trim() === "") {
      return apiError("VALIDATION_FAILED", "Product file ID is required", 400);
    }

    // Extract IP address and User Agent for audit logging
    const forwarded = req.headers.get("x-forwarded-for");
    const ipAddress = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || null;
    const userAgent = req.headers.get("user-agent") || null;

    const result = await authorizeProductFileDownload({
      userId: auth.user.id,
      productFileId,
      ipAddress,
      userAgent,
    });

    if (!result.success) {
      return apiError(
        result.code || "DOWNLOAD_UNAUTHORIZED",
        result.error || "Failed to authorize download",
        result.status || 403
      );
    }

    return apiSuccess(result.data, "Download URL generated successfully", 200);
  } catch (error) {
    console.error("[BUYER_DOWNLOAD_URL_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while generating download authorization",
      500
    );
  }
}

/**
 * GET alias for consumer flexibility
 */
export async function GET(req: NextRequest, routeParams: RouteParams) {
  return POST(req, routeParams);
}
