import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getBuyerOrders } from "@/lib/services/buyer-dashboard";
import { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/buyer/orders
 *
 * Retrieves the authenticated buyer's order history with pagination and status filter.
 */
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const statusParam = searchParams.get("status");

    let status: OrderStatus | undefined;
    if (statusParam && Object.values(OrderStatus).includes(statusParam as OrderStatus)) {
      status = statusParam as OrderStatus;
    }

    const result = await getBuyerOrders(auth.user.id, {
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 10 : limit,
      status,
    });

    return apiSuccess(result, "Buyer orders retrieved successfully", 200);
  } catch (error) {
    console.error("[BUYER_ORDERS_GET_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve buyer orders",
      500
    );
  }
}
