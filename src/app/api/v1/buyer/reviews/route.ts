import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getBuyerReviewsList } from "@/lib/services/buyer-dashboard";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/buyer/reviews
 *
 * Retrieves all reviews and ratings submitted by the authenticated buyer across purchased products.
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

    if (!auth.user.isActive) {
      return apiError(
        "ACCOUNT_SUSPENDED",
        "Your account is inactive. Please contact support.",
        403
      );
    }

    const reviews = await getBuyerReviewsList(auth.user.id);

    return apiSuccess(reviews, "Buyer reviews retrieved successfully", 200);
  } catch (error) {
    console.error("[BUYER_REVIEWS_LIST_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve buyer reviews",
      500
    );
  }
}
