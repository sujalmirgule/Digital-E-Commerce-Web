import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { rejectRefundRequest } from "@/lib/services/order-lifecycle";
import { rejectRefundSchema } from "@/lib/validations/refund";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/v1/admin/refunds/[id]/reject
 *
 * Rejects a buyer's pending refund request by ID, reverting the order status
 * from REFUND_REQUESTED back to PAID.
 * Protected: requires ADMIN role.
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

    if (auth.user.role !== "ADMIN") {
      return apiError(
        "FORBIDDEN",
        "Administrative privileges are required to reject refunds",
        403
      );
    }

    const { id: requestId } = params;
    if (!requestId) {
      return apiError("INVALID_REQUEST_ID", "Refund request ID is required", 400);
    }

    let bodyData: any = {};
    try {
      bodyData = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Invalid JSON payload in request body", 400);
    }

    const parseResult = rejectRefundSchema.safeParse(bodyData);
    if (!parseResult.success) {
      return apiError(
        "VALIDATION_FAILED",
        "Invalid rejection payload",
        400,
        parseResult.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }))
      );
    }

    const { adminNotes } = parseResult.data;

    const result = await rejectRefundRequest({
      requestId,
      adminId: auth.user.id,
      adminNotes,
    });

    if (!result.success || !result.data) {
      return apiError(
        result.code || "REJECTION_FAILED",
        result.error || "Failed to reject refund request",
        result.status || 500
      );
    }

    return apiSuccess(
      result.data,
      "Refund request rejected successfully",
      200
    );
  } catch (error) {
    console.error("[ADMIN_REFUND_REJECT_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to reject refund request",
      500
    );
  }
}
