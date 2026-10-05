import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getPlatformOverview } from "@/lib/services/admin-dashboard";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/overview
 *
 * Central executive platform overview for administrators.
 * Returns authoritative metrics for users, sellers, products, orders,
 * gross volume, platform fee commissions, receipts, and recent audit activity.
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
        "Administrative privileges are required to access the platform overview",
        403
      );
    }

    const data = await getPlatformOverview();

    return apiSuccess(data, "Platform overview retrieved successfully", 200);
  } catch (error) {
    console.error("[ADMIN_OVERVIEW_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve platform overview",
      500
    );
  }
}
