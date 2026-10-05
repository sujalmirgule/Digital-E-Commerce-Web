import { NextRequest } from "next/server";
import { getAuthenticatedSeller } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getSellerReviews } from "@/lib/services/seller-dashboard";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/seller/reviews
 *
 * Retrieves reviews submitted by verified buyers on products owned by the authenticated APPROVED seller.
 */
export async function GET(req: NextRequest) {
  try {
    const authSeller = await getAuthenticatedSeller(req);
    if (!authSeller) {
      const hasAuth = req.headers.get("authorization");
      if (!hasAuth) {
        return apiError("UNAUTHORIZED", "Authentication required to view reviews", 401);
      }
      return apiError(
        "FORBIDDEN",
        "Only approved sellers can view customer reviews",
        403
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const result = await getSellerReviews(authSeller.sellerProfileId, {
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 10 : limit,
    });

    return apiSuccess(result, "Seller reviews retrieved successfully", 200);
  } catch (error) {
    console.error("[SELLER_REVIEWS_GET_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve seller reviews",
      500
    );
  }
}
