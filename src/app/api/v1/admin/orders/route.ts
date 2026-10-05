import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAdminOrders } from "@/lib/services/admin-dashboard";
import { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/orders
 *
 * Lists all orders placed across the marketplace.
 * Displays order references, amounts, payment, and receipt relations safely.
 * Protected: requires ADMIN role.
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

    if (auth.user.role !== "ADMIN") {
      return apiError(
        "FORBIDDEN",
        "Administrative privileges are required to access orders register",
        403
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || searchParams.get("q") || undefined;
    const statusParam = searchParams.get("status");

    const validStatuses: string[] = [
      "PENDING",
      "PAYMENT_PROCESSING",
      "PAID",
      "FAILED",
      "CANCELLED",
      "REFUNDED",
      "PARTIALLY_REFUNDED",
    ];

    let status: OrderStatus | undefined = undefined;
    if (statusParam) {
      if (statusParam === "COMPLETED") {
        status = "PAID" as OrderStatus;
      } else if (validStatuses.includes(statusParam)) {
        status = statusParam as OrderStatus;
      } else {
        return apiSuccess(
          {
            orders: [],
            pagination: {
              page: isNaN(page) ? 1 : page,
              limit: isNaN(limit) ? 20 : limit,
              total: 0,
              totalPages: 0,
            },
          },
          "Orders register retrieved successfully",
          200
        );
      }
    }

    const data = await getAdminOrders({
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 20 : limit,
      status,
      search,
    });

    return apiSuccess(data, "Orders register retrieved successfully", 200);
  } catch (error) {
    console.error("[ADMIN_ORDERS_GET_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve orders register",
      500
    );
  }
}
