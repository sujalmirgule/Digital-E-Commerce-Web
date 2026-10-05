import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getBuyerOrderDetail } from "@/lib/services/buyer-dashboard";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    orderId: string;
  };
}

/**
 * GET /api/v1/buyer/orders/[orderId]
 *
 * Retrieves detailed information for a specific order owned by the authenticated buyer.
 * Enforces strict IDOR protection.
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

    if (!auth.user.isActive) {
      return apiError(
        "ACCOUNT_SUSPENDED",
        "Your account is inactive. Please contact support.",
        403
      );
    }

    const { orderId } = params;
    if (!orderId || typeof orderId !== "string") {
      return apiError("INVALID_ORDER_ID", "Order ID is required", 400);
    }

    const isAdmin = auth.user.role === "ADMIN";
    const result = await getBuyerOrderDetail(auth.user.id, orderId, isAdmin);

    if (!result.success || !result.order) {
      return apiError(
        result.code || "ORDER_FETCH_FAILED",
        result.error || "Failed to retrieve order details",
        result.status || 404
      );
    }

    return apiSuccess(result.order, "Order details retrieved successfully", 200);
  } catch (error) {
    console.error("[BUYER_ORDER_DETAIL_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve order details",
      500
    );
  }
}
