import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import {
  createReviewSchema,
  updateReviewSchema,
  publicReviewsQuerySchema,
} from "@/lib/validations/review";
import {
  createProductReview,
  updateProductReview,
  deleteProductReview,
  getPublicProductReviews,
} from "@/lib/services/review";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    slug?: string;
    productId?: string;
  };
}

/**
 * Helper to resolve productId (whether passed as cuid/id or slug).
 */
async function resolveProductId(param?: string): Promise<string | null> {
  if (!param) return null;
  const product = await prisma.product.findFirst({
    where: {
      OR: [{ id: param }, { slug: param }],
    },
    select: { id: true },
  });
  return product ? product.id : null;
}

/**
 * GET /api/v1/products/[slug]/reviews
 *
 * Public endpoint to retrieve product reviews, average rating, and rating distribution.
 * Open to public (no authentication required).
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const resolvedId = await resolveProductId(params.slug || params.productId);
    if (!resolvedId) {
      return apiError("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    const { searchParams } = new URL(req.url);
    const rawQuery = {
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "10",
      rating: searchParams.get("rating") || undefined,
      sort: searchParams.get("sort") || "recent",
    };

    const parsedQuery = publicReviewsQuerySchema.safeParse(rawQuery);
    if (!parsedQuery.success) {
      return apiError(
        "VALIDATION_FAILED",
        "Invalid query parameters",
        400,
        parsedQuery.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }))
      );
    }

    const result = await getPublicProductReviews(resolvedId, parsedQuery.data);

    return apiSuccess(result, "Reviews retrieved successfully", 200);
  } catch (error) {
    console.error("[PUBLIC_REVIEWS_GET_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve product reviews",
      500
    );
  }
}

/**
 * POST /api/v1/products/[productId]/reviews
 *
 * Submit a verified buyer review.
 *
 * Rules:
 *   - Authenticated user required.
 *   - Account must be active.
 *   - Buyer must own an active Entitlement or PAID order item for this product.
 *   - Duplicate review prevented (one review per product per buyer).
 *   - Validates integer rating (1..5) and safe text.
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

    if (!auth.user.isActive) {
      return apiError(
        "ACCOUNT_SUSPENDED",
        "Your account is inactive. You cannot submit reviews.",
        403
      );
    }

    const resolvedId = await resolveProductId(params.slug || params.productId);
    if (!resolvedId) {
      return apiError("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return apiError("VALIDATION_FAILED", "Invalid JSON format in request body", 400);
    }

    const parseResult = createReviewSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return apiError(
        "VALIDATION_FAILED",
        "Invalid review payload",
        400,
        parseResult.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }))
      );
    }

    const result = await createProductReview({
      productId: resolvedId,
      buyerId: auth.user.id,
      data: parseResult.data,
    });

    if (!result.success || !result.review) {
      return apiError(
        result.code || "REVIEW_CREATION_FAILED",
        result.error || "Failed to submit review",
        result.status || 400
      );
    }

    return apiSuccess(
      {
        review: {
          id: result.review.id,
          productId: result.review.productId,
          rating: result.review.rating,
          title: result.review.title,
          comment: result.review.comment,
          verifiedPurchase: true,
          createdAt: result.review.createdAt,
        },
        aggregates: result.aggregates,
      },
      "Review submitted successfully",
      201
    );
  } catch (error) {
    console.error("[CREATE_REVIEW_API_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to submit review",
      500
    );
  }
}

/**
 * PUT / PATCH /api/v1/products/[productId]/reviews
 *
 * Edit the authenticated buyer's existing review for this product.
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.user) {
      return apiError(
        auth.error?.code || "UNAUTHORIZED",
        auth.error?.message || "Authentication is required",
        auth.status || 401
      );
    }

    const resolvedId = await resolveProductId(params.slug || params.productId);
    if (!resolvedId) {
      return apiError("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    // Find the buyer's existing review for this product
    const existing = await prisma.review.findUnique({
      where: {
        productId_buyerId: {
          productId: resolvedId,
          buyerId: auth.user.id,
        },
      },
    });

    if (!existing) {
      return apiError(
        "REVIEW_NOT_FOUND",
        "You have not reviewed this product yet",
        404
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return apiError("VALIDATION_FAILED", "Invalid JSON format in request body", 400);
    }

    const parseResult = updateReviewSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return apiError(
        "VALIDATION_FAILED",
        "Invalid review update payload",
        400,
        parseResult.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }))
      );
    }

    const result = await updateProductReview({
      reviewId: existing.id,
      userId: auth.user.id,
      isAdmin: auth.user.role === "ADMIN",
      data: parseResult.data,
    });

    if (!result.success || !result.review) {
      return apiError(
        result.code || "UPDATE_FAILED",
        result.error || "Failed to update review",
        result.status || 400
      );
    }

    return apiSuccess(
      {
        review: result.review,
        aggregates: result.aggregates,
      },
      "Review updated successfully",
      200
    );
  } catch (error) {
    console.error("[UPDATE_REVIEW_API_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to update review",
      500
    );
  }
}

export const PATCH = PUT;

/**
 * DELETE /api/v1/products/[productId]/reviews
 *
 * Delete the authenticated buyer's review for this product.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.user) {
      return apiError(
        auth.error?.code || "UNAUTHORIZED",
        auth.error?.message || "Authentication is required",
        auth.status || 401
      );
    }

    const resolvedId = await resolveProductId(params.slug || params.productId);
    if (!resolvedId) {
      return apiError("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    const existing = await prisma.review.findUnique({
      where: {
        productId_buyerId: {
          productId: resolvedId,
          buyerId: auth.user.id,
        },
      },
    });

    if (!existing) {
      return apiError(
        "REVIEW_NOT_FOUND",
        "You do not have a review for this product to delete",
        404
      );
    }

    const result = await deleteProductReview({
      reviewId: existing.id,
      userId: auth.user.id,
      isAdmin: auth.user.role === "ADMIN",
    });

    return apiSuccess(
      {
        deleted: true,
        aggregates: result.aggregates,
      },
      "Review deleted successfully",
      200
    );
  } catch (error) {
    console.error("[DELETE_REVIEW_API_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to delete review",
      500
    );
  }
}
