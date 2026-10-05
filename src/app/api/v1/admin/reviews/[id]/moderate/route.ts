import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { adminModerationActionSchema } from "@/lib/validations/review";
import { moderateReview } from "@/lib/services/review";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * PATCH /api/v1/admin/reviews/[id]/moderate
 *
 * Perform administrative moderation action on a review: hide, restore, or delete.
 * Automatically recalculates product rating aggregates.
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

    if (auth.user.role !== "ADMIN") {
      return apiError(
        "FORBIDDEN",
        "Only platform administrators may moderate reviews",
        403
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return apiError("VALIDATION_FAILED", "Invalid JSON format in request body", 400);
    }

    const parseResult = adminModerationActionSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return apiError(
        "VALIDATION_FAILED",
        "Invalid moderation action payload",
        400,
        parseResult.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }))
      );
    }

    const result = await moderateReview({
      reviewId: params.id,
      action: parseResult.data.action,
    });

    if (!result.success) {
      return apiError(
        result.code || "MODERATION_FAILED",
        result.error || "Failed to moderate review",
        result.status || 400
      );
    }

    return apiSuccess(
      {
        action: result.action,
        reviewId: result.reviewId,
        aggregates: result.aggregates,
      },
      `Review successfully ${parseResult.data.action === "delete" ? "deleted" : parseResult.data.action === "hide" ? "hidden" : "restored"}`,
      200
    );
  } catch (error) {
    console.error("[ADMIN_REVIEW_MODERATION_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to moderate review",
      500
    );
  }
}

export const POST = PATCH;
