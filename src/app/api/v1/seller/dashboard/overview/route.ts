import { NextRequest } from "next/server";
import { getAuthenticatedSeller } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getSellerOverview } from "@/lib/services/seller-dashboard";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/seller/dashboard/overview
 *
 * Provides authoritative overview metrics for an approved seller:
 * Product status breakdown, sales volume, gross/net revenue in integer paise,
 * pending & available balances, rating average, and recent orders.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedSeller(req);
    if (!auth) {
      const hasAuth = req.headers.get("authorization");
      if (!hasAuth) {
        return apiError("UNAUTHORIZED", "Authentication is required", 401);
      }
      return apiError(
        "FORBIDDEN",
        "Only approved sellers can access the seller dashboard. Your account must be approved.",
        403
      );
    }

    const overview = await getSellerOverview(auth.sellerProfileId);

    return apiSuccess(overview, "Seller dashboard overview retrieved successfully", 200);
  } catch (error) {
    console.error("[SELLER_DASHBOARD_OVERVIEW_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to load seller dashboard overview",
      500
    );
  }
}
