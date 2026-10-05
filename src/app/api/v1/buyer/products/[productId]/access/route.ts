import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getActiveEntitlement } from "@/lib/services/entitlement";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    productId: string;
  };
}

/**
 * GET /api/v1/buyer/products/[productId]/access
 *
 * Checks authoritative product ownership and access for the authenticated buyer.
 *
 * Invariants:
 *   - Strictly queries PostgreSQL for active Entitlement (no client state trusted).
 *   - Does NOT return private file information or storage keys.
 *   - Zero data leakage.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
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

    const { productId } = params;
    if (!productId) {
      return apiError("VALIDATION_FAILED", "Product ID is required", 400);
    }

    const entitlement = await getActiveEntitlement(authUser.id, productId);

    if (!entitlement) {
      return apiSuccess(
        {
          hasAccess: false,
          productId,
        },
        "Product is not owned by the authenticated user",
        200
      );
    }

    return apiSuccess(
      {
        hasAccess: true,
        productId,
        entitlementId: entitlement.id,
        status: entitlement.status,
        grantedAt: entitlement.grantedAt,
      },
      "Product ownership confirmed",
      200
    );
  } catch (error) {
    console.error("[PRODUCT_ACCESS_CHECK_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while checking product access",
      500
    );
  }
}
