import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { checkBuyerReviewEligibility } from "@/lib/services/review";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    slug?: string;
    productId?: string;
  };
}

/**
 * GET /api/v1/products/[slug]/reviews/eligibility
 *
 * Check if the authenticated buyer has purchased this product and is eligible to review.
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

    const productIdentifier = params.slug || params.productId || "";
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: productIdentifier }, { slug: productIdentifier }],
      },
      select: { id: true },
    });

    if (!product) {
      return apiError("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    const eligibility = await checkBuyerReviewEligibility(product.id, auth.user.id);

    return apiSuccess(
      eligibility,
      eligibility.eligible
        ? "Buyer is eligible to review this product"
        : eligibility.message || "Buyer is not eligible to review this product",
      200
    );
  } catch (error) {
    console.error("[REVIEW_ELIGIBILITY_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to check review eligibility",
      500
    );
  }
}
