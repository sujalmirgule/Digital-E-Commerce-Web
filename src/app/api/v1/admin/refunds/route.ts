import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAdminRefunds } from "@/lib/services/order-lifecycle";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/refunds
 *
 * Lists all refund requests and processed refunds across the marketplace.
 * Displays financial amounts, order references, provider refund IDs, and customer information safely.
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
        "Administrative privileges are required to access refunds register",
        403
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || searchParams.get("q") || undefined;

    const data = await getAdminRefunds({
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 20 : limit,
      status,
      search,
    });

    return apiSuccess(data, "Refund requests retrieved successfully", 200);
  } catch (error) {
    console.error("[ADMIN_REFUNDS_GET_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve refunds register",
      500
    );
  }
}
