import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { processOrderRefund } from "@/lib/services/order-lifecycle";
import { adminRefundSchema } from "@/lib/validations/refund";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/v1/admin/orders/[id]/refund
 *
 * Executes authoritative Razorpay Refund API call, marks order REFUNDED,
 * revokes digital download tokens & entitlements, and reverses creator ledger & balances.
 * Protected: requires ADMIN role.
 *
 * Security:
 *  - Server strictly determines all amounts and identities.
 *  - No client-supplied amounts or balance values accepted.
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
        "Administrative privileges are required to process refunds",
        403
      );
    }

    const { id: orderId } = params;
    if (!orderId) {
      return apiError("INVALID_ORDER_ID", "Order ID is required", 400);
    }

    let bodyData: any = {};
    try {
      const rawText = await req.text();
      if (rawText.trim()) {
        bodyData = JSON.parse(rawText);
      }
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON payload", 400);
    }

    const parseResult = adminRefundSchema.safeParse(bodyData);
    if (!parseResult.success) {
      return apiError(
        "VALIDATION_FAILED",
        "Invalid refund payload",
        400,
        parseResult.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }))
      );
    }

    const { reason, note } = parseResult.data;

    const result = await processOrderRefund({
      orderId,
      adminId: auth.user.id,
      reason: reason || "Admin manual refund",
      note,
    });

    if (!result.success || !result.data) {
      return apiError(
        result.code || "REFUND_FAILED",
        result.error || "Failed to process refund",
        result.status || 500
      );
    }

    return apiSuccess(
      result.data,
      result.data.idempotent
        ? "Order was already refunded (idempotent response)"
        : "Order refunded successfully",
      200
    );
  } catch (error) {
    console.error("[ADMIN_REFUND_ROUTE_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to process refund request",
      500
    );
  }
}
