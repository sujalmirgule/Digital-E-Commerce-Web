import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { updateReviewSchema } from "@/lib/validations/review";
import { updateProductReview, deleteProductReview } from "@/lib/services/review";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * PATCH /api/v1/reviews/[id]
 *
 * Update a specific review by review ID.
 * IDOR guarded: only the author or ADMIN can edit.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.user) {
      return apiError(
        auth.error?.code || "UNAUTHORIZED",
        auth.error?.message || "Authentication is required",
        auth.status || 401
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
      reviewId: params.id,
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
    console.error("[DIRECT_REVIEW_UPDATE_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to update review",
      500
    );
  }
}

export const PUT = PATCH;

/**
 * DELETE /api/v1/reviews/[id]
 *
 * Delete a specific review by review ID.
 * IDOR guarded: only the author or ADMIN can delete.
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

    const result = await deleteProductReview({
      reviewId: params.id,
      userId: auth.user.id,
      isAdmin: auth.user.role === "ADMIN",
    });

    if (!result.success) {
      return apiError(
        result.code || "DELETE_FAILED",
        result.error || "Failed to delete review",
        result.status || 400
      );
    }

    return apiSuccess(
      {
        deleted: true,
        aggregates: result.aggregates,
      },
      "Review deleted successfully",
      200
    );
  } catch (error) {
    console.error("[DIRECT_REVIEW_DELETE_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to delete review",
      500
    );
  }
}
