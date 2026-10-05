import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAdminSellers } from "@/lib/services/admin-dashboard";
import { SellerStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/sellers
 *
 * Lists all seller profiles on the platform with status filtering and search.
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
        "Administrative privileges are required to access sellers register",
        403
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || searchParams.get("q") || undefined;
    const statusParam = searchParams.get("status") as SellerStatus | null;

    const validStatuses: SellerStatus[] = [
      "NOT_APPLIED",
      "PENDING",
      "APPROVED",
      "REJECTED",
      "SUSPENDED",
    ];
    const status =
      statusParam && validStatuses.includes(statusParam) ? statusParam : undefined;

    const data = await getAdminSellers({
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 20 : limit,
      status,
      search,
    });

    return apiSuccess(data, "Seller register retrieved successfully", 200);
  } catch (error) {
    console.error("[ADMIN_SELLERS_GET_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve sellers register",
      500
    );
  }
}
