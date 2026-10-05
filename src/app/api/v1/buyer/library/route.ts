import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getBuyerLibrary } from "@/lib/services/entitlement";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/buyer/library
 *
 * Retrieves all digital assets purchased and owned by the authenticated buyer.
 *
 * Security & Invariants:
 *   - Requires valid JWT authentication (Bearer token).
 *   - Scoped strictly to the authenticated buyer (User.id from verified JWT).
 *   - Returns only products with ACTIVE entitlements.
 *   - Strictly out of scope: download URLs, signed presigned URLs, file storage keys.
 *   - Zero data leakage: no passwordHash, no seller KYC/bank details, no payment secrets.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.user) {
      return apiError(
        auth.error?.code || "UNAUTHORIZED",
        auth.error?.message || "Authentication is required",
        auth.status || 401
      );
    }
    const authUser = auth.user;

    const library = await getBuyerLibrary(authUser.id);

    return apiSuccess(library, "Buyer library retrieved successfully", 200);
  } catch (error) {
    console.error("[BUYER_LIBRARY_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while retrieving buyer library",
      500
    );
  }
}
