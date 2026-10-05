import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { cancelOrder } from "@/lib/services/order-lifecycle";
import { cancelOrderSchema } from "@/lib/validations/refund";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    orderId: string;
  };
}

/**
 * POST /api/v1/buyer/orders/[orderId]/cancel
 *
 * Allows a buyer (or admin) to cancel an unpaid order (PENDING or PAYMENT_PROCESSING).
 * Rejects cancellation if order is already PAID (requires refund), CANCELLED, or REFUNDED.
 * Strictly verifies ownership (IDOR safe).
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
        "Your account is inactive. Please contact support.",
        403
      );
    }

    const { orderId } = params;
    if (!orderId) {
      return apiError("INVALID_ORDER_ID", "Order ID is required", 400);
    }

    let reason: string | undefined;
    try {
      const rawText = await req.text();
      if (rawText.trim()) {
        const body = JSON.parse(rawText);
        const parsed = cancelOrderSchema.safeParse(body);
        if (parsed.success && parsed.data.reason) {
          reason = parsed.data.reason;
        }
      }
    } catch {
      // Optional body
    }

    const isAdmin = auth.user.role === "ADMIN";
    const result = await cancelOrder({
      orderId,
      userId: auth.user.id,
      isAdmin,
      reason,
    });

    if (!result.success || !result.data) {
      return apiError(
        result.code || "CANCELLATION_FAILED",
        result.error || "Failed to cancel order",
        result.status || 400
      );
    }

    return apiSuccess(
      result.data,
      result.data.idempotent
        ? "Order was already cancelled"
        : "Order cancelled successfully",
      200
    );
  } catch (error) {
    console.error("[BUYER_ORDER_CANCEL_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to cancel order",
      500
    );
  }
}
