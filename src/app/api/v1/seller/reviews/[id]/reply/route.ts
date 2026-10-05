import { NextRequest } from "next/server";
import { getAuthenticatedSeller } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { replyToSellerReview } from "@/lib/services/seller-dashboard";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/v1/seller/reviews/[id]/reply
 *
 * Allows an approved seller to publish a public reply to a customer review
 * on one of their own products. Enforces strict IDOR protection.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const authSeller = await getAuthenticatedSeller(req);
    if (!authSeller) {
      const hasAuth = req.headers.get("authorization");
      if (!hasAuth) {
        return apiError("UNAUTHORIZED", "Authentication required to reply to reviews", 401);
      }
      return apiError(
        "FORBIDDEN",
        "Only approved sellers can reply to customer reviews",
        403
      );
    }

    const { id } = params;
    if (!id) {
      return apiError("INVALID_REVIEW_ID", "Review ID is required", 400);
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON body in request", 400);
    }

    const reply = body?.replyText ?? body?.reply;
    if (!reply || typeof reply !== "string" || reply.trim().length === 0) {
      return apiError("VALIDATION_FAILED", "Reply text cannot be empty", 400);
    }

    const result = await replyToSellerReview(authSeller.sellerProfileId, id, reply);
    if (!result.success || !result.review) {
      return apiError(
        result.code || "REPLY_FAILED",
        result.error || "Failed to submit review reply",
        result.status || 400
      );
    }

    return apiSuccess(result.review, "Seller reply posted successfully", 200);
  } catch (error) {
    console.error("[SELLER_REVIEW_REPLY_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to submit seller reply",
      500
    );
  }
}
