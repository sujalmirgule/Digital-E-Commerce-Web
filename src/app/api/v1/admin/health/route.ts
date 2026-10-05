import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getSystemHealth } from "@/lib/services/admin-dashboard";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/health
 *
 * Checks database connectivity, response latency, and system operational metrics.
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
        "Administrative privileges are required to access system health",
        403
      );
    }

    const health = await getSystemHealth();

    return apiSuccess(health, "System health retrieved successfully", 200);
  } catch (error) {
    console.error("[ADMIN_HEALTH_GET_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to verify system health",
      500
    );
  }
}
