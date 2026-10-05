import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAdminOrderDetail } from "@/lib/services/admin-dashboard";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/v1/admin/orders/[id]
 *
 * Detailed order inspection endpoint for administrators.
 * Returns order breakdown, items, payment snapshot, and receipt references safely.
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

    if (auth.user.role !== "ADMIN") {
      return apiError(
        "FORBIDDEN",
        "Administrative privileges are required to inspect order details",
        403
      );
    }

    const { id } = params;
    if (!id) {
      return apiError("INVALID_ORDER_ID", "Order ID is required", 400);
    }

    const order = await getAdminOrderDetail(id);
    if (!order) {
      return apiError("ORDER_NOT_FOUND", "Order not found", 404);
    }

    return apiSuccess({ order, ...order }, "Order details retrieved successfully", 200);
  } catch (error) {
    console.error("[ADMIN_ORDER_DETAIL_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve order details",
      500
    );
  }
}
